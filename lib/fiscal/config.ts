/**
 * O que a barbearia quer que vire nota fiscal automaticamente (integracoes.config
 * da conexão Bling). Emitir é opcional e decisão do dono.
 */
export type ConfigFiscal = {
  emitirAutomatico: boolean;
  /** Atendimentos pagos pelo site (NFS-e). */
  servicos: boolean;
  /** Mensalidades de planos de assinatura (NFS-e). */
  assinaturas: boolean;
  /** Vendas da loja (NF-e/NFC-e — depende do cadastro fiscal dos produtos no Bling). */
  produtos: boolean;
};

export const CONFIG_FISCAL_PADRAO: ConfigFiscal = { emitirAutomatico: false, servicos: true, assinaturas: true, produtos: false };

export function lerConfigFiscal(raw: unknown): ConfigFiscal {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<ConfigFiscal>;
  const b = (v: unknown, p: boolean) => (typeof v === "boolean" ? v : p);
  return {
    emitirAutomatico: b(o.emitirAutomatico, CONFIG_FISCAL_PADRAO.emitirAutomatico),
    servicos: b(o.servicos, CONFIG_FISCAL_PADRAO.servicos),
    assinaturas: b(o.assinaturas, CONFIG_FISCAL_PADRAO.assinaturas),
    produtos: b(o.produtos, CONFIG_FISCAL_PADRAO.produtos),
  };
}

/** Passo a passo exibido no painel para o dono preparar o Bling antes de conectar. */
export const PASSO_A_PASSO_BLING = [
  "Crie uma conta no Bling (bling.com.br) com o CNPJ da barbearia — há plano gratuito para começar.",
  "No Bling, preencha os dados da empresa: CNPJ, inscrição municipal e regime tributário (MEI, Simples...).",
  "Em Preferências → Notas fiscais de serviço, configure a NFS-e da sua cidade (série, alíquota do ISS, código do serviço).",
  "Envie o certificado digital A1 da empresa no Bling, se a sua prefeitura exigir.",
  "Volte aqui e clique em \"Conectar Bling\". Entre na sua conta Bling e clique em \"Autorizar\".",
  "Escolha abaixo o que deve gerar nota automaticamente.",
];
