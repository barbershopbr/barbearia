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

## Próximos passos
1. **Etapa 1 (Base)** do `ESCOPO.md`.

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
