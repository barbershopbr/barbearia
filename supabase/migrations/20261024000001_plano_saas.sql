-- Plano do SaaS contratado pela barbearia (Básico / Pro / Premium) e
-- liberação de recursos por plano (feature flags). Não confundir com a tabela
-- `planos`, que são os planos de assinatura que a barbearia vende aos
-- próprios clientes.
--
-- Mapa plano -> recursos fica no código (lib/plano/recursos.ts), para poder
-- evoluir sem migration. `recursos_extras` permite ao Master ligar/desligar
-- um recurso específico para uma empresa, sobrepondo o plano
-- (ex.: {"cupons": true} num Básico como cortesia).
--
-- Nenhum grant de update para `authenticated`: o grant por coluna em
-- 20260727000003_rls_policies.sql já restringe o que o staff pode alterar, e
-- estas colunas ficam de fora — só o service_role (painel Master /
-- cobrança) muda o plano.

alter table empresas
  add column plano_saas text not null default 'basico'
    check (plano_saas in ('basico', 'pro', 'premium')),
  add column recursos_extras jsonb not null default '{}'::jsonb;

comment on column empresas.plano_saas is 'Plano do BarberControl contratado pela barbearia. Define os recursos liberados (ver lib/plano/recursos.ts).';
comment on column empresas.recursos_extras is 'Sobreposição por empresa do mapa de recursos do plano: {"<recurso>": true|false}. Só o Master altera.';
