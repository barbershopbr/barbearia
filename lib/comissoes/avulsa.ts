import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { comissaoProduto, comissaoServico, type Taxas } from "@/lib/comissoes/calculo";

/**
 * Comissão avulsa de um serviço prestado (atendimento concluído na agenda ou
 * serviço vendido no PDV). Regra geral do profissional + exceção por serviço
 * + taxa da forma de pagamento (cálculo em lib/comissoes/calculo.ts).
 * Recebe o client de service role (as regras não são visíveis ao barbeiro).
 */
export async function gerarComissaoServico(
  admin: SupabaseClient<Database>,
  params: {
    empresaId: string;
    funcionarioId: string;
    valorServico: number;
    servicoId?: string | null;
    agendamentoId?: string | null;
    metodo?: string | null;
  },
): Promise<void> {
  const [{ data: regra }, { data: excecao }, { data: empresa }] = await Promise.all([
    admin
      .from("regras_comissao")
      .select("tipo, valor, fixo_adicional, percentual_produto, descontar_taxa")
      .eq("funcionario_id", params.funcionarioId)
      .eq("ativo", true)
      .maybeSingle(),
    params.servicoId
      ? admin
          .from("regras_comissao_servico")
          .select("tipo, valor")
          .eq("funcionario_id", params.funcionarioId)
          .eq("servico_id", params.servicoId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("empresas").select("taxas_pagamento").eq("id", params.empresaId).maybeSingle(),
  ]);

  const calculo = comissaoServico({
    regra: regra ? { ...regra, valor: Number(regra.valor) } : null,
    excecao: excecao ? { tipo: excecao.tipo, valor: Number(excecao.valor) } : null,
    valorServico: params.valorServico,
    metodo: params.metodo,
    taxas: (empresa?.taxas_pagamento ?? {}) as Taxas,
  });
  if (!calculo) return;

  await admin.from("comissoes").insert({
    empresa_id: params.empresaId,
    funcionario_id: params.funcionarioId,
    agendamento_id: params.agendamentoId ?? null,
    tipo: "servico",
    valor: calculo.valor,
    percentual: calculo.percentual,
    periodo_pagamento: "mensal",
    status: "pendente",
  });
}

/** Comissão sobre produto vendido no caixa por um profissional (% da regra dele). */
export async function gerarComissaoProduto(
  admin: SupabaseClient<Database>,
  params: { empresaId: string; funcionarioId: string; valorVenda: number; metodo?: string | null },
): Promise<void> {
  const [{ data: regra }, { data: empresa }] = await Promise.all([
    admin
      .from("regras_comissao")
      .select("tipo, valor, percentual_produto, descontar_taxa")
      .eq("funcionario_id", params.funcionarioId)
      .eq("ativo", true)
      .maybeSingle(),
    admin.from("empresas").select("taxas_pagamento").eq("id", params.empresaId).maybeSingle(),
  ]);
  const valor = comissaoProduto({
    regra: regra ? { ...regra, valor: Number(regra.valor), percentual_produto: Number(regra.percentual_produto) } : null,
    valorVenda: params.valorVenda,
    metodo: params.metodo,
    taxas: (empresa?.taxas_pagamento ?? {}) as Taxas,
  });
  if (!valor) return;
  await admin.from("comissoes").insert({
    empresa_id: params.empresaId,
    funcionario_id: params.funcionarioId,
    tipo: "produto",
    valor,
    percentual: Number(regra?.percentual_produto ?? 0),
    periodo_pagamento: "mensal",
    status: "pendente",
  });
}
