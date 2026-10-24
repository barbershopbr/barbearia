-- Notificações push no navegador (Web Push). Uma inscrição por navegador;
-- de um cliente (avisos do site) ou de alguém da equipe (avisos do painel).
create table push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  cliente_id uuid references clientes (id) on delete cascade,
  usuario_empresa_id uuid references usuarios_empresa (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint push_dono check ((cliente_id is null) <> (usuario_empresa_id is null))
);
create index on push_inscricoes (empresa_id);
alter table push_inscricoes enable row level security;
-- Gravação/leitura só pelo servidor (as actions conferem quem é o dono da inscrição).
