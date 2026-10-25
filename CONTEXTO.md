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

## Produção (2026-10-24)
- **No ar em https://usebrcontrol.com.br** (DNS na Cloudflare: nameservers bill/kenia; registros A
  proxied 192.0.2.1 no apex e em `*`; rotas do Worker `usebrcontrol.com.br/*` e `*.usebrcontrol.com.br/*`).
  `master.usebrcontrol.com.br`, `{slug}.usebrcontrol.com.br`. workers.dev segue ativo (sem APP_ORIGIN
  os links dele apontam para os subdomínios).
- Secrets do Worker: `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDFLARE_API_TOKEN` (token de zona: DNS,
  Workers Routes, SSL). Não pôr esse token no .env.local (o wrangler passaria a usá-lo no deploy).
- Deploy: `npm run cf:deploy`. Migrations: `npx supabase db push --db-url ...`
  (pooler `aws-1-sa-east-1`, usuário `postgres.ifaqsuxxrinpgzfvqvva`).
- Contas de teste: Master `endrew.barbershop@gmail.com`; `barbearia-teste` (Premium) com dono
  `endrew.barbershop+teste@gmail.com`. Senhas passadas no chat.

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
- **Ficha do funcionário** (2026-10-25) em `/admin/funcionarios/[id]`: contato, CPF, contrato,
  salário fixo, dia de pagamento, Pix — tabela protegida `funcionarios_dados` (NUNCA em
  `funcionarios`, que é pública). Mostra resumo do mês (atendimentos, faturado, comissões,
  total a receber, avaliação) e "quanto recebe por serviço" + editor da regra de comissão.
- **Menu do painel agrupado** por categoria (`GRUPOS` em `admin/(painel)/layout.tsx`,
  `components/menu-painel.tsx`); o tutorial abre o grupo antes de destacar o item.
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

## Loja com retirada (2026-10-24)
- Pedido: pendente (pagamento `na_retirada`) → pronto (`separado`, e-mail ao cliente) → retirado e
  pago (`status=pago`, `retirado_em`, baixa de estoque + pontos via service role) ou cancelado.
- Cliente vê "Meus pedidos" com a etapa. Financeiro conta venda só quando paga.

## Recebimentos e notas fiscais (2026-10-24)
- **Mercado Pago (OAuth marketplace):** cada barbearia conecta a PRÓPRIA conta em Admin →
  Recebimentos. Retorno fixo `https://usebrcontrol.com.br/api/mercadopago/callback` (state HMAC).
  Tokens cifrados (AES-GCM, secret `APP_SECRET` do Worker — se trocar, todos reconectam).
  Preferências em `empresas.pagamentos_config`. **Falta:** `MP_CLIENT_ID`/`MP_CLIENT_SECRET`
  (aplicação única do BarberControl) e o fluxo de cobrança (Pix/cartão/sinal/assinatura + webhooks).
- **Bling (notas fiscais):** opcional por barbearia (Admin → Notas fiscais, passo a passo + OAuth) e
  conta do BarberControl no Master (notas das mensalidades). Tabelas `integracoes` (empresa_id null =
  BarberControl) e `notas_fiscais`. Retorno `/api/bling/callback`. **Falta:** `BLING_CLIENT_ID`/
  `BLING_CLIENT_SECRET` e a emissão em si (disparada quando os pagamentos online existirem).
  Refresh token do Bling vence em 30 dias sem uso — prever renovação periódica (cron).

## Site como mini e-commerce + tutorial (2026-10-24)
- Site da barbearia: barra fixa (Agendar, Produtos, Meus horários, conta, carrinho com total),
  bloco do cliente logado (próximos horários + pedidos), loja com categorias e "Esgotado"
  (`produtos_publicos.disponivel`/`categoria_nome`).
- Tutorial guiado do painel (`components/tour-painel.tsx`, roteiro em `lib/painel/tutorial.ts`):
  abre no 1º acesso de cada pessoa (`usuarios_empresa.tutorial_visto_em`), Próximo/Voltar/Pular,
  destaque com zoom nos itens `data-tour="nav-<seção>"`; "Ver tutorial" no menu reabre.
  Item novo no menu → incluir passo no roteiro.

## Pote das assinaturas (2026-10-24)
- Cálculo puro em `lib/comissoes/pote-calculo.ts` (testado com o exemplo do ESCOPO e variações);
  dados/fechamento em `lib/comissoes/pote.ts`. Config em `empresas.pote_config`.
- Mensalidade registrada no balcão (Admin → Assinaturas → Registrar pagamento) gera
  `pagamentos` tipo assinatura com `pago_em`; empurra `data_proxima_cobranca`.
- Ao concluir atendimento de cliente com assinatura ativa e pote ligado: grava
  `agendamentos.assinatura_id` e NÃO gera comissão avulsa (corrige o pagamento em dobro).
  Financeiro/dashboard não somam esses atendimentos como faturamento de serviço.
