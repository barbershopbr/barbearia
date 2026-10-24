// Tipos manuais espelhando supabase/migrations/*.sql. Quando o projeto Supabase
// estiver criado e linkado, isso pode ser substituído por:
//   npx supabase gen types typescript --linked > lib/supabase/types.ts
//
// Importante: os tipos de linha usam `type` (não `interface`) porque o
// verificador de tipos do postgrest-js exige que cada Row/Insert/Update
// satisfaça `Record<string, unknown>` estruturalmente — interfaces não
// satisfazem essa checagem no TypeScript, só type aliases/objetos literais.

type Timestamps = {
  created_at: string;
};

export type EmpresaStatus = "ativo" | "inativo" | "bloqueado" | "excluida";
export type EmpresaDominioStatus = "pendente" | "verificado" | "falhou";
export type PlanoSaas = "basico" | "pro" | "premium";
export type UsuarioEmpresaRole = "owner" | "admin" | "barbeiro" | "recepcionista";
export type AgendamentoStatus = "agendado" | "confirmado" | "concluido" | "cancelado" | "falta";
export type PlanoPeriodo = "mensal" | "trimestral" | "anual";
export type AssinaturaStatus = "ativa" | "cancelada" | "inadimplente" | "pendente";
export type PagamentoTipo = "agendamento" | "assinatura" | "produto" | "balcao";
export type PagamentoMetodo = "pix" | "cartao" | "cartao_recorrente" | "na_retirada" | "dinheiro";
export type PagamentoStatus = "pendente" | "pago" | "falhou" | "estornado" | "cancelado";
export type ComissaoTipo = "servico" | "produto" | "assinatura" | "personalizada" | "diaria" | "mensal";
export type RegraComissaoTipo = "percentual" | "fixo_por_servico" | "diaria" | "mensal";
export type ComissaoPeriodo = "semanal" | "quinzenal" | "mensal";
export type GatewayProvider = "mercado_pago" | "asaas" | "stripe" | "pagarme" | "pagseguro";

export type Empresa = Timestamps & {
  id: string;
  slug: string;
  nome: string;
  status: EmpresaStatus;
  logo_url: string | null;
  banner_url: string | null;
  descricao: string | null;
  cores: Record<string, string>;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  telefone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  horarios: Record<string, unknown>;
  dominio_principal: string | null;
  dominio_secundario: string | null;
  dominio_status: EmpresaDominioStatus;
  dominio_cloudflare_id: string | null;
  favicon_url: string | null;
  cnpj: string | null;
  plano_saas: PlanoSaas;
  recursos_extras: Record<string, boolean>;
  site_config: Record<string, unknown>;
  pagamentos_config: Record<string, unknown>;
  pote_config: Record<string, unknown>;
  taxas_pagamento: Record<string, number>;
  saas_dia_vencimento: number;
  bloqueio_motivo: "inadimplencia" | "manual" | null;
  saas_isento_ate: string | null;
  updated_at: string;
};

export type UsuarioEmpresa = Timestamps & {
  id: string;
  empresa_id: string;
  auth_user_id: string;
  nome: string;
  email: string;
  role: UsuarioEmpresaRole;
  permissions: Record<string, unknown>;
  tutorial_visto_em: string | null;
  ativo: boolean;
};

export type Cliente = Timestamps & {
  id: string;
  empresa_id: string;
  auth_user_id: string;
  email: string;
  nome: string;
  telefone: string | null;
};

export type MasterAdmin = Timestamps & {
  id: string;
  auth_user_id: string;
  nome: string;
  role: string;
};

export type Servico = Timestamps & {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao_minutos: number;
  ativo: boolean;
};

export type Funcionario = Timestamps & {
  id: string;
  empresa_id: string;
  usuario_empresa_id: string | null;
  nome: string;
  foto_url: string | null;
  bio: string | null;
  especialidades: string[];
  ativo: boolean;
};

export type Agendamento = Timestamps & {
  id: string;
  empresa_id: string;
  cliente_id: string;
  funcionario_id: string;
  servico_id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: AgendamentoStatus;
  observacoes: string | null;
  cupom_id: string | null;
  desconto: number;
  /** Preenchido ao concluir se o cliente tinha assinatura ativa (entra no pote). */
  assinatura_id: string | null;
};

