-- Vitrine pública de produtos. A tabela `produtos` só é legível pelo staff
-- (policy produtos_staff) — e deve continuar assim, porque tem `custo` e
-- estoque. Sem isto o site público e o carrinho do cliente não enxergavam
-- nenhum produto.
--
-- View sem security_invoker (roda com o dono, ignora a RLS da tabela), por
-- isso o filtro de visibilidade fica aqui: só produto ativo de empresa ativa,
-- e só colunas seguras.
create view produtos_publicos as
select p.id, p.empresa_id, p.categoria_id, p.nome, p.descricao, p.preco, p.ativo, p.created_at
from produtos p
join empresas e on e.id = p.empresa_id
where p.ativo and e.status = 'ativo';

grant select on produtos_publicos to anon, authenticated;
