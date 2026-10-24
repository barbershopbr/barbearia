"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { RegraComissaoTipo } from "@/lib/supabase/types";
import { exigirRecurso } from "@/lib/plano/recursos";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";
import type { ActionState } from "../../../area-cliente/actions";

async function empresaComissoes(slug: string) {
  await exigirEdicao("comissoes");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) throw new Error("Empresa não encontrada.");
  exigirRecurso(empresa, "comissoes");
  return empresa;
}

const TIPOS: RegraComissaoTipo[] = ["percentual", "fixo_por_servico", "diaria", "mensal"];
const naoNegativo = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export type DadosRegra = {
  tipo: RegraComissaoTipo;
  valor: number;
  fixoAdicional: number;
  percentualProduto: number;
  descontarTaxa: boolean;
};

export async function salvarRegraComissao(slug: string, funcionarioId: string, dados: DadosRegra): Promise<{ error?: string }> {
  const empresa = await empresaComissoes(slug);
  if (!TIPOS.includes(dados.tipo)) return { error: "Tipo inválido." };
  if (dados.tipo === "percentual" && dados.valor > 100) return { error: "Percentual até 100." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("regras_comissao").upsert(
    {
      empresa_id: empresa.id,
      funcionario_id: funcionarioId,
      tipo: dados.tipo,
      valor: naoNegativo(dados.valor),
      fixo_adicional: dados.tipo === "percentual" ? naoNegativo(dados.fixoAdicional) : 0,
      percentual_produto: Math.min(naoNegativo(dados.percentualProduto), 100),
      descontar_taxa: !!dados.descontarTaxa,
      ativo: true,
    },
    { onConflict: "empresa_id,funcionario_id" },
  );
  if (error) return { error: "Não foi possível salvar a regra." };
  refresh();
  return {};
}

/** Exceções por serviço de um profissional: valor vazio remove a exceção. */
export async function salvarExcecoesServico(
  slug: string,
  funcionarioId: string,
  excecoes: { servicoId: string; tipo: "percentual" | "fixo"; valor: number | null }[],
): Promise<{ error?: string }> {
  const empresa = await empresaComissoes(slug);
  const supabase = await createSupabaseServerClient();

  const remover = excecoes.filter((e) => e.valor === null).map((e) => e.servicoId);
  const gravar = excecoes
    .filter((e) => e.valor !== null && (e.tipo === "percentual" || e.tipo === "fixo"))
    .map((e) => ({
      empresa_id: empresa.id,
      funcionario_id: funcionarioId,
      servico_id: e.servicoId,
      tipo: e.tipo,
      valor: e.tipo === "percentual" ? Math.min(naoNegativo(e.valor), 100) : naoNegativo(e.valor),
    }));

  if (remover.length) {
    await supabase.from("regras_comissao_servico").delete().eq("funcionario_id", funcionarioId).in("servico_id", remover);
  }
  if (gravar.length) {
    const { error } = await supabase.from("regras_comissao_servico").upsert(gravar, { onConflict: "funcionario_id,servico_id" });
    if (error) return { error: "Não foi possível salvar as exceções." };
  }
  refresh();
  return {};
}

export async function salvarTaxas(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresa = await empresaComissoes(slug);
  const pct = (k: string) => Math.min(naoNegativo(String(formData.get(k) ?? "").replace(",", ".")), 100);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("empresas")
    .update({ taxas_pagamento: { cartao: pct("cartao"), pix: pct("pix"), dinheiro: pct("dinheiro") } })
    .eq("id", empresa.id);
  if (error) return { error: "Não foi possível salvar." };
  refresh();
  return { success: "Taxas salvas." };
}

export async function marcarComissaoPaga(comissaoId: string) {
  await exigirEdicao("comissoes");
  const supabase = await createSupabaseServerClient();
  await supabase.from("comissoes").update({ status: "pago" }).eq("id", comissaoId);
  refresh();
}

/** Lançamento manual de comissão pra regras que não são por atendimento (diária/mensal) — o dono decide quando lançar. */
export async function lancarComissaoManual(slug: string, funcionarioId: string, tipo: "diaria" | "mensal", valor: number) {
  const empresa = await empresaComissoes(slug);
  const supabase = await createSupabaseServerClient();
  await supabase.from("comissoes").insert({
    empresa_id: empresa.id,
    funcionario_id: funcionarioId,
    tipo,
    valor,
    periodo_pagamento: tipo === "diaria" ? "semanal" : "mensal",
    status: "pendente",
  });
  refresh();
}
