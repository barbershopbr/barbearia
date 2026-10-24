import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Comissão avulsa de um serviço prestado (atendimento concluído na agenda ou
 * serviço vendido no PDV), pela regra ativa do profissional. Diária e salário
 * mensal não são por atendimento — o dono lança na tela de Comissões.
 * Recebe o client de service role (as regras não são visíveis ao barbeiro).
 */
export async function gerarComissaoServico(
  admin: SupabaseClient<Database>,
  params: { empresaId: string; funcionarioId: string; valorServico: number; agendamentoId?: string | null },
): Promise<void> {
  const { data: regra } = await admin
    .from("regras_comissao")
    .select("tipo, valor")
    .eq("funcionario_id", params.funcionarioId)
    .eq("ativo", true)
    .maybeSingle();
  if (!regra || (regra.tipo !== "percentual" && regra.tipo !== "fixo_por_servico")) return;

  await admin.from("comissoes").insert({
    empresa_id: params.empresaId,
    funcionario_id: params.funcionarioId,
    agendamento_id: params.agendamentoId ?? null,
    tipo: "servico",
    valor: regra.tipo === "percentual" ? (params.valorServico * regra.valor) / 100 : regra.valor,
    percentual: regra.tipo === "percentual" ? regra.valor : null,
    periodo_pagamento: "mensal",
    status: "pendente",
  });
}
