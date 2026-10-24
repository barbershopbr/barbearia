-- Loja com retirada na barbearia: o pedido nasce "pendente" com pagamento na
-- retirada, fica "pronto" (separado = true), e ao ser retirado vira "pago"
-- (baixa estoque). Também pode ser cancelado.

alter table pagamentos drop constraint pagamentos_metodo_check;
alter table pagamentos add constraint pagamentos_metodo_check
  check (metodo in ('pix', 'cartao', 'cartao_recorrente', 'na_retirada'));

alter table pagamentos drop constraint pagamentos_status_check;
alter table pagamentos add constraint pagamentos_status_check
  check (status in ('pendente', 'pago', 'falhou', 'estornado', 'cancelado'));

alter table pagamentos add column retirado_em timestamptz;

comment on column pagamentos.retirado_em is 'Pedido da loja: quando o cliente retirou na barbearia (baixa de estoque feita nesse momento).';
