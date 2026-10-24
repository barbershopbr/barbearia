-- Recebimentos da barbearia: conexão OAuth com o Mercado Pago (cada dono
-- conecta a própria conta pelo painel) e preferências de cobrança.
--
-- Credenciais (access/refresh token) ficam CIFRADAS (AES-GCM, chave
-- APP_SECRET no Worker — ver lib/pagamentos/cripto.ts) em
-- credenciais_cifradas. configuracoes_gateway continua sem nenhuma policy:
-- só o servidor (service role) lê/escreve.

alter table configuracoes_gateway
  add column credenciais_cifradas text,
  add column conta_id text,
  add column conta_nome text,
  add column conectado_em timestamptz,
  add column expira_em timestamptz,
  add column atualizado_em timestamptz not null default now();

comment on column configuracoes_gateway.credenciais is 'Legado (texto aberto) — não usar. Credenciais vão cifradas em credenciais_cifradas.';

-- Preferências que o dono escolhe no painel (lib/pagamentos/preferencias.ts).
alter table empresas add column pagamentos_config jsonb not null default '{}'::jsonb;
grant update (pagamentos_config) on empresas to authenticated;

comment on column empresas.pagamentos_config is 'Preferências de recebimento: pix, cartão, sinal no agendamento, pagamento online na loja. Ver lib/pagamentos/preferencias.ts.';
