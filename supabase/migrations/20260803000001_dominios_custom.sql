-- ---------------------------------------------------------------------------
-- Domínio próprio por empresa (white label) + soft-delete de empresa.
--
-- Cada empresa pode configurar um domínio próprio (ex. barbeariaalpha.com.br)
-- que, uma vez verificado, substitui o subdomínio {slug}.usebrcontrol.com.br
-- (ver lib/tenant/domain.ts e middleware.ts). O provisionamento do domínio
-- (Cloudflare Custom Hostnames) é feito fora do banco; aqui só guardamos o
-- estado. dominio_principal/dominio_secundario/dominio_status só podem ser
-- alterados via service_role (fluxo de provisionamento), nunca por update
-- direto do formulário do tenant — por isso não entram no grant de update
-- de "authenticated" definido em 20260727000003_rls_policies.sql.
-- ---------------------------------------------------------------------------

alter table empresas
  add column dominio_principal text unique,
  add column dominio_secundario text unique,
  add column dominio_status text not null default 'pendente'
    check (dominio_status in ('pendente', 'verificado', 'falhou')),
  add column dominio_cloudflare_id text,
  add column favicon_url text,
  add column cnpj text;

create index on empresas (dominio_principal);
create index on empresas (dominio_secundario);

comment on column empresas.dominio_principal is 'Domínio próprio verificado da empresa (ex. barbeariaalpha.com.br). Quando presente e dominio_status = ''verificado'', substitui o acesso por subdomínio.';
comment on column empresas.dominio_secundario is 'Domínio alternativo opcional (ex. variação com/sem www), mesmas regras do principal.';
comment on column empresas.dominio_status is 'Estado do provisionamento do domínio próprio na Cloudflare (Custom Hostnames). Não reflete status de pagamento/ativação da empresa — isso é a coluna status.';
comment on column empresas.dominio_cloudflare_id is 'id do recurso Custom Hostname na Cloudflare (referente a dominio_principal), usado pra consultar status e apagar. Ver lib/cloudflare/custom-hostnames.ts.';

-- favicon_url e cnpj são campos de identidade/branding como logo_url, cores
-- etc. (grant original em 20260727000003_rls_policies.sql) — o staff da
-- própria empresa pode editar. dominio_* e status ficam de fora de
-- propósito (só service_role, ver comentário no topo do arquivo).
grant update (favicon_url, cnpj) on empresas to authenticated;

-- Soft-delete de empresa (painel Master): dados preservados, mas invisível
-- por completo (policy empresas_select_public já exige status = 'ativo',
-- então 'excluida' já fica automaticamente fora de qualquer leitura pública
-- ou por domínio/subdomínio, igual a 'bloqueado').
alter table empresas drop constraint empresas_status_check;
alter table empresas add constraint empresas_status_check
  check (status in ('ativo', 'inativo', 'bloqueado', 'excluida'));
