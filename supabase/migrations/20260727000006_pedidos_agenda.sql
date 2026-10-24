-- ============================================================================
-- Suporte a carrinho de produtos (itens por pedido) e separação/fulfillment,
-- além da policy de INSERT que faltava pro cliente criar seus próprios
-- pedidos (mesmo padrão já usado em assinaturas_clientes_insert_cliente).
-- ============================================================================

alter table pagamentos add column separado boolean not null default false;

create table pagamento_itens (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid not null references pagamentos (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index on pagamento_itens (pagamento_id);
create index on pagamento_itens (produto_id);

alter table pagamento_itens enable row level security;

create policy pagamento_itens_select on pagamento_itens
  for select to authenticated
  using (
    exists (
      select 1 from pagamentos p
      where p.id = pagamento_itens.pagamento_id
        and (
          auth_is_staff_of(p.empresa_id)
          or p.cliente_id in (select id from clientes where auth_user_id = auth.uid())
        )
    )
  );

create policy pagamento_itens_insert_cliente on pagamento_itens
  for insert to authenticated
  with check (
    exists (
      select 1 from pagamentos p
      where p.id = pagamento_itens.pagamento_id
        and p.cliente_id in (select id from clientes where auth_user_id = auth.uid())
    )
  );

create policy pagamento_itens_write_staff on pagamento_itens
  for all to authenticated
  using (
    exists (select 1 from pagamentos p where p.id = pagamento_itens.pagamento_id and auth_is_staff_of(p.empresa_id))
  )
  with check (
    exists (select 1 from pagamentos p where p.id = pagamento_itens.pagamento_id and auth_is_staff_of(p.empresa_id))
  );

-- Cliente pode criar seu próprio pedido de produto (fica pendente até a
-- barbearia confirmar/preparar — cobrança automática real fica pra quando o
-- gateway de pagamento (Fase B) existir).
create policy pagamentos_insert_cliente on pagamentos
  for insert to authenticated
  with check (
    status = 'pendente'
    and cliente_id in (select id from clientes where auth_user_id = auth.uid())
  );
