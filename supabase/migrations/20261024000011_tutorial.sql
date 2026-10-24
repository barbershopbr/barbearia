-- Tutorial guiado do painel: aparece sozinho no primeiro acesso de cada
-- pessoa da equipe e pode ser revisto pelo menu. Marcado pelo servidor
-- (a própria pessoa nem sempre pode editar a linha dela em usuarios_empresa).
alter table usuarios_empresa add column tutorial_visto_em timestamptz;
