-- ============================================================================
-- Row Level Security — isolamento multi-tenant.
-- Toda tabela de negócio é protegida por empresa_id; nenhuma linha de uma
-- empresa é visível para usuários de outra, mesmo que a aplicação tenha um bug
-- e esqueça de filtrar por empresa_id numa query.
-- ============================================================================

create or replace function auth_is_owner_or_admin_of(target_empresa_id uuid)
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
      and role in ('owner', 'admin')
      and ativo = true
  );
$$;

-- ---------------------------------------------------------------------------
-- empresas: dados de personalização são públicos quando ativa; edição restrita
-- a staff da própria empresa e apenas nas colunas de personalização (slug e
-- status só mudam pelo painel Master, via service_role).
-- ---------------------------------------------------------------------------
alter table empresas enable row level security;

create policy empresas_select_public on empresas
  for select to anon, authenticated
  using (status = 'ativo');

create policy empresas_select_staff on empresas
  for select to authenticated
  using (auth_is_staff_of(id));

create policy empresas_update_staff on empresas
  for update to authenticated
  using (auth_is_staff_of(id))
  with check (auth_is_staff_of(id));

revoke update on empresas from authenticated;
grant update (nome, logo_url, banner_url, descricao, cores, endereco, latitude, longitude,
               telefone, whatsapp, instagram, horarios) on empresas to authenticated;

-- ---------------------------------------------------------------------------
-- usuarios_empresa: visível para a equipe da empresa; gestão (criar/editar
-- outros funcionários) restrita a owner/admin.
-- ---------------------------------------------------------------------------
alter table usuarios_empresa enable row level security;

create policy usuarios_empresa_select on usuarios_empresa
  for select to authenticated
  using (auth_is_staff_of(empresa_id));

create policy usuarios_empresa_insert on usuarios_empresa
  for insert to authenticated
  with check (auth_is_owner_or_admin_of(empresa_id));

create policy usuarios_empresa_update on usuarios_empresa
  for update to authenticated
  using (auth_is_owner_or_admin_of(empresa_id))
  with check (auth_is_owner_or_admin_of(empresa_id));

create policy usuarios_empresa_delete on usuarios_empresa
  for delete to authenticated
  using (auth_is_owner_or_admin_of(empresa_id));

-- ---------------------------------------------------------------------------
-- clientes: o próprio cliente vê/edita seu cadastro; staff da empresa também
-- (para atendimento presencial / cadastro manual no balcão).
-- ---------------------------------------------------------------------------
alter table clientes enable row level security;

create policy clientes_select on clientes
  for select to authenticated
  using (auth_user_id = auth.uid() or auth_is_staff_of(empresa_id));

create policy clientes_insert on clientes
  for insert to authenticated
  with check (auth_user_id = auth.uid() or auth_is_staff_of(empresa_id));

create policy clientes_update on clientes
  for update to authenticated
  using (auth_user_id = auth.uid() or auth_is_staff_of(empresa_id))
  with check (auth_user_id = auth.uid() or auth_is_staff_of(empresa_id));

create policy clientes_delete on clientes
  for delete to authenticated
  using (auth_is_staff_of(empresa_id));

-- ---------------------------------------------------------------------------
-- master_admins: nenhuma policy para anon/authenticated -> RLS nega tudo por
-- padrão. Só a service_role (que ignora RLS) consegue ler/escrever, e sempre
-- a partir de código server-side do painel Master.
-- ---------------------------------------------------------------------------
alter table master_admins enable row level security;

-- ---------------------------------------------------------------------------
-- servicos / funcionarios: catálogo público do site (só registros ativos);
-- gestão completa para staff da empresa.
-- ---------------------------------------------------------------------------
alter table servicos enable row level security;

create policy servicos_select_public on servicos
  for select to anon, authenticated
  using (ativo = true);

create policy servicos_select_staff on servicos
  for select to authenticated
  using (auth_is_staff_of(empresa_id));

