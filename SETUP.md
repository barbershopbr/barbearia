# Setup — do zero até rodar e publicar

Guia passo a passo para subir o BarberControl. São 3 blocos: **banco (Supabase)**,
**rodar local** e **publicar (Cloudflare)**. Você consegue fazer os dois primeiros
em ~20 min.

---

## 1. Banco de dados (Supabase)

### 1.1 Criar o projeto

1. Acesse <https://supabase.com> → **New project**.
2. Dê um nome (ex.: `barbercontrol`), escolha uma senha forte para o banco
   (guarde) e a região **South America (São Paulo)**.
3. Espere ~2 min o projeto provisionar.

### 1.2 Aplicar as migrations

No painel do Supabase, abra **SQL Editor** → **New query** e rode **cada arquivo
de `supabase/migrations/` na ordem do nome** (o prefixo é a data). Copie o
conteúdo, cole, **Run**, repita:

```
20260727000001_schema.sql
20260727000002_functions.sql
20260727000003_rls_policies.sql
20260727000004_auth_extras.sql
20260727000005_comissoes_financeiro.sql
20260727000006_pedidos_agenda.sql
20260727000007_comissao_modelos.sql
20260803000001_dominios_custom.sql
20260830000001_cupons_fidelidade_fornecedores.sql
```

> Se der erro em algum arquivo, pare — não pule. Provavelmente rodou fora de ordem.

### 1.3 Criar o primeiro admin do painel Master

1. **Authentication → Users → Add user** → crie um usuário com **seu e-mail** e
   uma senha. Marque **Auto Confirm User**.
2. **SQL Editor**, rode (troque o e-mail):

   ```sql
   insert into master_admins (auth_user_id, nome, role)
   select id, 'Seu Nome', 'admin'
   from auth.users
   where email = 'voce@exemplo.com';
   ```

### 1.4 Pegar as chaves

**Project Settings → API**. Você vai precisar de 3 valores:

| Campo no painel | Vai no `.env.local` como |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

> A `service_role` é uma chave de administrador — **nunca** commite nem exponha
> no navegador. Ela só é usada em código server-side (painel Master, criação de
> cliente).

---

## 2. Rodar localmente

### 2.1 Configurar o `.env.local`

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Deixe assim para desenvolvimento local:
NEXT_PUBLIC_ROOT_DOMAIN=usebrcontrol.com.br
NEXT_PUBLIC_ROOT_DOMAIN_DEV=lvh.me:3000

# Só necessário quando for configurar domínio próprio de cliente (pode deixar vazio agora):
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
```

### 2.2 Subir

```bash
npm install
npm run dev
```

O multi-tenant funciona via subdomínios `*.lvh.me` (resolvem para `127.0.0.1`
sem mexer no `hosts`):

| URL | O quê |
| --- | --- |
| <http://lvh.me:3000> | site institucional (marketing) |
| <http://master.lvh.me:3000/login> | painel Master (entre com o admin do passo 1.3) |
| `http://{slug}.lvh.me:3000` | site público de uma barbearia |
| `http://{slug}.lvh.me:3000/admin/login` | painel administrativo da barbearia |
| `http://{slug}.lvh.me:3000/area-cliente/login` | área do cliente |

### 2.3 Fluxo de teste ponta a ponta

1. Entre em `master.lvh.me:3000/login` e **cadastre uma barbearia** (ex. slug
   `barbearia-teste`). A criação já gera a conta do responsável (`owner`).
2. Entre em `barbearia-teste.lvh.me:3000/admin/login` com essa conta.
3. Em **Configurações**: preencha nome, cores, endereço, contato e **horários de
   funcionamento** (sem isso o agendamento não mostra horários livres).
4. Cadastre **Serviços** e **Funcionários**.
5. (Opcional) Crie um **Cupom** (ex. `BEMVINDO10`, 10%), configure a
   **Fidelidade** (ex. 10 pontos por atendimento) e cadastre **Fornecedores**.
6. Abra `barbearia-teste.lvh.me:3000`, crie uma conta em **Área do cliente** e
   faça um agendamento — teste aplicar o cupom.
7. Volte ao admin → **Agenda** → marque o agendamento como **concluído**: gera
   comissão (se houver regra) e credita pontos de fidelidade.

---

## 3. Publicar na Cloudflare (Workers)

> Só quando o app já estiver rodando local. Precisa de conta na Cloudflare
> (plano gratuito serve para começar; **domínio próprio de cliente** exige
> Cloudflare for SaaS).

### 3.1 Login e KV

```bash
npx wrangler login
npx wrangler kv namespace create TENANT_DOMAINS
npx wrangler kv namespace create TENANT_DOMAINS --preview
```

Copie os `id` retornados para `wrangler.jsonc` (campos `id` e `preview_id`,
hoje com `REPLACE_WITH_...`).

### 3.2 Secrets do Worker

As variáveis do `.env.local` **não** vão junto no deploy — registre como secrets:

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put NEXT_PUBLIC_ROOT_DOMAIN        # ex.: usebrcontrol.com.br
```

`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ZONE_ID` também, quando for usar domínio
próprio por barbearia.

### 3.3 Build + deploy

```bash
npm run cf:deploy
```

### 3.4 DNS

No seu domínio (ex. `usebrcontrol.com.br`), na Cloudflare:

- `A`/`CNAME` do apex → Worker
- `CNAME` **wildcard** `*` → Worker (para os subdomínios `{slug}.usebrcontrol.com.br`)
- `CNAME` `master` → Worker

`NEXT_PUBLIC_ROOT_DOMAIN` (secret) tem que bater com esse domínio.

---

## Checklist rápido

- [ ] 9 migrations aplicadas na ordem
- [ ] `master_admins` tem uma linha com o seu `auth_user_id`
- [ ] `.env.local` com as 3 chaves do Supabase
- [ ] `npm run dev` sobe e `master.lvh.me:3000/login` autentica
- [ ] Barbearia de teste criada, Configurações + Serviços + Funcionários preenchidos
- [ ] Agendamento de teste concluído gera comissão/pontos
