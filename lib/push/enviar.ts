import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { enviarPush } from "@/lib/push/webpush";
import { SUPORTE } from "@/lib/plataforma";

export type Notificacao = { titulo: string; corpo: string; url: string; icone?: string | null; tag?: string };

function chaves() {
  const publica = process.env.VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return null;
  try {
    return { publica, privada: JSON.parse(privada) as JsonWebKey, contato: `mailto:${SUPORTE.email}` };
  } catch {
    return null;
  }
}

/** Envia para todas as inscrições do filtro; inscrição expirada (404/410) é apagada. Nunca lança. */
async function enviarPara(
  admin: SupabaseClient<Database>,
  filtro: { clienteId?: string; usuarioEmpresaIds?: string[] },
  n: Notificacao,
): Promise<void> {
  const k = chaves();
  if (!k) return;
  let q = admin.from("push_inscricoes").select("id, endpoint, p256dh, auth");
  if (filtro.clienteId) q = q.eq("cliente_id", filtro.clienteId);
  else if (filtro.usuarioEmpresaIds?.length) q = q.in("usuario_empresa_id", filtro.usuarioEmpresaIds);
  else return;
  const { data: inscricoes } = await q;

  await Promise.all(
    (inscricoes ?? []).map(async (i) => {
      try {
        const status = await enviarPush(i, n, k);
        if (status === 404 || status === 410) await admin.from("push_inscricoes").delete().eq("id", i.id);
      } catch (err) {
        console.error("[push] falha ao enviar", err);
      }
    }),
  );
}

export async function notificarCliente(admin: SupabaseClient<Database>, clienteId: string, n: Notificacao) {
  await enviarPara(admin, { clienteId }, n);
}

/**
 * Avisa a equipe sobre um atendimento: o profissional (se tiver login
 * vinculado) e o responsável/admins da barbearia.
 */
export async function notificarEquipe(admin: SupabaseClient<Database>, empresaId: string, funcionarioId: string | null, n: Notificacao) {
  const [{ data: gestores }, { data: funcionario }] = await Promise.all([
    admin.from("usuarios_empresa").select("id").eq("empresa_id", empresaId).eq("ativo", true).in("role", ["owner", "admin"]),
    funcionarioId ? admin.from("funcionarios").select("usuario_empresa_id").eq("id", funcionarioId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const ids = new Set((gestores ?? []).map((g) => g.id));
  if (funcionario?.usuario_empresa_id) ids.add(funcionario.usuario_empresa_id);
  await enviarPara(admin, { usuarioEmpresaIds: [...ids] }, n);
}
