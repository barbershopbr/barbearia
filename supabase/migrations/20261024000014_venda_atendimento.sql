-- Item de venda no caixa ligado a um atendimento da agenda ("cobrar
-- atendimento"): conclui o atendimento uma única vez (comissão/pontos pela
-- agenda) e evita cobrar o mesmo atendimento duas vezes.
alter table pagamento_itens add column agendamento_id uuid references agendamentos (id) on delete set null;
create unique index pagamento_itens_agendamento_unico on pagamento_itens (agendamento_id) where agendamento_id is not null;
