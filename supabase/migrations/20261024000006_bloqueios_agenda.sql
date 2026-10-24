-- Folgas, férias, feriados e bloqueios avulsos da agenda. funcionario_id
-- null = vale para a barbearia inteira (ex.: feriado). A pausa diária
-- (almoço) fica em empresas.horarios[dia].pausa_inicio/pausa_fim.

create table bloqueios_agenda (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  funcionario_id uuid references funcionarios (id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text,
  criado_por uuid references usuarios_empresa (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint bloqueio_intervalo_valido check (fim > inicio)
);
create index on bloqueios_agenda (empresa_id, inicio);

alter table bloqueios_agenda enable row level security;

-- Equipe vê todos os bloqueios da empresa (para saber quem está de folga).
create policy bloqueios_select_staff on bloqueios_agenda for select to authenticated
  using (auth_is_staff_of(empresa_id));

-- Cria/altera: quem edita a agenda da equipe, ou o próprio profissional na
-- própria agenda. Bloqueio da barbearia inteira só com agenda da equipe.
create policy bloqueios_write_staff on bloqueios_agenda for all to authenticated
  using (
    auth_staff_pode(empresa_id, 'agenda-equipe', true)
    or (funcionario_id is not null and funcionario_id = auth_funcionario_proprio(empresa_id) and auth_staff_pode(empresa_id, 'agenda', true))
  )
  with check (
    auth_staff_pode(empresa_id, 'agenda-equipe', true)
    or (funcionario_id is not null and funcionario_id = auth_funcionario_proprio(empresa_id) and auth_staff_pode(empresa_id, 'agenda', true))
  );

-- Disponibilidade passa a considerar os bloqueios (do profissional e da
-- barbearia inteira) além dos agendamentos.
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
    and e.status = 'ativo'
  union all
  select b.inicio, b.fim
  from bloqueios_agenda b
  join empresas e on e.id = b.empresa_id
  where b.empresa_id = p_empresa
    and (b.funcionario_id = p_funcionario or b.funcionario_id is null)
    and b.inicio < p_fim
    and b.fim > p_inicio
    and e.status = 'ativo';
$$;
