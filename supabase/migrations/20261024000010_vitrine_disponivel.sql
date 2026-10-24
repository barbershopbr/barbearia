-- Vitrine da loja: informa se o produto tem estoque (sem expor a quantidade)
-- e o nome da categoria (a tabela categorias só é legível pela equipe).
-- DROP + CREATE porque CREATE OR REPLACE VIEW não deixa inserir colunas no meio.
drop view produtos_publicos;

create view produtos_publicos as
select
  p.id,
  p.empresa_id,
  p.categoria_id,
  c.nome as categoria_nome,
  p.nome,
  p.descricao,
  p.preco,
  p.ativo,
  p.created_at,
  p.foto_url,
  p.estoque_atual > 0 as disponivel
from produtos p
join empresas e on e.id = p.empresa_id
left join categorias c on c.id = p.categoria_id
where p.ativo and e.status = 'ativo';

grant select on produtos_publicos to anon, authenticated;
