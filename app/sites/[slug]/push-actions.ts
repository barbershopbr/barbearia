"use server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { getCurrentStaff } from "@/lib/auth/current-staff";

type Inscricao = { endpoint: string; p256dh: string; auth: string };

function valida(i: Inscricao): boolean {
  return /^https:\/\//.test(i.endpoint) && i.endpoint.length < 1000 && /^[A-Za-z0-9_-]{80,100}$/.test(i.p256dh) && /^[A-Za-z0-9_-]{16,30}$/.test(i.auth);
}

/**
 * Guarda a inscrição de push deste navegador para quem está logado — cliente
 * (site) ou equipe (painel). Um navegador por vez fica ligado a uma pessoa.
 */
export async function salvarInscricaoPush(slug: string, quem: "cliente" | "equipe", inscricao: Inscricao): Promise<{ error?: string }> {
  if (!valida(inscricao)) return { error: "Inscrição inválida." };
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Barbearia não encontrada." };

  const dono =
    quem === "cliente"
      ? { cliente_id: (await getCurrentCliente(empresa.id))?.id ?? null, usuario_empresa_id: null }
      : { cliente_id: null, usuario_empresa_id: (await getCurrentStaff(empresa.id))?.id ?? null };
  if (!dono.cliente_id && !dono.usuario_empresa_id) return { error: "Entre na sua conta para ativar as notificações." };

  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin
    .from("push_inscricoes")
    .upsert({ empresa_id: empresa.id, ...dono, endpoint: inscricao.endpoint, p256dh: inscricao.p256dh, auth: inscricao.auth }, { onConflict: "endpoint" });
  if (error) return { error: "Não foi possível ativar." };
  return {};
}

export async function removerInscricaoPush(endpoint: string): Promise<void> {
  if (!/^https:\/\//.test(endpoint)) return;
  const admin = createSupabaseServiceRoleClient();
  await admin.from("push_inscricoes").delete().eq("endpoint", endpoint);
}
