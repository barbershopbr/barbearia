-- Cobrança do SaaS (BarberControl → barbearias): fatura mensal por empresa,
-- vencimento no dia escolhido, bloqueio automático após 10 dias de atraso e
-- desbloqueio quando paga. Rotina diária via pg_cron (rotina_cobranca_saas).

alter table empresas
  add column saas_dia_vencimento smallint not null default 10 check (saas_dia_vencimento between 1 and 28),
  -- Por que está bloqueada: 'inadimplencia' (automático, desbloqueia ao pagar) ou 'manual' (Master).
  add column bloqueio_motivo text check (bloqueio_motivo in ('inadimplencia', 'manual')),
  -- Cortesia/teste: não gera fatura enquanto a data não passar.
  add column saas_isento_ate date;

-- Barbearias que já existem começam com 30 dias de cortesia (estão em teste).
update empresas set saas_isento_ate = (current_date + 30) where saas_isento_ate is null;

create table faturas_saas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  competencia date not null, -- primeiro dia do mês cobrado
  plano text not null,
  valor numeric(10, 2) not null,
  vencimento date not null,
  status text not null default 'aberta' check (status in ('aberta', 'paga', 'cancelada')),
  pago_em timestamptz,
  metodo text,
  gateway_id text,
  observacao text,
  created_at timestamptz not null default now(),
  unique (empresa_id, competencia)
);
create index on faturas_saas (status, vencimento);

alter table faturas_saas enable row level security;
-- A barbearia vê as próprias faturas (dono/admin); escrita só pelo servidor/Master.
create policy faturas_saas_select on faturas_saas for select to authenticated
  using (auth_is_owner_or_admin_of(empresa_id));

-- Auditoria do "acessar como a barbearia" (suporte do Master).
create table master_acessos (
  id uuid primary key default gen_random_uuid(),
  master_admin_id uuid not null references master_admins (id) on delete cascade,
  empresa_id uuid not null references empresas (id) on delete cascade,
  motivo text,
  created_at timestamptz not null default now()
);
alter table master_acessos enable row level security; -- sem policies: só service role

-- Preços dos planos (espelha PLANOS_SAAS em lib/plano/recursos.ts — manter em sincronia).
create or replace function preco_plano_saas(p_plano text)
returns numeric
language sql
immutable
as $$
  select case p_plano when 'basico' then 99 when 'pro' then 149 when 'premium' then 199 else 0 end::numeric;
$$;

-- Gera as faturas do mês (idempotente) e aplica bloqueio/desbloqueio por atraso.
create or replace function rotina_cobranca_saas(p_hoje date default (now() at time zone 'America/Sao_Paulo')::date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competencia date := date_trunc('month', p_hoje)::date;
  v_geradas int;
  v_bloqueadas int;
  v_desbloqueadas int;
begin
  insert into faturas_saas (empresa_id, competencia, plano, valor, vencimento)
  select e.id, v_competencia, e.plano_saas, preco_plano_saas(e.plano_saas),
         (v_competencia + (e.saas_dia_vencimento - 1))::date
  from empresas e
  where e.status in ('ativo', 'bloqueado')
    and (e.saas_isento_ate is null or e.saas_isento_ate < v_competencia + (e.saas_dia_vencimento - 1))
  on conflict (empresa_id, competencia) do nothing;
  get diagnostics v_geradas = row_count;

  -- Bloqueia quem tem fatura aberta vencida há mais de 10 dias.
  update empresas e set status = 'bloqueado', bloqueio_motivo = 'inadimplencia'
  where e.status = 'ativo'
    and exists (select 1 from faturas_saas f where f.empresa_id = e.id and f.status = 'aberta' and f.vencimento < p_hoje - 10);
  get diagnostics v_bloqueadas = row_count;

  -- Desbloqueia quem foi bloqueado por atraso e não deve mais nada vencido.
  update empresas e set status = 'ativo', bloqueio_motivo = null
  where e.status = 'bloqueado' and e.bloqueio_motivo = 'inadimplencia'
    and not exists (select 1 from faturas_saas f where f.empresa_id = e.id and f.status = 'aberta' and f.vencimento < p_hoje - 10);
  get diagnostics v_desbloqueadas = row_count;

  return jsonb_build_object('geradas', v_geradas, 'bloqueadas', v_bloqueadas, 'desbloqueadas', v_desbloqueadas);
end;
$$;
revoke execute on function rotina_cobranca_saas(date) from public, anon, authenticated;

-- Todo dia às 06:00 de Brasília (09:00 UTC).
create extension if not exists pg_cron;
select cron.schedule('cobranca-saas-diaria', '0 9 * * *', $cron$select public.rotina_cobranca_saas();$cron$);
