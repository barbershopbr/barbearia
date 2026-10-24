import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { empresaTemRecurso } from "@/lib/plano/recursos";

/**
 * Credita pontos de fidelidade por um agendamento concluído, quando a empresa
 * tem o programa ativo. O índice único parcial em
 * `fidelidade_pontos (referencia_tipo, referencia_id)` garante que alternar o
 * status do agendamento (concluído → outro → concluído) não duplica pontos —
 * o segundo insert falha silenciosamente e é ignorado aqui.
 */
export async function creditarPontosAgendamento(
  supabase: SupabaseClient<Database>,
  params: { empresaId: string; clienteId: string; agendamentoId: string },
) {
  if (!(await empresaTemRecurso(supabase, params.empresaId, "fidelidade"))) return;

  const { data: config } = await supabase
    .from("fidelidade_config")
    .select("ativo, pontos_por_atendimento")
    .eq("empresa_id", params.empresaId)
    .maybeSingle();

  if (!config?.ativo || config.pontos_por_atendimento <= 0) return;

  await supabase.from("fidelidade_pontos").insert({
    empresa_id: params.empresaId,
    cliente_id: params.clienteId,
    pontos: config.pontos_por_atendimento,
    tipo: "credito",
    motivo: "Atendimento concluído",
    referencia_tipo: "agendamento",
    referencia_id: params.agendamentoId,
  });
}

/** Credita pontos de fidelidade por um pedido de produtos separado/entregue. */
export async function creditarPontosPedido(
  supabase: SupabaseClient<Database>,
  params: { empresaId: string; clienteId: string; pedidoId: string; valor: number },
) {
  if (!(await empresaTemRecurso(supabase, params.empresaId, "fidelidade"))) return;

  const { data: config } = await supabase
    .from("fidelidade_config")
    .select("ativo, pontos_por_real_produto")
    .eq("empresa_id", params.empresaId)
    .maybeSingle();

  if (!config?.ativo || Number(config.pontos_por_real_produto) <= 0) return;

  const pontos = Math.floor(params.valor * Number(config.pontos_por_real_produto));
  if (pontos <= 0) return;

  await supabase.from("fidelidade_pontos").insert({
    empresa_id: params.empresaId,
    cliente_id: params.clienteId,
    pontos,
    tipo: "credito",
    motivo: "Compra de produtos",
    referencia_tipo: "pedido",
    referencia_id: params.pedidoId,
  });
}

/** Saldo de pontos (créditos − débitos) a partir da lista de lançamentos. */
export function calcularSaldo(
  lancamentos: { pontos: number; tipo: "credito" | "debito" }[],
): number {
  return lancamentos.reduce((s, l) => s + (l.tipo === "credito" ? l.pontos : -l.pontos), 0);
}