export type Categoria = Timestamps & {
  id: string;
  empresa_id: string;
  nome: string;
};

export type Produto = Timestamps & {
  id: string;
  empresa_id: string;
  categoria_id: string | null;
  nome: string;
  descricao: string | null;
  preco: number;
  custo: number;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  foto_url: string | null;
};

/** Linha da view produtos_publicos (vitrine do site; sem custo/estoque). */
export type ProdutoPublico = Pick<Produto, "id" | "empresa_id" | "categoria_id" | "nome" | "descricao" | "preco" | "ativo" | "created_at" | "foto_url"> & {
  categoria_nome: string | null;
  /** Tem estoque (a quantidade não é exposta ao público). */
  disponivel: boolean;
};

export type BloqueioAgenda = Timestamps & {
  id: string;
  empresa_id: string;
  /** null = barbearia inteira (feriado etc.). */
  funcionario_id: string | null;
  inicio: string;
  fim: string;
  motivo: string | null;
  criado_por: string | null;
};

export type Integracao = {
  id: string;
  /** null = conta do BarberControl (Master). */
  empresa_id: string | null;
  provedor: "bling";
  credenciais_cifradas: string;
  conta_nome: string | null;
  conectado_em: string;
  expira_em: string | null;
  refresh_expira_em: string | null;
  config: Record<string, unknown>;
  atualizado_em: string;
};

export type NotaFiscal = Timestamps & {
  id: string;
  empresa_id: string | null;
  empresa_cliente_id: string | null;
  pagamento_id: string | null;
  tipo: "nfse" | "nfe" | "nfce";
  provedor: string;
  provedor_nota_id: string | null;
  numero: string | null;
  valor: number;
  status: "pendente" | "emitida" | "erro" | "cancelada";
  link_pdf: string | null;
  erro: string | null;
};

export type FaturaSaas = Timestamps & {
  id: string;
  empresa_id: string;
  competencia: string;
  plano: string;
  valor: number;
  vencimento: string;
  status: "aberta" | "paga" | "cancelada";
  pago_em: string | null;
  metodo: string | null;
  gateway_id: string | null;
  observacao: string | null;
};

export type MasterAcesso = Timestamps & { id: string; master_admin_id: string; empresa_id: string; motivo: string | null };

export type Avaliacao = Timestamps & {
  id: string;
  empresa_id: string;
  cliente_id: string;
  agendamento_id: string;
  funcionario_id: string | null;
  nota: number;
  comentario: string | null;
  resposta: string | null;
  publicada: boolean;
};

export type AvaliacaoPublica = Pick<Avaliacao, "id" | "empresa_id" | "funcionario_id" | "nota" | "comentario" | "resposta" | "created_at"> & {
  cliente_primeiro_nome: string;
  funcionario_nome: string | null;
};

export type ListaEspera = Timestamps & {
  id: string;
  empresa_id: string;
  cliente_id: string;
  servico_id: string;
  funcionario_id: string | null;
  data: string;
  status: "aguardando" | "avisado" | "agendou" | "cancelado";
  avisado_em: string | null;
};

export type GaleriaFoto = Timestamps & {
  id: string;
  empresa_id: string;
  url: string;
  legenda: string | null;
  ordem: number;
};

export type Promocao = Timestamps & {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  preco_de: number | null;
  preco_por: number | null;
  validade: string | null;
  ativo: boolean;
  ordem: number;
};

export type Fornecedor = Timestamps & {
  id: string;
  empresa_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cnpj: string | null;
};

export type EstoqueMovimentacao = Timestamps & {
  id: string;
  empresa_id: string;
  produto_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  motivo: string | null;
  referencia_agendamento_id: string | null;
  fornecedor_id: string | null;
};

export type Plano = Timestamps & {
  id: string;
  empresa_id: string;
  nome: string;
  valor: number;
  periodo: PlanoPeriodo;
  quantidade_cortes: number | null;
  beneficios: unknown[];
  ativo: boolean;
};

