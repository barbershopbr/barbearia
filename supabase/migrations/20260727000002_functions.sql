-- ============================================================================
-- Funções de apoio ao isolamento multi-tenant.
-- ============================================================================

-- Todos os empresa_id que o usuário autenticado atual pertence, seja como
-- funcionário/admin (usuarios_empresa) ou como cliente (clientes). SECURITY
-- DEFINER para poder ler essas tabelas independente das policies de RLS de
-- quem está chamando (evita recursão de policy).
create or replace function auth_empresa_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select empresa_id from usuarios_empresa where auth_user_id = auth.uid()
  union
  select empresa_id from clientes where auth_user_id = auth.uid();
$$;

comment on function auth_empresa_ids() is
  'Empresas (tenants) que o usuário autenticado atual pode acessar, como staff ou como cliente.';

-- Usado pelas policies de escrita do painel admin: só staff (não cliente) tem
-- permissão de escrita nas tabelas operacionais da empresa.
create or replace function auth_is_staff_of(target_empresa_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from usuarios_empresa
    where auth_user_id = auth.uid()
      and empresa_id = target_empresa_id
      and ativo = true
  );
$$;

comment on function auth_is_staff_of(uuid) is
  'True se o usuário autenticado é funcionário/admin ativo da empresa informada.';

-- Usado pelo painel Master: nenhuma tabela normal expõe policy para
-- anon/authenticated em master_admins, então rotas do Master (rodando com a
-- service_role key) chamam esta função apenas como checagem de defesa em
-- profundidade adicional dentro de funções SQL que precisem confirmar o papel.
create or replace function auth_is_master_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from master_admins where auth_user_id = auth.uid()
  );
$$;

comment on function auth_is_master_admin() is
  'True se o usuário autenticado é um admin do SaaS (painel Master).';
