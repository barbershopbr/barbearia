-- ============================================================================
-- Suporte a reset de senha customizado para clientes (necessário porque o
-- e-mail usado em auth.users é sintético e não-entregável — ver
-- lib/auth/cliente-identity.ts) e grants explícitos das funções de RLS.
-- ============================================================================

create table cliente_password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index on cliente_password_reset_tokens (cliente_id);

-- Só a service_role manipula esta tabela (geração/validação do token roda em
-- Server Actions com o client admin) — nenhuma policy para anon/authenticated.
alter table cliente_password_reset_tokens enable row level security;

-- Grants explícitos das funções usadas para checagem de papel a partir do
-- client autenticado comum (ex.: supabase.rpc('auth_is_master_admin')).
grant execute on function auth_empresa_ids() to authenticated;
grant execute on function auth_is_staff_of(uuid) to authenticated;
grant execute on function auth_is_owner_or_admin_of(uuid) to authenticated;
grant execute on function auth_is_master_admin() to authenticated;
