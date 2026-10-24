-- ============================================================================
-- Modelos de comissão mais realistas: além de percentual por serviço, o dono
-- da barbearia pode configurar valor fixo por atendimento, diária ou salário
-- mensal fixo por funcionário — é opcional e configurável por pessoa (nem
-- todo mundo é comissionado do mesmo jeito).
-- ============================================================================

alter table regras_comissao drop constraint regras_comissao_tipo_check;
alter table regras_comissao add constraint regras_comissao_tipo_check
  check (tipo in ('percentual', 'fixo_por_servico', 'diaria', 'mensal'));

alter table comissoes drop constraint comissoes_tipo_check;
alter table comissoes add constraint comissoes_tipo_check
  check (tipo in ('servico', 'produto', 'assinatura', 'personalizada', 'diaria', 'mensal'));
