import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { SEM_EMAIL_SUFIXO } from "@/lib/auth/cliente-identity";
import { tenantOrigin } from "@/lib/tenant/domain";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email/send";

const UTC_MENOS_3 = 3 * 3_600_000;

/**
 * Abriu uma vaga (atendimento cancelado): avisa quem está na lista de espera
 * daquele dia — do mesmo profissional ou de "qualquer profissional". Todos
 * recebem o aviso ao mesmo tempo; quem agendar primeiro fica com a vaga.
 * Recebe o client de service role (a lista é de vários clientes).
 */
export async function avisarListaEspera(
  admin: SupabaseClient<Database>,
  vaga: { empresaId: string; funcionarioId: string; inicioUtc: string },
): Promise<number> {
  const dia = new Date(new Date(vaga.inicioUtc).getTime() - UTC_MENOS_3).toISOString().slice(0, 10);
  const { data: esperando } = (await admin
    .from("lista_espera")
    .select("id, servico_id, funcionario_id, clientes(nome, email), servicos(nome)")
    .eq("empresa_id", vaga.empresaId)
    .eq("data", dia)
    .eq("status", "aguardando")
    .or(`funcionario_id.is.null,funcionario_id.eq.${vaga.funcionarioId}`)) as unknown as {
    data: { id: string; servico_id: string; funcionario_id: string | null; clientes: { nome: string; email: string } | null; servicos: { nome: string } | null }[] | null;
  };
  if (!esperando?.length) return 0;

  const { data: empresa } = await admin.from("empresas").select("nome, slug").eq("id", vaga.empresaId).maybeSingle();
  if (!empresa) return 0;
  const diaBR = dia.split("-").reverse().join("/");

  for (const e of esperando) {
    const link = `${tenantOrigin(empresa.slug)}/agendar?servico=${e.servico_id}${e.funcionario_id ? `&barbeiro=${e.funcionario_id}` : ""}`;
    if (e.clientes && !e.clientes.email.endsWith(SEM_EMAIL_SUFIXO)) {
      await sendEmail({
        to: e.clientes.email,
        fromName: empresa.nome,
        subject: `Abriu um horário em ${diaBR} — ${empresa.nome}`,
        text: `Olá, ${e.clientes.nome}! Abriu uma vaga em ${diaBR} para ${e.servicos?.nome ?? "o serviço que você queria"}. Quem agendar primeiro fica com ela: ${link}`,
        html: emailLayout({
          titulo: "Abriu um horário!",
          corpo: `<p>Olá, ${escapeHtml(e.clientes.nome)}! Você pediu para ser avisado: abriu uma vaga em <strong>${diaBR}</strong> na ${escapeHtml(empresa.nome)}.</p><p>Quem agendar primeiro fica com o horário.</p>`,
          botao: { texto: "Agendar agora", url: link },
        }),
      });
    }
  }
  await admin
    .from("lista_espera")
    .update({ status: "avisado", avisado_em: new Date().toISOString() })
    .in(
      "id",
      esperando.map((e) => e.id),
    );
  return esperando.length;
}
