# Contexto do projeto (handoff entre máquinas)

Resumo das decisões e do ponto em que paramos — carregado automaticamente pelo
Claude Code via `CLAUDE.md`. O escopo completo do produto está em `ESCOPO.md`.

## Estado do código (2026-10-24)
- Next 16 + Supabase + OpenNext/Cloudflare. `npx tsc` passa sem erros.
- Código de produto parado desde 2026-08-30; infra recriada em 2026-10-24 (ver abaixo).
- Já existe: painel admin completo da barbearia, área do cliente, site público
  por tenant, Master básico (só cadastro/status das barbearias), 9 migrations
  com RLS.
- Reset de senha não envia e-mail (TODO em `app/sites/[slug]/area-cliente/actions.ts`).

## Contas novas (configuradas em 2026-10-24)
- **Supabase**: projeto `ifaqsuxxrinpgzfvqvva` (São Paulo, pooler `aws-1-sa-east-1`).
  `.env.local` atualizado; as 9 migrations aplicadas via `supabase db push`;
  24 tabelas, todas com RLS (sem policy = só service_role). Nenhum bucket de storage ainda.
- **Cloudflare**: `wrangler login` feito (conta endrew.barbershop@gmail.com,
  account id `04f4e235c2c8d500c9c13325eece62aa`). KV `TENANT_DOMAINS` criado
  (ids no `wrangler.jsonc`). Nada publicado ainda.
- **Domínio** `usebrcontrol.com.br`: ativo no Registro.br (vence 2027-08-03), DNS
  ainda no Registro.br (`auto.dns.br`) com DNSSEC ligado — desligar DNSSEC antes
  de trocar os nameservers para a Cloudflare.
- Hospedagem: **Cloudflare**. Faltam **Mercado Pago** (etapa 2) e Resend (chave).

## Deploy de teste (2026-10-24)
- Worker `usebrcontrol` em https://usebrcontrol.usebrcontrol.workers.dev (modo por
  caminho: `/master/login`, `/sites/{slug}`, `/sites/{slug}/admin/login`).
- Vars públicas no `wrangler.jsonc` (inclui `APP_ORIGIN` — remover quando o DNS do
  domínio apontar pro Worker). Secret: `SUPABASE_SERVICE_ROLE_KEY`.
- Deploy: `npm run cf:deploy`. Migrations: `npx supabase db push --db-url ...`
  (pooler `aws-1-sa-east-1`, usuário `postgres.ifaqsuxxrinpgzfvqvva`).
- Contas de teste: Master `endrew.barbershop@gmail.com`; barbearia `barbearia-teste`
  (Premium) com dono `endrew.barbershop+teste@gmail.com`. Senhas passadas no chat.

## Primeira barbearia real: Alpha Barbershop (2026-10-24)
- Slug `alpha` (Premium), Sorocaba. Dados reais vindos do Booksy
  (booksy.com/pt-br/333971_alpha-barbershop...): endereço, serviços/preços,
  barbeiros Ibson Calebe e Diego Alencar. Instagram `_alpha_barbershop_`.
- **Provisório, trocar:** login do dono (`endrew.barbershop+alpha@gmail.com`),
  banner (Unsplash), produtos "(exemplo)", plano "Assinatura Alpha" R$99,90,
  horários seg–sáb 09–18 (Booksy mostra almoço 13–14; agenda ainda não tem pausa),
  sem logo/telefone.
- O sistema de assinatura deles hoje: serviços R$1 "para assinantes" no Booksy.

## Etapa 1 (Base) — feito
- Plano do SaaS por empresa (`plano_saas` + `recursos_extras`), mapa em
  `lib/plano/recursos.ts`; Master escolhe plano e exceções.
- E-mail: `lib/email/send.ts` (Resend REST). Reset de senha do cliente envia e-mail.
- **Pendente:** `RESEND_API_KEY` (secret) e `EMAIL_FROM` com domínio verificado no
  Resend; mover DNS do domínio para a Cloudflare.

## Site personalizável (2026-10-24)
- Admin → **Aparência do site** (`/admin/site`): tema, logo/favicon/capa (upload),
  cores, textos do topo, seções (ordem/visibilidade), galeria, promoções.
  Config em `empresas.site_config` (ler sempre via `lerSiteConfig`, lib/site/config.ts).
- Upload direto do navegador pro Storage (`components/image-upload.tsx`), pasta
  `{empresa_id}/...`; policy só deixa staff da própria empresa gravar (testado).
- Serviços, funcionários, produtos e planos agora têm **Editar**. Actions novas
  chamam `refresh()` de `next/cache` (Next 16) para atualizar a tela.

