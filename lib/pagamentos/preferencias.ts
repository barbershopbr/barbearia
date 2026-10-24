/**
 * Preferências de recebimento da barbearia (empresas.pagamentos_config).
 * Sempre ler via lerPreferencias(): o JSON salvo pode ser parcial.
 */
export type PreferenciasPagamento = {
  /** Aceitar Pix nos pagamentos online. */
  pix: boolean;
  /** Aceitar cartão de crédito nos pagamentos online. */
  cartao: boolean;
  /** Sinal/pagamento antecipado no agendamento pelo site. */
  sinal: { ativo: boolean; tipo: "percentual" | "valor"; valor: number };
  /** Loja: além de pagar na retirada, permitir pagar online. */
  lojaOnline: boolean;
  /** Assinaturas de clientes cobradas no cartão, todo mês, pelo Mercado Pago. */
  assinaturaRecorrente: boolean;
};

export const PREFERENCIAS_PADRAO: PreferenciasPagamento = {
  pix: true,
  cartao: true,
  sinal: { ativo: false, tipo: "percentual", valor: 30 },
  lojaOnline: true,
  assinaturaRecorrente: true,
};

export function lerPreferencias(raw: unknown): PreferenciasPagamento {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<PreferenciasPagamento>;
  const bool = (v: unknown, padrao: boolean) => (typeof v === "boolean" ? v : padrao);
  const sinal = (o.sinal ?? {}) as Partial<PreferenciasPagamento["sinal"]>;
  const tipo = sinal.tipo === "valor" ? "valor" : "percentual";
  const valorBruto = Number(sinal.valor);
  const valor = Number.isFinite(valorBruto) && valorBruto > 0 ? (tipo === "percentual" ? Math.min(valorBruto, 100) : valorBruto) : PREFERENCIAS_PADRAO.sinal.valor;
  return {
    pix: bool(o.pix, PREFERENCIAS_PADRAO.pix),
    cartao: bool(o.cartao, PREFERENCIAS_PADRAO.cartao),
    sinal: { ativo: bool(sinal.ativo, false), tipo, valor },
    lojaOnline: bool(o.lojaOnline, PREFERENCIAS_PADRAO.lojaOnline),
    assinaturaRecorrente: bool(o.assinaturaRecorrente, PREFERENCIAS_PADRAO.assinaturaRecorrente),
  };
}

/** Valor do sinal para um serviço, arredondado a centavos e nunca maior que o preço. */
export function valorDoSinal(pref: PreferenciasPagamento, precoServico: number): number {
  if (!pref.sinal.ativo || precoServico <= 0) return 0;
  const bruto = pref.sinal.tipo === "percentual" ? (precoServico * pref.sinal.valor) / 100 : pref.sinal.valor;
  return Math.min(Math.round(bruto * 100) / 100, precoServico);
}
