/**
 * Valor da comissão avulsa — funções puras (sem banco), testáveis.
 *
 * Serviço: exceção por serviço do profissional (se houver) vale no lugar da
 * regra geral; regra "percentual" pode somar um fixo por atendimento.
 * Com "descontar taxa", a base é o valor menos a taxa da forma de pagamento.
 */
export type RegraBase = {
  tipo: "percentual" | "fixo_por_servico" | "diaria" | "mensal";
  valor: number;
  fixo_adicional?: number | null;
  percentual_produto?: number | null;
  descontar_taxa?: boolean | null;
};
export type ExcecaoServico = { tipo: "percentual" | "fixo"; valor: number };
export type Taxas = Partial<Record<"cartao" | "pix" | "dinheiro", number>>;

const centavos = (v: number) => Math.round(v * 100) / 100;

/** Valor recebido menos a taxa da forma de pagamento (sem forma conhecida, não desconta). */
export function baseComissao(valor: number, regra: Pick<RegraBase, "descontar_taxa"> | null, metodo: string | null | undefined, taxas: Taxas): number {
  if (!regra?.descontar_taxa || !metodo) return valor;
  const taxa = Number(taxas[metodo as keyof Taxas] ?? 0);
  return Number.isFinite(taxa) && taxa > 0 ? valor * (1 - taxa / 100) : valor;
}

/** Comissão de um serviço; null = não gera (sem regra aplicável, ou regra diária/mensal). */
export function comissaoServico(params: {
  regra: RegraBase | null;
  excecao: ExcecaoServico | null;
  valorServico: number;
  metodo?: string | null;
  taxas?: Taxas;
}): { valor: number; percentual: number | null } | null {
  const base = baseComissao(params.valorServico, params.regra, params.metodo, params.taxas ?? {});
  if (params.excecao) {
    return params.excecao.tipo === "percentual"
      ? { valor: centavos((base * params.excecao.valor) / 100), percentual: params.excecao.valor }
      : { valor: centavos(params.excecao.valor), percentual: null };
  }
  const r = params.regra;
  if (!r) return null;
  if (r.tipo === "percentual") {
    return { valor: centavos((base * r.valor) / 100 + Number(r.fixo_adicional ?? 0)), percentual: r.valor };
  }
  if (r.tipo === "fixo_por_servico") return { valor: centavos(r.valor), percentual: null };
  return null; // diária e mensal: o dono lança na tela de Comissões
}

/** Comissão sobre produto vendido pelo profissional; null = não gera. */
export function comissaoProduto(params: { regra: RegraBase | null; valorVenda: number; metodo?: string | null; taxas?: Taxas }): number | null {
  const pct = Number(params.regra?.percentual_produto ?? 0);
  if (!params.regra || !(pct > 0)) return null;
  return centavos((baseComissao(params.valorVenda, params.regra, params.metodo, params.taxas ?? {}) * pct) / 100);
}
