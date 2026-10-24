import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { rootDomain } from "@/lib/tenant/domain";
import { cifrar, decifrar } from "@/lib/pagamentos/cripto";

/**
 * Integração com o Mercado Pago no modelo "marketplace": o BarberControl tem
 * UMA aplicação (MP_CLIENT_ID / MP_CLIENT_SECRET) e cada barbearia autoriza
 * essa aplicação na PRÓPRIA conta pelo botão "Conectar Mercado Pago" (OAuth).
 * O dinheiro dos clientes cai direto na conta da barbearia; ninguém do
 * BarberControl digita senha ou chave da barbearia.
 *
 * A URL de retorno precisa estar cadastrada na aplicação do Mercado Pago:
 *   https://usebrcontrol.com.br/api/mercadopago/callback
 */
const API = "https://api.mercadopago.com";
const AUTH = "https://auth.mercadopago.com.br/authorization";
/** Renova o token quando faltar menos que isso para expirar (o MP dá ~180 dias). */
const RENOVAR_ANTES_MS = 15 * 86_400_000;

type TokensMP = {
  access_token: string;
  refresh_token: string;
  public_key?: string;
  user_id: number;
  expires_in: number;
  live_mode?: boolean;
};

type CredenciaisSalvas = { access_token: string; refresh_token: string; public_key?: string; live_mode?: boolean };

export function mercadoPagoConfigurado(): boolean {
  return !!process.env.MP_CLIENT_ID && !!process.env.MP_CLIENT_SECRET;
}

export function urlRetornoOAuth(): string {
  const protocolo = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocolo}://${rootDomain()}/api/mercadopago/callback`;
}

export function urlAutorizacao(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID ?? "",
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: urlRetornoOAuth(),
  });
  return `${AUTH}?${params}`;
}

async function pedirToken(corpo: Record<string, string>): Promise<TokensMP> {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      ...corpo,
    }),
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Mercado Pago recusou a autorização (${res.status}). ${detalhe.slice(0, 200)}`);
  }
  return (await res.json()) as TokensMP;
}

async function nomeDaConta(accessToken: string): Promise<string | null> {
  const res = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const u = (await res.json()) as { nickname?: string; email?: string; first_name?: string; last_name?: string };
  const nome = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return u.email ?? (nome || u.nickname || null);
}

async function salvar(empresaId: string, tokens: TokensMP, primeiraConexao: boolean) {
  const credenciais: CredenciaisSalvas = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    public_key: tokens.public_key,
    live_mode: tokens.live_mode,
  };
  const agora = new Date();
  const admin = createSupabaseServiceRoleClient();
  const dados = {
    empresa_id: empresaId,
    gateway: "mercado_pago" as const,
    credenciais: {},
    credenciais_cifradas: await cifrar(credenciais),
    conta_id: String(tokens.user_id),
    expira_em: new Date(agora.getTime() + tokens.expires_in * 1000).toISOString(),
    atualizado_em: agora.toISOString(),
    ativo: true,
    ...(primeiraConexao ? { conectado_em: agora.toISOString(), conta_nome: await nomeDaConta(tokens.access_token) } : {}),
  };
  const { error } = await admin.from("configuracoes_gateway").upsert(dados, { onConflict: "empresa_id" });
  if (error) throw new Error("Não foi possível salvar a conexão com o Mercado Pago.");
}

/** Callback do OAuth: troca o código pelos tokens e guarda cifrado. */
export async function concluirConexao(empresaId: string, code: string): Promise<void> {
  const tokens = await pedirToken({ grant_type: "authorization_code", code, redirect_uri: urlRetornoOAuth() });
  await salvar(empresaId, tokens, true);
}

export type StatusConexao =
  | { conectado: false }
  | { conectado: true; contaNome: string | null; contaId: string | null; conectadoEm: string | null; expiraEm: string | null };

export async function statusConexao(empresaId: string): Promise<StatusConexao> {
  const admin = createSupabaseServiceRoleClient();
  const { data } = await admin
    .from("configuracoes_gateway")
    .select("credenciais_cifradas, conta_nome, conta_id, conectado_em, expira_em, ativo")
    .eq("empresa_id", empresaId)
    .eq("gateway", "mercado_pago")
    .maybeSingle();
  if (!data?.credenciais_cifradas || !data.ativo) return { conectado: false };
  return { conectado: true, contaNome: data.conta_nome, contaId: data.conta_id, conectadoEm: data.conectado_em, expiraEm: data.expira_em };
}

/** Access token válido da barbearia (renova sozinho perto de expirar). null = não conectada. */
export async function accessTokenDaEmpresa(empresaId: string): Promise<string | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data } = await admin
    .from("configuracoes_gateway")
    .select("credenciais_cifradas, expira_em, ativo")
    .eq("empresa_id", empresaId)
    .eq("gateway", "mercado_pago")
    .maybeSingle();
  if (!data?.credenciais_cifradas || !data.ativo) return null;

  const cred = await decifrar<CredenciaisSalvas>(data.credenciais_cifradas);
  const expira = data.expira_em ? new Date(data.expira_em).getTime() : 0;
  if (expira - Date.now() > RENOVAR_ANTES_MS) return cred.access_token;

  const novos = await pedirToken({ grant_type: "refresh_token", refresh_token: cred.refresh_token });
  await salvar(empresaId, novos, false);
  return novos.access_token;
}

export async function desconectar(empresaId: string): Promise<void> {
  const admin = createSupabaseServiceRoleClient();
  await admin.from("configuracoes_gateway").delete().eq("empresa_id", empresaId).eq("gateway", "mercado_pago");
}
