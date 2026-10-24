-- Pote das assinaturas (ESCOPO.md §3): comissão dos barbeiros sobre
-- atendimentos de clientes assinantes.
--   pote do mês = mensalidades PAGAS no mês − parte da casa
--   cada atendimento de assinante concluído gera pontos (peso do serviço)
--   fechamento: valor do ponto = pote ÷ pontos; barbeiro recebe pontos × valor

-- Mensalidade registrada à mão no balcão (dinheiro/Pix/cartão na maquininha)
-- ou paga online depois. pago_em = quando entrou o dinheiro (base do pote).
alter table pagamentos drop constraint pagamentos_metodo_check;
alter table pagamentos add constraint pagamentos_metodo_check
  check (metodo in ('pix', 'cartao', 'cartao_recorrente', 'na_retirada', 'dinheiro'));
alter table pagamentos add column pago_em timestamptz;
update pagamentos set pago_em = coalesce(retirado_em, created_at) where status = 'pago' and pago_em is null;
create index on pagamentos (empresa_id, tipo, pago_em);

-- Atendimento de assinante: preenchido ao concluir quando o cliente tem
-- assinatura ativa. Esses atendimentos não geram comissão avulsa (entram no pote).
alter table agendamentos add column assinatura_id uuid references assinaturas_clientes (id) on delete set null;

-- Configuração do pote (lib/comissoes/pote.ts → lerConfigPote).
alter table empresas add column pote_config jsonb not null default '{}'::jsonb;
grant update (pote_config) on empresas to authenticated;

-- Fechamentos mensais (um por empresa e mês; o fechamento gera as comissões).
create table pote_fechamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  competencia date not null, -- primeiro dia do mês
  receita numeric(10, 2) not null,
  parte_casa numeric(10, 2) not null,
  pote numeric(10, 2) not null,
  total_pontos numeric(12, 2) not null,
  distribuido numeric(10, 2) not null,
  sobra numeric(10, 2) not null,
  sobra_destino text not null check (sobra_destino in ('casa', 'dividir', 'acumular')),
  detalhes jsonb not null default '{}'::jsonb,
  fechado_por uuid references usuarios_empresa (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (empresa_id, competencia)
);

alter table pote_fechamentos enable row level security;
create policy pote_fechamentos_select on pote_fechamentos for select to authenticated
  using (auth_staff_pode(empresa_id, 'pote', false));
-- Escrita só pelo servidor (fechamento gera comissões em lote).

alter table comissoes add column pote_fechamento_id uuid references pote_fechamentos (id) on delete cascade;
