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
export type PagamentoTipo = "agendamento" | "assinatura" | "produto";
export type PagamentoMetodo = "pix" | "cartao" | "cartao_recorrente";
export type PagamentoStatus = "pendente" | "pago" | "falhou" | "estornado";
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
export type ProdutoPublico = Pick<Produto, "id" | "empresa_id" | "categoria_id" | "nome" | "descricao" | "preco" | "ativo" | "created_at" | "foto_url">;

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
  cliente_id: string;
  tipo: PagamentoTipo;
  referencia_id: string | null;
  valor: number;
  metodo: PagamentoMetodo;
  status: PagamentoStatus;
  gateway: string | null;
  gateway_transacao_id: string | null;
  separado: boolean;
  cupom_id: string | null;
  desconto: number;
};

export type PagamentoItem = Timestamps & {
  id: string;
  pagamento_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
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
};

export type RegraComissao = Timestamps & {
  id: string;
  empresa_id: string;
  funcionario_id: string;
  tipo: RegraComissaoTipo;
  valor: number;
  ativo: boolean;
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
      promocoes: TableDef<Promocao>;
    };
    Views: {
      produtos_publicos: { Row: ProdutoPublico; Relationships: [] };
    };
    Functions: {
      auth_empresa_ids: { Args: Record<string, never>; Returns: string[] };
      auth_is_staff_of: { Args: { target_empresa_id: string }; Returns: boolean };
      auth_is_owner_or_admin_of: { Args: { target_empresa_id: string }; Returns: boolean };
      auth_is_master_admin: { Args: Record<string, never>; Returns: boolean };
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
