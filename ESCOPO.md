# BarberControl — Escopo do produto

Documento-guia do que o sistema terá quando estiver pronto. Legenda:
✅ já existe · 🔧 existe, precisa ajustar · 🆕 a construir.

---

## 1. BarberControl (domínio raiz `usebrcontrol.com.br`)

### Landing de vendas ✅ (cobrança no autocadastro: 🆕)
- Apresentação, benefícios, demonstração e os 3 planos com preço.
- **Autocadastro + pagamento:** a barbearia escolhe o plano, cria a conta,
  define o slug (subdomínio) e paga a assinatura recorrente → acesso liberado na hora.
- **Ícone discreto no rodapé** leva ao login Master. 🔧 Remover o botão
  "Painel Master" visível e a lista pública de barbearias.

### Planos do SaaS (mensal)
| Plano | Preço | Recursos |
|---|---|---|
| Básico | R$ 99 | Agenda, clientes, serviços, equipe |
| Pro | R$ 149 | Básico + loja, cupons, fidelidade, comissões/pote, caixa/PDV, assinaturas de clientes |
| Premium | R$ 199 | Pro + domínio próprio, várias unidades, relatórios avançados, temas extras |

Recursos são ligados/desligados por plano (feature flags por empresa). 🆕

### Painel Master
- ✅ Cadastro e status das barbearias.
- 🆕 Financeiro das assinaturas: faturas, vencimentos, inadimplência.
- 🆕 **Bloqueio automático após 10 dias de atraso**, com avisos antes
  (vencimento próximo, no vencimento e durante o atraso).
- 🆕 "Acessar como a barbearia" para suporte.
- 🆕 Métricas do SaaS: MRR, novas barbearias, cancelamentos, uso.
- 🆕 Cupons/indicação para barbearias que contratarem.
- Cobrança das barbearias pela conta Mercado Pago do BarberControl.

---

## 2. Site de cada barbearia (`{slug}.usebrcontrol.com.br` ou domínio próprio)
- ✅ **Temas prontos** (Clássico, Moderno, Minimalista) escolhidos pelo gestor em Admin → Aparência do site.
- ✅ Conteúdo editável pelo gestor: logo, favicon, capa, cores (principal,
  secundária, destaque), textos do topo, ordem/visibilidade das seções,
  galeria e **promoções em destaque** — tudo com **upload de imagens**
  (Supabase Storage, bucket `midia`). Serviços, equipe (com foto), produtos
  (com foto) e planos com criar/editar/excluir. 🆕 Avaliações.
- ✅ Página "Entrar" separando cliente e equipe.
- 🆕 **PWA**: instalável no celular com o logo da barbearia + push. Também
  funciona como site responsivo comum.

---

## 3. Login do gestor / dono
- ✅ Agenda, clientes, serviços, equipe, produtos/estoque, fornecedores,
  cupons, fidelidade, comissões, financeiro, domínio, configurações.
- 🆕 **Conectar pagamentos com passo a passo**, sem o BarberControl tocar em
  chaves: botão "Conectar Mercado Pago" (OAuth), dinheiro cai direto na conta
  da barbearia. Outros gateways no futuro.
- 🆕 Sinal / pagamento antecipado no agendamento — opcional por barbearia.
- ✅ Caixa / PDV no balcão (abrir/fechar caixa, venda de serviço + produto, cobrar atendimento da agenda, sangria/suprimento).
- 🆕 Relatórios avançados (faturamento por período/barbeiro/serviço, ticket
  médio, clientes sumidos, exportar Excel/PDF).
- 🆕 Várias unidades no mesmo login.
- ✅ Folgas, férias e feriados (bloqueios por profissional ou barbearia inteira) e pausa diária (almoço) por dia da semana.
- 🔧 Assinaturas de clientes: Pix, dinheiro ou cartão recorrente.

### Comissões (configuradas pelo dono, por funcionário)
- ✅ Percentual, fixo por serviço, diária, mensal.
- 🆕 Combinação de modelos (ex.: fixo + %).
- 🆕 % por serviço e por funcionário.
- 🆕 % sobre venda de produtos.
- 🆕 Opção de descontar taxa da maquininha antes de calcular.

### Pote das assinaturas ✅
Comissão dos barbeiros sobre atendimentos de clientes assinantes.

**Regra fixa de cálculo:**
1. Pote do mês = receita **paga** das assinaturas no mês − parte da casa.
2. Cada atendimento de assinante gera pontos (peso do serviço).
3. Fechamento no fim do mês: valor do ponto = pote ÷ total de pontos;
   cada barbeiro recebe seus pontos × valor do ponto.
4. Durante o mês o barbeiro vê uma prévia.

**Configurável pelo dono** (com padrão inicial):
| Configuração | Opções | Padrão |
|---|---|---|
| Parte da casa | % única ou % por barbeiro | 40% |
| Peso dos pontos | valor avulso / nº de atendimentos / peso manual por serviço | valor avulso |
| Pote | único ou um por plano | único |
| Sobra (sem atendimentos) | fica com a casa / divide igual / acumula p/ próximo mês | casa |
| Participação | liga/desliga por funcionário | todos os barbeiros |

Exemplo: 10 assinantes × R$100 = R$1.000; casa 40% → pote R$600.
João 18 cortes (35) + 10 barbas (25) = 880 pts; Pedro 12 + 6 = 570 pts.
Ponto = 600 ÷ 1.450 = R$0,4138 → João R$364,14 · Pedro R$235,86.

---

## 4. Login do funcionário
- ✅ O dono cria o acesso e decide, seção por seção, o que cada um vê e edita.
- 🔧 Só a própria agenda e os próprios clientes.
- 🔧 Comissões e ganhos do dia/mês (avulso + pote).
- 🆕 Bloquear os próprios horários.

---

## 5. Login do cliente
- ✅ Agendar e ver agendamentos passados e futuros.
- ✅ Comprar produto para retirar na barbearia — 🆕 escolhendo pagar online
  ou na retirada.
- 🆕 Escolher o barbeiro (foto, avaliações).
- 🆕 Remarcar/cancelar sozinho dentro do prazo definido pela barbearia.
- 🆕 Lista de espera.
- 🆕 Avaliar o atendimento.
- ✅ Fidelidade e cupons.

---

## 5b. Notas fiscais (Bling) 🔧
- ✅ Conexão por OAuth (barbearia no painel, BarberControl no Master) com passo a passo.
- 🆕 Emissão automática: NFS-e das mensalidades do SaaS; barbearia opcional para serviços,
  assinaturas e produtos.

## 6. Notificações (e-mail + push no navegador) 🆕
- Lembrete de horário.
- Confirmação / alteração / cancelamento.
- Pedido pronto para retirar.
- Promoções, aniversário, cliente sumido.
- Recuperação de senha (hoje não envia).
- Avisos de cobrança do SaaS para as barbearias.

---

## Ordem de desenvolvimento
1. **Base** — commit inicial, migrations aplicadas, provedor de e-mail, feature flags por plano.
2. **Venda do SaaS** — landing, autocadastro, cobrança recorrente, financeiro + bloqueio no Master.
3. **Site da barbearia** — temas, upload de imagens, promoções, PWA.
4. **Pagamentos da barbearia** — Mercado Pago OAuth, loja online, sinal, assinaturas de clientes + pote.
5. **Operação** — caixa/PDV, folgas, agenda/ganhos do barbeiro, várias unidades.
6. **Experiência do cliente** — escolher barbeiro, remarcar, lista de espera, avaliações, notificações.
7. **Relatórios avançados e métricas do SaaS.**
