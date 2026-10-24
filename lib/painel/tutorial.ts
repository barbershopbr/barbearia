import type { PassoTour } from "@/components/tour-painel";

/**
 * Roteiro do tutorial do painel da barbearia. `alvo` é o data-tour do item
 * do menu ("nav-<seção>"); passos de seções que a pessoa não vê (permissão
 * ou plano) são pulados sozinhos pelo TourPainel.
 */
export function passosTutorial(nomeBarbearia: string): PassoTour[] {
  return [
    {
      titulo: `Bem-vindo ao painel da ${nomeBarbearia}!`,
      texto: "Em 1 minuto mostramos onde fica cada coisa. Use \"Próximo\" para seguir ou \"Pular tutorial\" se já conhece.",
    },
    { alvo: "nav-site", titulo: "Aparência do site", texto: "Logo, fotos, cores, tema e o que aparece na página da sua barbearia." },
    { alvo: "nav-servicos", titulo: "Serviços", texto: "Cadastre os serviços com preço e duração. É o que o cliente escolhe ao agendar." },
    {
      alvo: "nav-funcionarios",
      titulo: "Equipe",
      texto: "Cadastre os barbeiros com foto. Em \"Acessos ao painel\" você cria o login de cada um e decide o que ele pode ver e editar.",
    },
    {
      alvo: "nav-configuracoes",
      titulo: "Configurações",
      texto: "Horário de funcionamento, pausa do almoço, endereço e WhatsApp da barbearia.",
    },
    { alvo: "nav-agenda", titulo: "Agenda", texto: "Os atendimentos do dia. Aqui você também bloqueia folgas, férias e feriados." },
    { alvo: "nav-caixa", titulo: "Caixa", texto: "Venda no balcão: abra o caixa, toque nos serviços e produtos e receba em dinheiro, Pix ou cartão. No fim do dia, feche e confira." },
    { alvo: "nav-clientes", titulo: "Clientes", texto: "Todos os clientes, com histórico. Dá para cadastrar quem chega no balcão." },
    { alvo: "nav-produtos", titulo: "Produtos", texto: "A loja: produtos com foto, preço e estoque. O cliente compra pelo site e retira aqui." },
    { alvo: "nav-pedidos", titulo: "Pedidos da loja", texto: "Marque o pedido como pronto (o cliente é avisado) e depois como retirado." },
    { alvo: "nav-planos", titulo: "Planos de assinatura", texto: "Crie o clube de assinatura da barbearia e tenha receita todo mês." },
    { alvo: "nav-pote", titulo: "Pote das assinaturas", texto: "Como os barbeiros recebem pelos atendimentos de assinantes: o pote do mês é dividido pelos pontos de cada um." },
    {
      alvo: "nav-pagamentos",
      titulo: "Recebimentos",
      texto: "Conecte o seu Mercado Pago para receber Pix e cartão direto na sua conta. É só um clique.",
    },
    { alvo: "nav-notas-fiscais", titulo: "Notas fiscais", texto: "Opcional: conecte o Bling para emitir nota fiscal dos pagamentos." },
    { alvo: "nav-inicio", titulo: "Início", texto: "Aqui você acompanha o dia: atendimentos, faturamento e os próximos clientes." },
    {
      alvo: "ver-site",
      titulo: "Pronto!",
      texto: "Abra o seu site para ver como os clientes enxergam e mande o link para eles. Para rever este tutorial, use \"Ver tutorial\" no menu.",
    },
  ];
}