create policy servicos_write_staff on servicos
  for all to authenticated
  using (auth_is_staff_of(empresa_id))
  with check (auth_is_staff_of(empresa_id));

alter table funcionarios enable row level security;

create policy funcionarios_select_public on funcionarios
  for select to anon, authenticated
  using (ativo = true);

create policy funcionarios_select_staff on funcionarios
  for select to authenticated
  using (auth_is_staff_of(empresa_id));

create policy funcionarios_write_staff on funcionarios
  for all to authenticated
  using (auth_is_staff_of(empresa_id))
  with check (auth_is_staff_of(empresa_id));

-- ---------------------------------------------------------------------------
-- agendamentos: cliente vê/gerencia os próprios; staff vê/gerencia todos da empresa.
-- ---------------------------------------------------------------------------
alter table agendamentos enable row level security;

create policy agendamentos_select on agendamentos
  for select to authenticated
  using (
    auth_is_staff_of(empresa_id)
    or cliente_id in (select id from clientes where auth_user_id = auth.uid())
  );

create policy agendamentos_insert on agendamentos
  for insert to authenticated
  with check (
    auth_is_staff_of(empresa_id)
    or cliente_id in (select id from clientes where auth_user_id = auth.uid())
  );

create policy agendamentos_update on agendamentos
  for update to authenticated
  using (
    auth_is_staff_of(empresa_id)
    or cliente_id in (select id from clientes where auth_user_id = auth.uid())
  )
  with check (
    auth_is_staff_of(empresa_id)
    or cliente_id in (select id from clientes where auth_user_id = auth.uid())
  );

create policy agendamentos_delete on agendamentos
  for delete to authenticated
  using (auth_is_staff_of(empresa_id));

-- ---------------------------------------------------------------------------
-- Módulos de fases futuras: schema já isolado por empresa_id, mas sem UI
-- ainda. Política padrão = só staff da própria empresa (mais restritivo que
-- o necessário para planos/produtos, que terão leitura pública quando a UI
-- for construída — ajustar então).
-- ---------------------------------------------------------------------------
create policy categorias_staff on categorias for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));
alter table categorias enable row level security;

create policy produtos_staff on produtos for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));
alter table produtos enable row level security;

create policy fornecedores_staff on fornecedores for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));
alter table fornecedores enable row level security;

create policy estoque_movimentacoes_staff on estoque_movimentacoes for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));
alter table estoque_movimentacoes enable row level security;

alter table planos enable row level security;
create policy planos_select_public on planos for select to anon, authenticated using (ativo = true);
create policy planos_write_staff on planos for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));

alter table assinaturas_clientes enable row level security;
create policy assinaturas_clientes_select on assinaturas_clientes for select to authenticated
  using (auth_is_staff_of(empresa_id) or cliente_id in (select id from clientes where auth_user_id = auth.uid()));
create policy assinaturas_clientes_write_staff on assinaturas_clientes for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));

alter table pagamentos enable row level security;
create policy pagamentos_select on pagamentos for select to authenticated
  using (auth_is_staff_of(empresa_id) or cliente_id in (select id from clientes where auth_user_id = auth.uid()));
create policy pagamentos_write_staff on pagamentos for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));

create policy comissoes_staff on comissoes for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));
alter table comissoes enable row level security;

create policy cupons_staff on cupons for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));
alter table cupons enable row level security;

alter table fidelidade_pontos enable row level security;
create policy fidelidade_pontos_select on fidelidade_pontos for select to authenticated
  using (auth_is_staff_of(empresa_id) or cliente_id in (select id from clientes where auth_user_id = auth.uid()));
create policy fidelidade_pontos_write_staff on fidelidade_pontos for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));

-- Credenciais de gateway: nunca legível por anon/authenticated (nem o próprio
-- staff via API pública) — só service_role, a partir de Server Actions do
-- painel admin que tratam a credencial como write-only após a configuração inicial.
alter table configuracoes_gateway enable row level security;
