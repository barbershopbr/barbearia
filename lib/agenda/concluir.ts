import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { creditarPontosAgendamento } from "@/lib/fidelidade/creditar";
import { lerConfigPote } from "@/lib/comissoes/pote-calculo";
import { gerarComissaoServico } from "@/lib/comissoes/avulsa";

/**
 * O que acontece quando um atendimento é concluído (na agenda ou cobrado no
 * caixa): pontos de fidelidade e, conforme o caso, pote ou comissão avulsa.
 * Idempotente: pontos e comissão não duplicam se for chamado de novo.
 *
 * Recebe o client de service role: quem chama já conferiu a permissão sobre o
 * atendimento, e regras/configurações não são visíveis a todo mundo (RLS).
 */
export async function processarConclusao(
  admin: SupabaseClient<Database>,
  agendamento: { id: string; empresa_id: string; cliente_id: string; funcionario_id: string; servico_id: string },
  opcoes: { valorServico?: number; metodo?: string | null } = {},
): Promise<void> {
  await creditarPontosAgendamento(admin, {
    empresaId: agendamento.empresa_id,
    clienteId: agendamento.cliente_id,
    agendamentoId: agendamento.id,
  });

  // Cliente assinante + pote ligado: o atendimento entra no pote das
  // assinaturas (pontos) e NÃO gera comissão avulsa — senão o barbeiro
  // receberia duas vezes pelo mesmo atendimento.
  const [{ data: empresa }, { data: assinatura }] = await Promise.all([
    admin.from("empresas").select("pote_config").eq("id", agendamento.empresa_id).maybeSingle(),
    admin
      .from("assinaturas_clientes")
      .select("id")
      .eq("empresa_id", agendamento.empresa_id)
      .eq("cliente_id", agendamento.cliente_id)
      .eq("status", "ativa")
      .order("data_inicio", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (assinatura && lerConfigPote(empresa?.pote_config).ativo) {
    await admin.from("agendamentos").update({ assinatura_id: assinatura.id }).eq("id", agendamento.id);
    return;
  }

  // Comissão avulsa, uma por atendimento (alternar o status não duplica).
  const { data: jaExiste } = await admin.from("comissoes").select("id").eq("agendamento_id", agendamento.id).maybeSingle();
  if (jaExiste) return;

  let valorServico = opcoes.valorServico;
  if (valorServico === undefined) {
    const { data: servico } = await admin.from("servicos").select("preco").eq("id", agendamento.servico_id).maybeSingle();
    if (!servico) return;
    valorServico = Number(servico.preco);
  }
  await gerarComissaoServico(admin, {
    empresaId: agendamento.empresa_id,
    funcionarioId: agendamento.funcionario_id,
    valorServico,
    servicoId: agendamento.servico_id,
    agendamentoId: agendamento.id,
    metodo: opcoes.metodo,
  });
}