- Fechamento mensal (`pote_fechamentos`) gera comissões tipo "assinatura"; reabrir apaga se nada foi pago.
  Barbeiro vê a prévia em Meu histórico.

## Caixa / PDV (2026-10-24)
- `caixas` (um aberto por empresa), `caixa_movimentos` (sangria/suprimento), vendas como
  `pagamentos.tipo = balcao` com `caixa_id` (cliente opcional) e itens de serviço/produto.
- "Agenda de hoje" no PDV cobra o atendimento (`pagamento_itens.agendamento_id`, único): conclui e
  gera comissão/pote/pontos por `lib/agenda/concluir.ts` (mesmo caminho da agenda) — sem dobrar.
- Helpers: `lib/estoque/baixar.ts`, `lib/comissoes/avulsa.ts`. Financeiro soma "Vendas no caixa" e
  tira da receita da agenda os atendimentos cobrados no caixa.
- Teste de actions por HTTP: FormData do encodeReply usa prefixo `_1_` (não `1_`).

## Master: cobrança do SaaS, métricas e suporte (2026-10-24)
- `faturas_saas` (uma por empresa/mês). Rotina SQL `rotina_cobranca_saas()` via **pg_cron diário 06:00**:
  gera faturas (respeita `saas_isento_ate`), bloqueia com >10 dias de atraso (`bloqueio_motivo =
  inadimplencia`) e desbloqueia ao pagar. Bloqueio manual do Master = `manual` (não desfaz sozinho).
  Testada em transação com datas simuladas.
- **Decisão provisória:** autocadastro ganha 30 dias sem fatura; barbearias existentes também
  (até 2026-11-23). Ajustar quando houver cobrança online/decisão de teste grátis.
- Master → Faturas (baixa manual, cancelar, rodar rotina), Métricas (MRR, ativas, cortesia, atraso,
  uso 30 dias), e na barbearia: dia de vencimento, cortesia e **acessar como** (magic link do owner →
  `/suporte` no subdomínio; auditoria em `master_acessos`; faixa "modo suporte").
- Painel da barbearia: aviso de mensalidade (5 dias antes / vencida) e tela de bloqueio.
- Contato de suporte em `lib/plataforma.ts`.

## PWA (2026-10-24)
- `/manifest` e `/icone` por barbearia (rotas em app/sites/[slug]; sem extensão porque o middleware
  ignora caminhos com ponto). `public/sw.js` (sem cache de páginas; já trata push/notificationclick).

## Avaliações e lista de espera (2026-10-24)
- `avaliacoes` (cliente avalia atendimento concluído; RLS confere) + view `avaliacoes_publicas`
  (primeiro nome). Site: seção "Avaliações" + nota por barbeiro. Admin → Avaliações (responder/ocultar).
- `lista_espera`: dia sem horário → "Me avise". Cancelamento (cliente, remarcar ou equipe) chama
  `lib/agenda/lista-espera.ts` → e-mail + status avisado. Agenda do admin mostra a lista do dia.

## Comissões avançadas (2026-10-24)
- Cálculo puro em `lib/comissoes/calculo.ts` (testado). `regras_comissao` + fixo_adicional,
  percentual_produto, descontar_taxa; exceções em `regras_comissao_servico`; taxas em
  `empresas.taxas_pagamento`. PDV: produto pode ter "vendido por" (comissão de produto).
- Atenção em scripts: insert em lote no PostgREST com colunas diferentes por linha manda null.

## Relatórios e segurança (2026-10-24)
- Admin → Relatórios (Premium, recurso `relatorios`): `lib/relatorios/dados.ts`, CSV em
  `/admin/relatorios/exportar` (formato Excel BR), imprimir/PDF.
- Limite de tentativas por IP (`lib/seguranca/limite.ts`, KV prefixo `rl:`) em logins (equipe 10/10min,
  cliente 10/10min, Master 5/15min), cadastro de cliente 5/h, autocadastro 3/h, reset de senha 5/h.
- Cabeçalhos de segurança em next.config.ts (X-Frame-Options, nosniff, HSTS, Referrer/Permissions-Policy).

## Notificações push (2026-10-24)
- Web Push próprio (`lib/push/webpush.ts`, WebCrypto: aes128gcm RFC 8291 + VAPID ES256), validado contra
  `http_ece` e com verificação da assinatura. Chaves: var `VAPID_PUBLIC_KEY` + secret `VAPID_PRIVATE_KEY`
  (cópia das chaves só no scratchpad da sessão; se perder, gerar novas — inscrições antigas param).
- `push_inscricoes` (cliente ou equipe). Botão "Ativar notificações" na área do cliente e no menu do painel.
- Eventos: pedido pronto e vaga da lista de espera (cliente); novo agendamento/remarcação pelo site e
  cancelamento pelo cliente (barbeiro do atendimento + dono/admins). 404/410 apaga a inscrição.

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
