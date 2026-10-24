-- Notas fiscais via Bling.
-- - Barbearia → cliente: opcional, o dono conecta o PRÓPRIO Bling pelo
--   painel e escolhe o que emitir (serviços, assinaturas, produtos).
-- - BarberControl → barbearia: o Master conecta o Bling do BarberControl e
--   cada mensalidade paga gera nota (empresa_id null = BarberControl).
--
-- Mesmo padrão do Mercado Pago: OAuth, tokens cifrados (lib/pagamentos/cripto.ts),
-- tabela sem policies (só o servidor acessa).

create table integracoes (
  id uuid primary key default gen_random_uuid(),
  -- null = conta do próprio BarberControl (painel Master)
  empresa_id uuid references empresas (id) on delete cascade,
  provedor text not null check (provedor in ('bling')),
  credenciais_cifradas text not null,
  conta_nome text,
  conectado_em timestamptz not null default now(),
  expira_em timestamptz,
  refresh_expira_em timestamptz,
  config jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
-- Uma conexão por provedor por dono (inclui a do BarberControl, empresa_id null).
create unique index integracoes_dono_provedor
  on integracoes (coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), provedor);
alter table integracoes enable row level security;

create table notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  -- quem emitiu: barbearia, ou null = BarberControl
  empresa_id uuid references empresas (id) on delete cascade,
  -- nota do BarberControl: barbearia que pagou a mensalidade
  empresa_cliente_id uuid references empresas (id) on delete set null,
  pagamento_id uuid references pagamentos (id) on delete set null,
  tipo text not null check (tipo in ('nfse', 'nfe', 'nfce')),
  provedor text not null default 'bling',
  provedor_nota_id text,
  numero text,
  valor numeric(10, 2) not null,
  status text not null default 'pendente' check (status in ('pendente', 'emitida', 'erro', 'cancelada')),
  link_pdf text,
  erro text,
  created_at timestamptz not null default now()
);
create index on notas_fiscais (empresa_id, created_at desc);
create index on notas_fiscais (empresa_cliente_id, created_at desc);

alter table notas_fiscais enable row level security;
-- Equipe vê as notas emitidas pela própria barbearia e as do BarberControl
-- recebidas por ela (mensalidades). Escrita só pelo servidor.
create policy notas_select_staff on notas_fiscais for select to authenticated
  using (
    (empresa_id is not null and auth_staff_pode(empresa_id, 'notas-fiscais', false))
    or (empresa_cliente_id is not null and auth_is_owner_or_admin_of(empresa_cliente_id))
  );
