-- Corrige reserva dupla no site público. A disponibilidade era calculada
-- lendo `agendamentos` com a sessão do cliente, mas a RLS só mostra ao
-- cliente os PRÓPRIOS agendamentos: horários de outros clientes apareciam
-- livres e a checagem de conflito também não os via.

-- 1) Intervalos ocupados de um profissional, sem nenhum dado de cliente —
--    seguro para anon/authenticated.
create or replace function horarios_ocupados(
  p_empresa uuid,
  p_funcionario uuid,
  p_inicio timestamptz,
  p_fim timestamptz
)
returns table (data_hora_inicio timestamptz, data_hora_fim timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select a.data_hora_inicio, a.data_hora_fim
  from agendamentos a
  join empresas e on e.id = a.empresa_id
  where a.empresa_id = p_empresa
    and a.funcionario_id = p_funcionario
    and a.status <> 'cancelado'
    and a.data_hora_inicio < p_fim
    and a.data_hora_fim > p_inicio
    and e.status = 'ativo';
$$;

grant execute on function horarios_ocupados(uuid, uuid, timestamptz, timestamptz) to anon, authenticated;

-- 2) Garantia no banco: o mesmo profissional não pode ter dois atendimentos
--    (não cancelados) sobrepostos, nem com duas reservas simultâneas.
create extension if not exists btree_gist;

alter table agendamentos
  add constraint agendamentos_sem_sobreposicao
  exclude using gist (
    funcionario_id with =,
    tstzrange(data_hora_inicio, data_hora_fim, '[)') with &&
  )
  where (status <> 'cancelado');
