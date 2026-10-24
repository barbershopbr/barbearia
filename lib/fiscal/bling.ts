import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { rootDomain } from "@/lib/tenant/domain";
import { cifrar, decifrar } from "@/lib/pagamentos/cripto";

/**
 * Integração com o Bling (API v3) para notas fiscais. O BarberControl tem UM
 * aplicativo no Bling (BLING_CLIENT_ID / BLING_CLIENT_SECRET); cada
 * barbearia — e o próprio BarberControl, no Master — autoriza esse
 * aplicativo na própria conta Bling (OAuth 2.0).
 *
 * No cadastro do aplicativo no Bling (Central de Extensões → Área do
 * Integrador), o link de redirecionamento deve ser:
 *   https://usebrcontrol.com.br/api/bling/callback
 * O Bling sempre usa esse link cadastrado. Credenciais do app vão em Basic
 * Auth (não no corpo); o código vale 1 minuto; o refresh token, 30 dias.
 */
const BASE = "https://www.bling.com.br/Api/v3";
const RENOVAR_ANTES_MS = 10 * 60_000;
const REFRESH_VALIDADE_MS = 30 * 86_400_000;

/** null = conta do BarberControl (Master). */
export type DonoIntegracao = string | null;

type TokensBling = { access_token: string; refresh_token: string; expires_in: number };

export function blingConfigurado(): boolean {
  return !!process.env.BLING_CLIENT_ID && !!process.env.BLING_CLIENT_SECRET;
}

export function urlRetornoBling(): string {
  const protocolo = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocolo}://${rootDomain()}/api/bling/callback`;
}

export function urlAutorizacaoBling(state: string): string {
  const params = new URLSearchParams({ response_type: "code", client_id: process.env.BLING_CLIENT_ID ?? "", state });
  return `${BASE}/oauth/authorize?${params}`;
}

async function pedirToken(corpo: Record<string, string>): Promise<TokensBling> {
  const basic = btoa(`${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`);
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
    },
    body: new URLSearchParams(corpo),
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Bling recusou a autorização (${res.status}). ${detalhe.slice(0, 200)}`);
  }
  return (await res.json()) as TokensBling;
}

function filtroDono<T extends { eq: (c: string, v: string) => T; is: (c: string, v: null) => T }>(q: T, dono: DonoIntegracao): T {
  return dono ? q.eq("empresa_id", dono) : q.is("empresa_id", null);
}

async function salvar(dono: DonoIntegracao, tokens: TokensBling, primeiraConexao: boolean) {
  const agora = Date.now();
  const admin = createSupabaseServiceRoleClient();
  const dados = {
    credenciais_cifradas: await cifrar({ access_token: tokens.access_token, refresh_token: tokens.refresh_token }),
    expira_em: new Date(agora + tokens.expires_in * 1000).toISOString(),
    refresh_expira_em: new Date(agora + REFRESH_VALIDADE_MS).toISOString(),
    atualizado_em: new Date(agora).toISOString(),
  };
  // Upsert manual: o índice único usa coalesce(empresa_id), que o upsert do PostgREST não enxerga.
  const { data: existente } = await filtroDono(admin.from("integracoes").select("id").eq("provedor", "bling"), dono).maybeSingle();
  const { error } = existente
    ? await admin
        .from("integracoes")
        .update(primeiraConexao ? { ...dados, conectado_em: new Date(agora).toISOString() } : dados)
        .eq("id", existente.id)
    : await admin.from("integracoes").insert({ ...dados, empresa_id: dono, provedor: "bling" });
  if (error) throw new Error("Não foi possível salvar a conexão com o Bling.");
}

export async function concluirConexaoBling(dono: DonoIntegracao, code: string): Promise<void> {
  await salvar(dono, await pedirToken({ grant_type: "authorization_code", code }), true);
}

export type StatusBling = { conectado: false } | { conectado: true; conectadoEm: string; config: Record<string, unknown>; precisaReconectar: boolean };

export async function statusBling(dono: DonoIntegracao): Promise<StatusBling> {
  const admin = createSupabaseServiceRoleClient();
  const { data } = await filtroDono(
    admin.from("integracoes").select("conectado_em, refresh_expira_em, config").eq("provedor", "bling"),
    dono,
  ).maybeSingle();
  if (!data) return { conectado: false };
  const precisaReconectar = !!data.refresh_expira_em && new Date(data.refresh_expira_em).getTime() < Date.now();
  return { conectado: true, conectadoEm: data.conectado_em, config: data.config, precisaReconectar };
}

/** Access token válido (renova pelo refresh token quando perto de expirar). null = não conectado/expirado. */
export async function accessTokenBling(dono: DonoIntegracao): Promise<string | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data } = await filtroDono(
    admin.from("integracoes").select("credenciais_cifradas, expira_em, refresh_expira_em").eq("provedor", "bling"),
    dono,
  ).maybeSingle();
  if (!data) return null;
  const cred = await decifrar<{ access_token: string; refresh_token: string }>(data.credenciais_cifradas);
  if (data.expira_em && new Date(data.expira_em).getTime() - Date.now() > RENOVAR_ANTES_MS) return cred.access_token;
  if (data.refresh_expira_em && new Date(data.refresh_expira_em).getTime() < Date.now()) return null;
  const novos = await pedirToken({ grant_type: "refresh_token", refresh_token: cred.refresh_token });
  await salvar(dono, novos, false);
  return novos.access_token;
}

export async function salvarConfigBling(dono: DonoIntegracao, config: Record<string, unknown>): Promise<void> {
  const admin = createSupabaseServiceRoleClient();
  await filtroDono(admin.from("integracoes").update({ config }).eq("provedor", "bling"), dono);
}

export async function desconectarBling(dono: DonoIntegracao): Promise<void> {
  const admin = createSupabaseServiceRoleClient();
  await filtroDono(admin.from("integracoes").delete().eq("provedor", "bling"), dono);
}
