-- Avaliações dos atendimentos e lista de espera.

-- ---------------------------------------------------------------------------
-- Avaliações: o cliente avalia um atendimento CONCLUÍDO dele (uma vez).
-- ---------------------------------------------------------------------------
create table avaliacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  agendamento_id uuid not null unique references agendamentos (id) on delete cascade,
  funcionario_id uuid references funcionarios (id) on delete set null,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (char_length(comentario) <= 1000),
  resposta text check (char_length(resposta) <= 1000),
  publicada boolean not null default true,
  created_at timestamptz not null default now()
);
create index on avaliacoes (empresa_id, created_at desc);
create index on avaliacoes (funcionario_id);

alter table avaliacoes enable row level security;

create policy avaliacoes_select_cliente on avaliacoes for select to authenticated
  using (cliente_id in (select id from clientes where auth_user_id = auth.uid()));
create policy avaliacoes_insert_cliente on avaliacoes for insert to authenticated
  with check (
    cliente_id in (select id from clientes where auth_user_id = auth.uid())
    and exists (
      select 1 from agendamentos a
      where a.id = agendamento_id and a.cliente_id = avaliacoes.cliente_id
        and a.empresa_id = avaliacoes.empresa_id and a.status = 'concluido'
    )
  );
create policy avaliacoes_staff on avaliacoes for all to authenticated
  using (auth_staff_pode(empresa_id, 'avaliacoes', false))
  with check (auth_staff_pode(empresa_id, 'avaliacoes', true));

-- Vitrine pública: só publicadas, com o primeiro nome do cliente.
create view avaliacoes_publicas as
select
  av.id, av.empresa_id, av.funcionario_id, av.nota, av.comentario, av.resposta, av.created_at,
  split_part(c.nome, ' ', 1) as cliente_primeiro_nome,
  f.nome as funcionario_nome
from avaliacoes av
join clientes c on c.id = av.cliente_id
join empresas e on e.id = av.empresa_id
left join funcionarios f on f.id = av.funcionario_id
where av.publicada and e.status = 'ativo';
grant select on avaliacoes_publicas to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Lista de espera: dia sem horário → o cliente pede para ser avisado se
-- abrir uma vaga (cancelamento). Aviso por e-mail quando houver cancelamento.
-- ---------------------------------------------------------------------------
create table lista_espera (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  servico_id uuid not null references servicos (id) on delete cascade,
  funcionario_id uuid references funcionarios (id) on delete cascade, -- null = qualquer profissional
  data date not null,
  status text not null default 'aguardando' check (status in ('aguardando', 'avisado', 'agendou', 'cancelado')),
  avisado_em timestamptz,
  created_at timestamptz not null default now()
);
create index on lista_espera (empresa_id, data, status);
create unique index lista_espera_unica on lista_espera (cliente_id, data, servico_id) where status = 'aguardando';

alter table lista_espera enable row level security;
create policy lista_espera_cliente on lista_espera for all to authenticated
  using (cliente_id in (select id from clientes where auth_user_id = auth.uid()))
  with check (cliente_id in (select id from clientes where auth_user_id = auth.uid()));
create policy lista_espera_staff on lista_espera for all to authenticated
  using (auth_staff_pode(empresa_id, 'agenda', false))
  with check (auth_staff_pode(empresa_id, 'agenda', true));
