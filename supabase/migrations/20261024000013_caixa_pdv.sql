-- Caixa / PDV no balcão: abrir/fechar caixa, vender serviço + produto,
-- sangria/suprimento e conferência do dinheiro no fechamento.

-- Venda de balcão pode não ter cliente cadastrado.
alter table pagamentos alter column cliente_id drop not null;
alter table pagamentos drop constraint pagamentos_tipo_check;
alter table pagamentos add constraint pagamentos_tipo_check
  check (tipo in ('agendamento', 'assinatura', 'produto', 'balcao'));

-- Itens de venda podem ser serviço (com profissional, para comissão) ou produto.
alter table pagamento_itens alter column produto_id drop not null;
alter table pagamento_itens
  add column servico_id uuid references servicos (id) on delete restrict,
  add column funcionario_id uuid references funcionarios (id) on delete set null,
  add column descricao text,
  add constraint pagamento_item_tem_produto_ou_servico check (produto_id is not null or servico_id is not null);

create table caixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  aberto_por uuid references usuarios_empresa (id) on delete set null,
  aberto_em timestamptz not null default now(),
  valor_inicial numeric(10, 2) not null default 0,
  fechado_por uuid references usuarios_empresa (id) on delete set null,
  fechado_em timestamptz,
  valor_contado numeric(10, 2),
  observacao text
);
-- Só um caixa aberto por barbearia.
create unique index caixas_um_aberto on caixas (empresa_id) where fechado_em is null;

create table caixa_movimentos (
  id uuid primary key default gen_random_uuid(),
  caixa_id uuid not null references caixas (id) on delete cascade,
  empresa_id uuid not null references empresas (id) on delete cascade,
  tipo text not null check (tipo in ('sangria', 'suprimento')),
  valor numeric(10, 2) not null check (valor > 0),
  motivo text,
  criado_por uuid references usuarios_empresa (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table pagamentos add column caixa_id uuid references caixas (id) on delete set null;
create index on pagamentos (caixa_id);

alter table caixas enable row level security;
alter table caixa_movimentos enable row level security;
create policy caixas_select on caixas for select to authenticated using (auth_staff_pode(empresa_id, 'caixa', false));
create policy caixas_write on caixas for all to authenticated
  using (auth_staff_pode(empresa_id, 'caixa', true)) with check (auth_staff_pode(empresa_id, 'caixa', true));
create policy caixa_mov_select on caixa_movimentos for select to authenticated using (auth_staff_pode(empresa_id, 'caixa', false));
create policy caixa_mov_write on caixa_movimentos for all to authenticated
  using (auth_staff_pode(empresa_id, 'caixa', true)) with check (auth_staff_pode(empresa_id, 'caixa', true));
