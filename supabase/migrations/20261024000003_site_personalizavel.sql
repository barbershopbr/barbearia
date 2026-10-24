-- Site da barbearia personalizável pelo próprio painel: tema, textos do topo,
-- ordem/visibilidade das seções, galeria de fotos, promoções em destaque,
-- foto de produto e upload de imagens (Supabase Storage).

-- ---------------------------------------------------------------------------
-- Configuração do layout (estrutura em lib/site/config.ts). Editável pelo
-- staff, igual às demais colunas de identidade (grant por coluna).
-- ---------------------------------------------------------------------------
alter table empresas add column site_config jsonb not null default '{}'::jsonb;
grant update (site_config) on empresas to authenticated;

comment on column empresas.site_config is 'Layout do site público: tema, textos do topo, cor de destaque, seções (ordem/visibilidade). Ver lib/site/config.ts.';

-- ---------------------------------------------------------------------------
-- Foto do produto (vitrine) — a view pública passa a expor a coluna.
-- ---------------------------------------------------------------------------
alter table produtos add column foto_url text;

create or replace view produtos_publicos as
select p.id, p.empresa_id, p.categoria_id, p.nome, p.descricao, p.preco, p.ativo, p.created_at, p.foto_url
from produtos p
join empresas e on e.id = p.empresa_id
where p.ativo and e.status = 'ativo';

-- ---------------------------------------------------------------------------
-- Galeria de fotos do site.
-- ---------------------------------------------------------------------------
create table galeria_fotos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  url text not null,
  legenda text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create index on galeria_fotos (empresa_id, ordem);

alter table galeria_fotos enable row level security;
create policy galeria_select_public on galeria_fotos for select to anon, authenticated
  using (exists (select 1 from empresas e where e.id = empresa_id and e.status = 'ativo'));
create policy galeria_staff on galeria_fotos for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));

-- ---------------------------------------------------------------------------
-- Promoções em destaque no site.
-- ---------------------------------------------------------------------------
create table promocoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  titulo text not null,
  descricao text,
  imagem_url text,
  preco_de numeric(10, 2),
  preco_por numeric(10, 2),
  validade date,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create index on promocoes (empresa_id, ordem);

alter table promocoes enable row level security;
create policy promocoes_select_public on promocoes for select to anon, authenticated
  using (
    ativo
    and (validade is null or validade >= current_date)
    and exists (select 1 from empresas e where e.id = empresa_id and e.status = 'ativo')
  );
create policy promocoes_staff on promocoes for all to authenticated
  using (auth_is_staff_of(empresa_id)) with check (auth_is_staff_of(empresa_id));

-- ---------------------------------------------------------------------------
-- Storage: bucket público "midia" (leitura por URL pública). Escrita só pelo
-- staff, e só dentro da pasta da própria empresa: {empresa_id}/...
-- A comparação é por texto para não estourar erro de cast se alguém mandar
-- um caminho que não começa com uuid.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midia', 'midia', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'])
on conflict (id) do nothing;

create or replace function auth_staff_pode_midia(object_name text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from usuarios_empresa
    where auth_user_id = auth.uid()
      and ativo = true
      and empresa_id::text = split_part(object_name, '/', 1)
  );
$$;

create policy midia_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'midia' and auth_staff_pode_midia(name));
create policy midia_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'midia' and auth_staff_pode_midia(name))
  with check (bucket_id = 'midia' and auth_staff_pode_midia(name));
create policy midia_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'midia' and auth_staff_pode_midia(name));
