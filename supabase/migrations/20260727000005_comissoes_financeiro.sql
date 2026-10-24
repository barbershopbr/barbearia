-- ============================================================================
-- Completa o schema para Comissões, Financeiro e solicitação de assinatura
-- pelo próprio cliente.
-- ============================================================================

-- `comissoes` foi desenhada referenciando usuario_empresa_id (conta de login),
-- mas agendamentos referenciam funcionario_id (perfil público, que pode não
-- ter login — ex.: um barbeiro sem acesso ao painel). Passa a aceitar os dois,
-- com funcionario_id como referência primária pra gerar comissão automática.
alter table comissoes alter column usuario_empresa_id drop not null;
alter table comissoes add column funcionario_id uuid references funcionarios (id) on delete cascade;
create index on comissoes (funcionario_id);

-- Regras de comissão por funcionário (config), separado da "razão" (comissoes,
-- que registra o valor já gerado por atendimento/venda).
create table regras_comissao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  funcionario_id uuid not null references funcionarios (id) on delete cascade,
  tipo text not null check (tipo in ('percentual', 'fixo')),
  valor numeric(10, 2) not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (empresa_id, funcionario_id)
);

create index on regras_comissao (empresa_id);

alter table regras_comissao enable row level security;
create policy regras_comissao_staff on regras_comissao for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));

-- Despesas — lado que faltava pro financeiro/fluxo de caixa (receita já é
-- calculável a partir de agendamentos concluídos e assinaturas ativas).
create table despesas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  descricao text not null,
  categoria text,
  valor numeric(10, 2) not null,
  data date not null default current_date,
  created_at timestamptz not null default now()
);

create index on despesas (empresa_id);
create index on despesas (empresa_id, data);

alter table despesas enable row level security;
create policy despesas_staff on despesas for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));

-- Cliente pode solicitar um plano (fica pendente até a barbearia confirmar
-- manualmente ou, na Fase B, até o pagamento via gateway ser aprovado).
create policy assinaturas_clientes_insert_cliente on assinaturas_clientes
  for insert to authenticated
  with check (
    status = 'pendente'
    and cliente_id in (select id from clientes where auth_user_id = auth.uid())
  );
