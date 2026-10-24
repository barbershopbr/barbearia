# BarberControl

Plataforma white label multiempresa para barbearias — uma única aplicação
que atende várias barbearias de forma independente. Cada barbearia acessa
por padrão via subdomínio (`{slug}.usebrcontrol.com.br`) e pode configurar
seu próprio domínio (`barbeariaalpha.com.br`), que passa a substituir o
subdomínio. Site público, área do cliente, painel administrativo e painel
Master ficam separados — dados 100% isolados por `empresa_id` (tenant),
reforçados por Row Level Security no Postgres.

## Stack

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres/Auth/Storage).

## Configuração inicial

Guia completo (banco + rodar local + publicar na Cloudflare): **`SETUP.md`**.

Resumo:

1. **Banco de dados**: siga `supabase/README.md` / `SETUP.md` para criar o
   projeto Supabase, aplicar as migrations (`supabase/migrations/`, nessa ordem)
   e criar o primeiro admin do painel Master.
2. Copie `.env.local.example` para `.env.local` e preencha com as chaves do
   seu projeto Supabase.
3. `npm install`
4. `npm run dev`

## Módulos do painel admin da barbearia

Dashboard · Agenda · Clientes · Serviços · Funcionários · Produtos (com entrada
de estoque por fornecedor) · Fornecedores · Cupons · Fidelidade · Comissões ·
Financeiro · Domínio próprio · Configurações (identidade, cores, contato,
horários) · Meu Histórico. Pagamentos com gateway ficam para uma fase futura —
pedidos e assinaturas hoje entram como "pendente" e a barbearia confirma.

Área do cliente: agendamento (com cupom), histórico, compra de produtos (com
cupom), pagamentos e extrato de pontos de fidelidade.

## Testando o multi-tenant localmente (sem configurar DNS)

Use subdomínios `*.lvh.me`, que resolvem para `127.0.0.1` sem precisar editar
o arquivo `hosts`:

- `http://lvh.me:3000` — site institucional (marketing) do SaaS
- `http://master.lvh.me:3000/login` — painel Master
- `http://{slug}.lvh.me:3000` — site público de uma barbearia
- `http://{slug}.lvh.me:3000/admin/login` — painel administrativo da barbearia
- `http://{slug}.lvh.me:3000/area-cliente/login` — área do cliente

Fluxo de ponta a ponta para validar o isolamento:

1. Acesse `master.lvh.me:3000/login`, entre com o admin do Master (criado via
   `supabase/README.md`) e cadastre 2 barbearias de teste (ex. slugs
   `barbearia-a` e `barbearia-b`) — a criação já cria a conta do responsável
   (`owner`) de cada uma.
2. Logue em `barbearia-a.lvh.me:3000/admin/login` com a conta criada, cadastre
   serviços/funcionários e crie um agendamento.
3. Confirme que `barbearia-b.lvh.me:3000` não mostra nada de `barbearia-a`
   (nem no site público, nem tentando logar com a conta de admin da A no
   subdomínio da B).
4. Para validar que o isolamento é garantido pelo próprio banco (não só pela
   aplicação): no SQL Editor do Supabase, autentique como o `auth.uid()` do
   admin da empresa A (`set local role authenticated; set local
   request.jwt.claim.sub = '<uuid>';`) e tente `select * from agendamentos
   where empresa_id = '<id da empresa B>'` — deve retornar 0 linhas mesmo
   sendo uma query que tenta forçar o filtro errado.

## Estrutura

```
app/
  page.tsx              # marketing (domínio raiz)
  master/                # painel Master (subdomínio "master"/"admin")
  sites/[slug]/           # tudo que é por-tenant (site público, área do
                          # cliente, painel admin) — alvo do rewrite feito
                          # em middleware.ts a partir do subdomínio ou
                          # domínio próprio da empresa
middleware.ts             # resolve o subdomínio/domínio próprio e reescreve
                          # a rota. Nomeado assim (não "proxy.ts", a
                          # convenção nova do Next 16) de propósito — ver
                          # comentário no próprio arquivo.
lib/
  supabase/               # clients (browser, server, service-role) + tipos
  tenant/                 # resolução de empresa por slug/domínio, contexto de tema
  auth/                   # identidade sintética do cliente, staff, master
  cloudflare/             # provisionamento de domínio próprio (Custom Hostnames)
supabase/
  migrations/             # schema + RLS
```
