-- Permissões por funcionário também no banco. Até aqui a RLS liberava as
-- tabelas para qualquer staff ativo da empresa e o controle fino ficava só
-- no app (lib/auth/papeis.ts). Agora políticas RESTRITIVAS (somam-se às
-- permissivas existentes com AND) exigem o nível da seção correspondente.
--
-- Mesma regra de lib/auth/papeis.ts → permissoesDe():
--   owner/admin: tudo; permissions.secoes salvo pelo dono: vale ele;
--   senão, o modelo do papel. MANTER OS DOIS EM SINCRONIA.

create or replace function auth_staff_nivel(p_empresa uuid, p_secao text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when n in ('ver', 'editar') then n
    else null
  end
  from (
    select case
      when ue.role in ('owner', 'admin') then 'editar'
      when ue.permissions ? 'secoes' then ue.permissions -> 'secoes' ->> p_secao
      when ue.role = 'barbeiro' then '{"agenda": "editar", "clientes": "ver"}'::jsonb ->> p_secao
      when ue.role = 'recepcionista' then
        '{"": "ver", "agenda": "editar", "agenda-equipe": "editar", "clientes": "editar", "pedidos": "editar",
          "assinaturas": "ver", "servicos": "ver", "produtos": "ver"}'::jsonb ->> p_secao
    end as n
    from usuarios_empresa ue
    where ue.auth_user_id = auth.uid() and ue.empresa_id = p_empresa and ue.ativo
    limit 1
  ) x;
$$;

create or replace function auth_staff_pode(p_empresa uuid, p_secao text, p_editar boolean)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    case when p_editar then auth_staff_nivel(p_empresa, p_secao) = 'editar'
         else auth_staff_nivel(p_empresa, p_secao) is not null end,
    false);
$$;

-- Perfil de profissional vinculado ao login (para "própria agenda/comissões").
create or replace function auth_funcionario_proprio(p_empresa uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select f.id
  from funcionarios f
  join usuarios_empresa ue on ue.id = f.usuario_empresa_id
  where ue.auth_user_id = auth.uid() and ue.ativo and f.empresa_id = p_empresa
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Tabelas só de staff: exige a seção (ver para ler, editar para alterar).
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('despesas', 'financeiro'),
      ('regras_comissao', 'comissoes'),
      ('fornecedores', 'fornecedores'),
      ('cupons', 'cupons'),
      ('produtos', 'produtos'),
      ('categorias', 'produtos'),
      ('estoque_movimentacoes', 'produtos')
    ) as v(tabela, secao)
  loop
    execute format(
      'create policy %1$s_perm_select on %1$I as restrictive for select to authenticated using (auth_staff_pode(empresa_id, %2$L, false))',
      t.tabela, t.secao);
    execute format(
      'create policy %1$s_perm_insert on %1$I as restrictive for insert to authenticated with check (auth_staff_pode(empresa_id, %2$L, true))',
      t.tabela, t.secao);
    execute format(
      'create policy %1$s_perm_update on %1$I as restrictive for update to authenticated using (auth_staff_pode(empresa_id, %2$L, true)) with check (auth_staff_pode(empresa_id, %2$L, true))',
      t.tabela, t.secao);
    execute format(
      'create policy %1$s_perm_delete on %1$I as restrictive for delete to authenticated using (auth_staff_pode(empresa_id, %2$L, true))',
      t.tabela, t.secao);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Comissões: quem não tem a seção ainda vê as próprias (Meu histórico).
-- ---------------------------------------------------------------------------
create policy comissoes_perm_select on comissoes as restrictive for select to authenticated
  using (auth_staff_pode(empresa_id, 'comissoes', false) or funcionario_id = auth_funcionario_proprio(empresa_id));
create policy comissoes_perm_insert on comissoes as restrictive for insert to authenticated
  with check (auth_staff_pode(empresa_id, 'comissoes', true));
create policy comissoes_perm_update on comissoes as restrictive for update to authenticated
  using (auth_staff_pode(empresa_id, 'comissoes', true)) with check (auth_staff_pode(empresa_id, 'comissoes', true));
create policy comissoes_perm_delete on comissoes as restrictive for delete to authenticated
  using (auth_staff_pode(empresa_id, 'comissoes', true));
-- (a comissão gerada ao concluir um atendimento é gravada pelo servidor —
-- ver updateAgendamentoStatus — então não precisa de exceção aqui.)

-- ---------------------------------------------------------------------------
-- Agenda: staff sem "agenda-equipe" só enxerga/mexe nos próprios
-- atendimentos. Clientes (não-staff) seguem só as policies que já existiam.
-- ---------------------------------------------------------------------------
create policy agendamentos_perm_select on agendamentos as restrictive for select to authenticated
  using (
    not auth_is_staff_of(empresa_id)
    or auth_staff_pode(empresa_id, 'agenda-equipe', false)
    or funcionario_id = auth_funcionario_proprio(empresa_id)
  );

create policy agendamentos_perm_insert on agendamentos as restrictive for insert to authenticated
  with check (
    not auth_is_staff_of(empresa_id)
    or auth_staff_pode(empresa_id, 'agenda-equipe', true)
    or (funcionario_id = auth_funcionario_proprio(empresa_id) and auth_staff_pode(empresa_id, 'agenda', true))
  );

create policy agendamentos_perm_update on agendamentos as restrictive for update to authenticated
  using (
    not auth_is_staff_of(empresa_id)
    or auth_staff_pode(empresa_id, 'agenda-equipe', true)
    or (funcionario_id = auth_funcionario_proprio(empresa_id) and auth_staff_pode(empresa_id, 'agenda', true))
  )
  with check (
    not auth_is_staff_of(empresa_id)
    or auth_staff_pode(empresa_id, 'agenda-equipe', true)
    or (funcionario_id = auth_funcionario_proprio(empresa_id) and auth_staff_pode(empresa_id, 'agenda', true))
  );

create policy agendamentos_perm_delete on agendamentos as restrictive for delete to authenticated
  using (
    not auth_is_staff_of(empresa_id)
    or auth_staff_pode(empresa_id, 'agenda-equipe', true)
  );