export type AssinaturaCliente = Timestamps & {
  id: string;
  empresa_id: string;
  cliente_id: string;
  plano_id: string;
  status: AssinaturaStatus;
  data_inicio: string;
  data_proxima_cobranca: string | null;
};

export type Pagamento = Timestamps & {
  id: string;
  empresa_id: string;
  /** null = venda de balcão sem cliente cadastrado. */
  cliente_id: string | null;
  caixa_id: string | null;
  tipo: PagamentoTipo;
  referencia_id: string | null;
  valor: number;
  metodo: PagamentoMetodo;
  status: PagamentoStatus;
  gateway: string | null;
  gateway_transacao_id: string | null;
  separado: boolean;
  retirado_em: string | null;
  /** Quando o dinheiro entrou (base do financeiro e do pote). */
  pago_em: string | null;
  cupom_id: string | null;
  desconto: number;
};

export type PagamentoItem = Timestamps & {
  id: string;
  pagamento_id: string;
  produto_id: string | null;
  servico_id: string | null;
  funcionario_id: string | null;
  /** Atendimento da agenda cobrado no caixa (no máximo uma vez). */
  agendamento_id: string | null;
  descricao: string | null;
  quantidade: number;
  preco_unitario: number;
};

export type Caixa = {
  id: string;
  empresa_id: string;
  aberto_por: string | null;
  aberto_em: string;
  valor_inicial: number;
  fechado_por: string | null;
  fechado_em: string | null;
  valor_contado: number | null;
  observacao: string | null;
};

export type CaixaMovimento = Timestamps & {
  id: string;
  caixa_id: string;
  empresa_id: string;
  tipo: "sangria" | "suprimento";
  valor: number;
  motivo: string | null;
  criado_por: string | null;
};

export type Comissao = Timestamps & {
  id: string;
  empresa_id: string;
  usuario_empresa_id: string | null;
  funcionario_id: string | null;
  agendamento_id: string | null;
  tipo: ComissaoTipo;
  valor: number | null;
  percentual: number | null;
  periodo_pagamento: ComissaoPeriodo;
  status: "pendente" | "pago";
  pote_fechamento_id: string | null;
};

export type PoteFechamento = Timestamps & {
  id: string;
  empresa_id: string;
  competencia: string;
  receita: number;
  parte_casa: number;
  pote: number;
  total_pontos: number;
  distribuido: number;
  sobra: number;
  sobra_destino: "casa" | "dividir" | "acumular";
  detalhes: Record<string, unknown>;
  fechado_por: string | null;
};

export type RegraComissao = Timestamps & {
  id: string;
  empresa_id: string;
  funcionario_id: string;
  tipo: RegraComissaoTipo;
  valor: number;
  ativo: boolean;
  fixo_adicional: number;
  percentual_produto: number;
  descontar_taxa: boolean;
};

export type RegraComissaoServico = Timestamps & {
  id: string;
  empresa_id: string;
  funcionario_id: string;
  servico_id: string;
  tipo: "percentual" | "fixo";
  valor: number;
};

export type Despesa = Timestamps & {
  id: string;
  empresa_id: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  data: string;
};

export type Cupom = Timestamps & {
  id: string;
  empresa_id: string;
  codigo: string;
  tipo_desconto: "percentual" | "valor_fixo";
  valor: number;
  validade: string | null;
  usos_maximos: number | null;
  ativo: boolean;
};

export type FidelidadePonto = Timestamps & {
  id: string;
  empresa_id: string;
  cliente_id: string;
  pontos: number;
  tipo: "credito" | "debito";
  motivo: string | null;
  referencia_tipo: "agendamento" | "pedido" | "manual" | "resgate" | null;
  referencia_id: string | null;
};

export type FidelidadeConfig = {
  empresa_id: string;
  ativo: boolean;
  pontos_por_atendimento: number;
  pontos_por_real_produto: number;
  reais_por_ponto: number;
  updated_at: string;
};

export type CupomUso = Timestamps & {
  id: string;
  empresa_id: string;
  cupom_id: string;
  cliente_id: string;
  referencia_tipo: "agendamento" | "pedido";
  referencia_id: string | null;
  valor_desconto: number;
};

