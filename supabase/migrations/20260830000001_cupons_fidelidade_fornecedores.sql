-- ============================================================================
-- Cupons aplicáveis (agendamento + pedido de produto) com controle de uso,
-- programa de fidelidade (pontos) e vínculo de fornecedor nas movimentações
-- de estoque.
--
-- "Configurações da barbearia" (nome, logo, banner, cores, endereço, contato,
-- horários) NÃO precisa de schema novo — reaproveita as colunas de
-- personalização de `empresas` e os grants de update de "authenticated"
-- definidos em 20260727000003_rls_policies.sql / 20260803000001_dominios_custom.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Cupons: aplicação real + histórico de uso (para respeitar usos_maximos)
-- ---------------------------------------------------------------------------
alter table agendamentos
  add column cupom_id uuid references cupons (id) on delete set null,
  add column desconto numeric(10, 2) not null default 0;

alter table pagamentos
  add column cupom_id uuid references cupons (id) on delete set null,
  add column desconto numeric(10, 2) not null default 0;

create table cupom_usos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  cupom_id uuid not null references cupons (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  referencia_tipo text not null check (referencia_tipo in ('agendamento', 'pedido')),
  referencia_id uuid,
  valor_desconto numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index on cupom_usos (empresa_id);
create index on cupom_usos (cupom_id);

alter table cupom_usos enable row level security;

create policy cupom_usos_select on cupom_usos
  for select to authenticated
  using (
    auth_is_staff_of(empresa_id)
    or cliente_id in (select id from clientes where auth_user_id = auth.uid())
  );

create policy cupom_usos_insert on cupom_usos
  for insert to authenticated
  with check (
    auth_is_staff_of(empresa_id)
    or cliente_id in (select id from clientes where auth_user_id = auth.uid())
  );

create policy cupom_usos_write_staff on cupom_usos
  for all to authenticated
  using (auth_is_staff_of(empresa_id))
  with check (auth_is_staff_of(empresa_id));

-- Valida um cupom sem expor a tabela `cupons` inteira ao cliente (a policy
-- `cupons_staff` só deixa staff ler). SECURITY DEFINER: roda com privilégio
-- elevado mas só devolve algo se o cupom for da empresa informada, estiver
-- ativo, dentro da validade e ainda com uso disponível.
create or replace function validar_cupom(p_empresa_id uuid, p_codigo text)
returns table (id uuid, tipo_desconto text, valor numeric, motivo text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_cupom cupons%rowtype;
  v_usos integer;
begin
  select * into v_cupom
  from cupons c
  where c.empresa_id = p_empresa_id
    and lower(c.codigo) = lower(trim(p_codigo));

  if not found then
    return query select null::uuid, null::text, null::numeric, 'Cupom não encontrado.'::text;
    return;
  end if;

  if not v_cupom.ativo then
    return query select null::uuid, null::text, null::numeric, 'Cupom inativo.'::text;
    return;
  end if;

  if v_cupom.validade is not null and v_cupom.validade < current_date then
    return query select null::uuid, null::text, null::numeric, 'Cupom expirado.'::text;
    return;
  end if;

  if v_cupom.usos_maximos is not null then
    select count(*) into v_usos from cupom_usos u where u.cupom_id = v_cupom.id;
    if v_usos >= v_cupom.usos_maximos then
      return query select null::uuid, null::text, null::numeric, 'Este cupom já atingiu o limite de usos.'::text;
      return;
    end if;
  end if;

  return query select v_cupom.id, v_cupom.tipo_desconto, v_cupom.valor, null::text;
end;
$$;

grant execute on function validar_cupom(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Fidelidade: config por empresa + referência nos lançamentos de pontos para
-- evitar crédito duplicado quando um agendamento/pedido muda de status.
-- ---------------------------------------------------------------------------
create table fidelidade_config (
  empresa_id uuid primary key references empresas (id) on delete cascade,
  ativo boolean not null default false,
  pontos_por_atendimento integer not null default 0,
  pontos_por_real_produto numeric(10, 2) not null default 0,
  reais_por_ponto numeric(10, 2) not null default 0,
  updated_at timestamptz not null default now()
);

comment on table fidelidade_config is 'Regras do programa de fidelidade da barbearia. reais_por_ponto é o valor de resgate de cada ponto (0 = sem resgate em dinheiro, só pontuação simbólica).';

create trigger fidelidade_config_set_updated_at
  before update on fidelidade_config
  for each row execute function set_updated_at();

alter table fidelidade_config enable row level security;

create policy fidelidade_config_select on fidelidade_config
  for select to authenticated
  using (empresa_id in (select auth_empresa_ids()));

create policy fidelidade_config_write_staff on fidelidade_config
  for all to authenticated
  using (auth_is_staff_of(empresa_id))
  with check (auth_is_staff_of(empresa_id));

alter table fidelidade_pontos
  add column referencia_tipo text check (referencia_tipo in ('agendamento', 'pedido', 'manual', 'resgate')),
  add column referencia_id uuid;

-- Um agendamento/pedido só pode gerar um lançamento de pontos.
create unique index fidelidade_pontos_referencia_unq
  on fidelidade_pontos (referencia_tipo, referencia_id)
  where referencia_id is not null;

-- ---------------------------------------------------------------------------
-- Fornecedores: vínculo opcional nas entradas de estoque
-- ---------------------------------------------------------------------------
alter table estoque_movimentacoes
  add column fornecedor_id uuid references fornecedores (id) on delete set null;
