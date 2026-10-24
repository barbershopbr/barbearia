-- ============================================================================
-- Schema base do SaaS Multi-Tenant de Barbearias.
-- Toda tabela de negócio carrega empresa_id (tenant) — ver 20260727000003_rls_policies.sql
-- para o isolamento entre empresas.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------
create table empresas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'bloqueado')),
  logo_url text,
  banner_url text,
  descricao text,
  cores jsonb not null default '{}'::jsonb,
  endereco text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  telefone text,
  whatsapp text,
  instagram text,
  horarios jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table empresas is 'Tenant. slug vira o subdomínio ({slug}.usebrcontrol.com.br); dominio_principal/dominio_secundario (migration de domínios custom) substituem o subdomínio quando configurados.';

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger empresas_set_updated_at
  before update on empresas
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Identidade / autenticação
-- ---------------------------------------------------------------------------

-- Funcionários/admins da barbearia (login real, e-mail único global via auth.users).
create table usuarios_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'barbeiro', 'recepcionista')),
  permissions jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (empresa_id, auth_user_id)
);

-- Clientes finais. Cadastro 100% independente por empresa: o mesmo e-mail pode
-- se cadastrar em barbearias diferentes porque a autenticação usa um e-mail
-- sintético interno (ver lib/auth/cliente-identity.ts) — auth_user_id nunca é
-- reaproveitado entre empresas.
create table clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  nome text not null,
  telefone text,
  created_at timestamptz not null default now(),
  unique (empresa_id, email),
  unique (empresa_id, auth_user_id)
);

-- Admins do próprio SaaS. Nunca recebe empresa_id, nunca exposto a anon/authenticated (ver RLS).
create table master_admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  nome text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catálogo / equipe / agenda (módulos de prova desta fase)
-- ---------------------------------------------------------------------------
create table servicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(10, 2) not null default 0,
  duracao_minutos integer not null default 30,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Perfil público do barbeiro (foto, bio, especialidades) — separado da conta de
-- login em usuarios_empresa porque nem todo funcionário exibido no site precisa
-- necessariamente ter acesso ao painel (e vice-versa).
create table funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  usuario_empresa_id uuid references usuarios_empresa (id) on delete set null,
  nome text not null,
  foto_url text,
  bio text,
  especialidades text[] not null default '{}',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  funcionario_id uuid not null references funcionarios (id) on delete restrict,
  servico_id uuid not null references servicos (id) on delete restrict,
  data_hora_inicio timestamptz not null,
  data_hora_fim timestamptz not null,
  status text not null default 'agendado'
    check (status in ('agendado', 'confirmado', 'concluido', 'cancelado', 'falta')),
  observacoes text,
  created_at timestamptz not null default now(),
  constraint horario_valido check (data_hora_fim > data_hora_inicio)
);

-- ---------------------------------------------------------------------------
-- Fases futuras — schema criado agora para não retrofitar isolamento depois,
-- sem UI/API nesta etapa.
-- ---------------------------------------------------------------------------
create table categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  categoria_id uuid references categorias (id) on delete set null,
  nome text not null,
  descricao text,
  preco numeric(10, 2) not null default 0,
  custo numeric(10, 2) not null default 0,
  estoque_atual integer not null default 0,
  estoque_minimo integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  cnpj text,
  created_at timestamptz not null default now()
);

create table estoque_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null check (quantidade > 0),
  motivo text,
  referencia_agendamento_id uuid references agendamentos (id) on delete set null,
  created_at timestamptz not null default now()
);

create table planos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  valor numeric(10, 2) not null default 0,
  periodo text not null check (periodo in ('mensal', 'trimestral', 'anual')),
  quantidade_cortes integer,
  beneficios jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table assinaturas_clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  plano_id uuid not null references planos (id) on delete restrict,
  status text not null default 'pendente'
    check (status in ('ativa', 'cancelada', 'inadimplente', 'pendente')),
  data_inicio date not null default current_date,
  data_proxima_cobranca date,
  created_at timestamptz not null default now()
);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  tipo text not null check (tipo in ('agendamento', 'assinatura', 'produto')),
  referencia_id uuid,
  valor numeric(10, 2) not null,
  metodo text not null check (metodo in ('pix', 'cartao', 'cartao_recorrente')),
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'falhou', 'estornado')),
  gateway text,
  gateway_transacao_id text,
  created_at timestamptz not null default now()
);

create table comissoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  usuario_empresa_id uuid not null references usuarios_empresa (id) on delete cascade,
  agendamento_id uuid references agendamentos (id) on delete set null,
  tipo text not null check (tipo in ('servico', 'produto', 'assinatura', 'personalizada')),
  valor numeric(10, 2),
  percentual numeric(5, 2),
  periodo_pagamento text not null check (periodo_pagamento in ('semanal', 'quinzenal', 'mensal')),
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  created_at timestamptz not null default now()
);

create table cupons (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  codigo text not null,
  tipo_desconto text not null check (tipo_desconto in ('percentual', 'valor_fixo')),
  valor numeric(10, 2) not null,
  validade date,
  usos_maximos integer,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create table fidelidade_pontos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  pontos integer not null,
  tipo text not null check (tipo in ('credito', 'debito')),
  motivo text,
  created_at timestamptz not null default now()
);

-- Credenciais do gateway de pagamento de CADA empresa (nunca do SaaS). O SaaS
-- não intermedia dinheiro: o cliente final paga diretamente na conta da
-- barbearia através dessas credenciais.
create table configuracoes_gateway (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references empresas (id) on delete cascade,
  gateway text not null check (gateway in ('mercado_pago', 'asaas', 'stripe', 'pagarme', 'pagseguro')),
  credenciais jsonb not null default '{}'::jsonb, -- TODO: criptografar em repouso antes de ir a produção
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices de apoio (toda tabela tenant-scoped é filtrada por empresa_id o tempo todo)
-- ---------------------------------------------------------------------------
create index on usuarios_empresa (empresa_id);
create index on usuarios_empresa (auth_user_id);
create index on clientes (empresa_id);
create index on clientes (auth_user_id);
create index on servicos (empresa_id);
create index on funcionarios (empresa_id);
create index on agendamentos (empresa_id);
create index on agendamentos (empresa_id, funcionario_id, data_hora_inicio);
create index on categorias (empresa_id);
create index on produtos (empresa_id);
create index on fornecedores (empresa_id);
create index on estoque_movimentacoes (empresa_id);
create index on planos (empresa_id);
create index on assinaturas_clientes (empresa_id);
create index on pagamentos (empresa_id);
create index on comissoes (empresa_id);
create index on cupons (empresa_id);
create index on fidelidade_pontos (empresa_id);