## Equipe e permissões (2026-10-24)
- Funcionários → **Acessos ao painel**: dono cria login (barbeiro/recepcionista/admin),
  vincula ao perfil, troca senha/papel, bloqueia. **Permissões por pessoa e por seção**
  (sem acesso / ver / ver e editar) em `usuarios_empresa.permissions.secoes`; papel é só
  o modelo inicial (`lib/auth/papeis.ts`). Owner/admin sempre tudo.
- Aplicação: layout do admin (menu + redirect + aviso "só ver", via header `x-pathname`
  do middleware) e `exigirEdicao(secao)` no início de toda action de escrita do admin.
- **RLS por permissão** (migration 20261024000004): funções `auth_staff_nivel`/`auth_staff_pode`
  (espelham `permissoesDe` — manter em sincronia) + policies restritivas em despesas, comissões,
  regras, fornecedores, cupons, produtos/estoque e agendamentos. Testado com sessões reais.
- Permissão extra `agenda-equipe`: sem ela, a pessoa só vê/mexe na própria agenda (perfil
  vinculado). Agenda com filtro por dia/profissional e total previsto.
- Concluir atendimento: pontos e comissão gerados com service role (após checar permissão).
- Clientes: cadastro no balcão (com/sem e-mail), edição, busca, atendimentos/última visita.

## Agenda do cliente (2026-10-24)
- **Bug corrigido:** reserva dupla — disponibilidade lia agendamentos com a sessão do cliente
  (RLS só mostra os dele). Agora RPC `horarios_ocupados` (definer, só intervalos) + constraint
  `agendamentos_sem_sobreposicao` (exclude gist; erro 23P01 → mensagem amigável).
- Cliente cancela/remarca até 2h antes (`lib/agenda/regras-cliente.ts`); remarcar libera o
  horário antigo antes e devolve se falhar. `/agendar?barbeiro=&servico=&remarcar=`.
- Landing de vendas em `/` e autocadastro em `/cadastro` (`lib/tenant/nova-empresa.ts`).
  Cobrança do plano ainda não entra no fluxo (depende do Mercado Pago).

## Folgas e pausas (2026-10-24)
- `bloqueios_agenda` (profissional ou barbearia inteira; RLS: própria agenda ou agenda-equipe) e
  pausa diária em `empresas.horarios[dia].pausa_inicio/pausa_fim`. RPC `horarios_ocupados` inclui
  bloqueios; `getAvailableSlots` desconta a pausa. Alpha com almoço 13–14 (dado do Booksy).

## Próximos passos
1. **Etapa 2 (Venda do SaaS)** do `ESCOPO.md`.

## Git
- Repo privado: https://github.com/barbershopbr/barbearia (branch `main`), commit inicial em 2026-10-24.
- Commits sempre como `barbershopbr <endrew.barbershop@gmail.com>`.
- `.gitattributes` força LF; `Segurança.txt`, `.env*` e `.claude-contexto/` ficam fora do repo.

## Decisões de produto (resumo — detalhes em ESCOPO.md)
- Landing de vendas do BarberControl com **ícone discreto no rodapé** para o login Master; remover a lista pública de barbearias.
- Barbearia contrata por **autocadastro + pagamento recorrente**. Planos: **Básico R$99, Pro R$149, Premium R$199**. **Bloqueio após 10 dias de atraso**.
- Master: financeiro das assinaturas, bloqueio automático, "acessar como a barbearia", métricas SaaS, cupons do SaaS.
- Pagamentos: cada barbearia conecta a própria conta sozinha com passo a passo (Mercado Pago via OAuth primeiro, outros depois). Loja: pagar online ou na retirada. Sinal no agendamento opcional por barbearia.
- Site da barbearia: temas prontos + conteúdo editável (upload de imagens, promoções, produtos com foto). PWA + site responsivo.
- Gestor: caixa/PDV, relatórios avançados, várias unidades, folgas/bloqueios.
- Barbeiro: só a própria agenda, comissões e ganhos (avulso + pote), bloquear próprios horários.
- Cliente: escolher barbeiro, avaliar, remarcar/cancelar, lista de espera.
- Notificações: e-mail (Resend) + push no navegador. Sem WhatsApp.
- **Pote das assinaturas**: regra fixa (pote = assinaturas pagas − % da casa, dividido por pontos, fechamento mensal com prévia); todas as variantes configuráveis pelo dono.

## Ao chegar na máquina nova
- Instalar Node.js (LTS) e rodar `npm install` (não precisa copiar `node_modules` nem `.next`).
- O histórico bruto da conversa anterior está em `.claude-contexto/` (backup; não versionar).
