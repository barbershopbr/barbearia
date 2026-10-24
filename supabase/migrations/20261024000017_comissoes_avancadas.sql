-- Comissões avançadas (ESCOPO.md §3): combinação fixo + %, regra por serviço
-- e profissional, comissão sobre produtos e desconto da taxa da maquininha.

alter table regras_comissao
  -- Somado ao percentual (ex.: 40% + R$ 5 por atendimento).
  add column fixo_adicional numeric(10, 2) not null default 0,
  -- % sobre produtos que o profissional vender no caixa.
  add column percentual_produto numeric(5, 2) not null default 0 check (percentual_produto between 0 and 100),
  -- Calcula sobre o valor já descontada a taxa da forma de pagamento.
  add column descontar_taxa boolean not null default false;

-- Exceção por serviço para um profissional (vale no lugar da regra geral).
create table regras_comissao_servico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  funcionario_id uuid not null references funcionarios (id) on delete cascade,
  servico_id uuid not null references servicos (id) on delete cascade,
  tipo text not null check (tipo in ('percentual', 'fixo')),
  valor numeric(10, 2) not null check (valor >= 0),
  created_at timestamptz not null default now(),
  unique (funcionario_id, servico_id)
);
alter table regras_comissao_servico enable row level security;
create policy regras_servico_staff on regras_comissao_servico for all to authenticated
  using (auth_staff_pode(empresa_id, 'comissoes', false))
  with check (auth_staff_pode(empresa_id, 'comissoes', true));

-- Taxas da maquininha/meio de pagamento (% por forma), definidas pelo dono.
alter table empresas add column taxas_pagamento jsonb not null default '{}'::jsonb;
grant update (taxas_pagamento) on empresas to authenticated;

-- Item de produto vendido no caixa pode ter quem vendeu (comissão sobre produto).
comment on column pagamento_itens.funcionario_id is 'Serviço: quem atendeu. Produto: quem vendeu (comissão sobre produto).';
