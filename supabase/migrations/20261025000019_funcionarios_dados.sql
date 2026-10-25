-- Dados internos do funcionário (contato, documentos, contrato, salário).
-- Ficam FORA de `funcionarios`, que é leitura pública (equipe no site).
-- Só quem tem a seção "funcionarios" lê; editar exige "editar". O próprio
-- profissional vê (não altera) os seus dados.

create table funcionarios_dados (
  funcionario_id uuid primary key references funcionarios (id) on delete cascade,
  empresa_id uuid not null references empresas (id) on delete cascade,
  telefone text,
  email text,
  cpf text,
  data_nascimento date,
  data_admissao date,
  cargo text,
  tipo_contrato text check (tipo_contrato in ('clt', 'mei', 'autonomo', 'parceria', 'estagio', 'outro')),
  salario_fixo numeric(10, 2) not null default 0 check (salario_fixo >= 0),
  dia_pagamento smallint check (dia_pagamento between 1 and 31),
  chave_pix text,
  endereco text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index funcionarios_dados_empresa_idx on funcionarios_dados (empresa_id);

alter table funcionarios_dados enable row level security;
create policy funcionarios_dados_ler on funcionarios_dados for select to authenticated
  using (auth_staff_pode(empresa_id, 'funcionarios', false) or funcionario_id = auth_funcionario_proprio(empresa_id));
create policy funcionarios_dados_inserir on funcionarios_dados for insert to authenticated
  with check (auth_staff_pode(empresa_id, 'funcionarios', true));
create policy funcionarios_dados_alterar on funcionarios_dados for update to authenticated
  using (auth_staff_pode(empresa_id, 'funcionarios', true))
  with check (auth_staff_pode(empresa_id, 'funcionarios', true));
create policy funcionarios_dados_excluir on funcionarios_dados for delete to authenticated
  using (auth_staff_pode(empresa_id, 'funcionarios', true));

create trigger funcionarios_dados_set_updated_at
  before update on funcionarios_dados
  for each row execute function set_updated_at();