export type ConfiguracaoGateway = Timestamps & {
  id: string;
  empresa_id: string;
  gateway: GatewayProvider;
  credenciais: Record<string, unknown>;
  ativo: boolean;
  credenciais_cifradas: string | null;
  conta_id: string | null;
  conta_nome: string | null;
  conectado_em: string | null;
  expira_em: string | null;
  atualizado_em: string;
};

export type ClientePasswordResetToken = Timestamps & {
  id: string;
  cliente_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
};

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row>;
  // supabase-js exige este campo para resolver corretamente até selects sem
  // nenhum embed; como o schema é hand-rolled (não gerado), não modelamos as
  // relações de FK aqui — por isso os poucos selects com embed (ex.:
  // "servicos(nome)") são tipados manualmente com `as unknown as` no ponto de uso.
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      empresas: TableDef<Empresa>;
      usuarios_empresa: TableDef<UsuarioEmpresa>;
      clientes: TableDef<Cliente>;
      master_admins: TableDef<MasterAdmin>;
      servicos: TableDef<Servico>;
      funcionarios: TableDef<Funcionario>;
      agendamentos: TableDef<Agendamento>;
      categorias: TableDef<Categoria>;
      produtos: TableDef<Produto>;
      fornecedores: TableDef<Fornecedor>;
      estoque_movimentacoes: TableDef<EstoqueMovimentacao>;
      planos: TableDef<Plano>;
      assinaturas_clientes: TableDef<AssinaturaCliente>;
      pagamentos: TableDef<Pagamento>;
      comissoes: TableDef<Comissao>;
      cupons: TableDef<Cupom>;
      fidelidade_pontos: TableDef<FidelidadePonto>;
      configuracoes_gateway: TableDef<ConfiguracaoGateway>;
      cliente_password_reset_tokens: TableDef<ClientePasswordResetToken>;
      regras_comissao: TableDef<RegraComissao>;
      despesas: TableDef<Despesa>;
      pagamento_itens: TableDef<PagamentoItem>;
      cupom_usos: TableDef<CupomUso>;
      fidelidade_config: TableDef<FidelidadeConfig>;
      galeria_fotos: TableDef<GaleriaFoto>;
      bloqueios_agenda: TableDef<BloqueioAgenda>;
      integracoes: TableDef<Integracao>;
      notas_fiscais: TableDef<NotaFiscal>;
      pote_fechamentos: TableDef<PoteFechamento>;
      caixas: TableDef<Caixa>;
      regras_comissao_servico: TableDef<RegraComissaoServico>;
      avaliacoes: TableDef<Avaliacao>;
      lista_espera: TableDef<ListaEspera>;
      faturas_saas: TableDef<FaturaSaas>;
      master_acessos: TableDef<MasterAcesso>;
      caixa_movimentos: TableDef<CaixaMovimento>;
      promocoes: TableDef<Promocao>;
    };
    Views: {
      produtos_publicos: { Row: ProdutoPublico; Relationships: [] };
      avaliacoes_publicas: { Row: AvaliacaoPublica; Relationships: [] };
    };
    Functions: {
      auth_empresa_ids: { Args: Record<string, never>; Returns: string[] };
      auth_is_staff_of: { Args: { target_empresa_id: string }; Returns: boolean };
      auth_is_owner_or_admin_of: { Args: { target_empresa_id: string }; Returns: boolean };
      auth_is_master_admin: { Args: Record<string, never>; Returns: boolean };
      rotina_cobranca_saas: { Args: { p_hoje?: string }; Returns: { geradas: number; bloqueadas: number; desbloqueadas: number } };
      horarios_ocupados: {
        Args: { p_empresa: string; p_funcionario: string; p_inicio: string; p_fim: string };
        Returns: { data_hora_inicio: string; data_hora_fim: string }[];
      };
      validar_cupom: {
        Args: { p_empresa_id: string; p_codigo: string };
        Returns: { id: string | null; tipo_desconto: string | null; valor: number | null; motivo: string | null }[];
      };
    };
  };
};
