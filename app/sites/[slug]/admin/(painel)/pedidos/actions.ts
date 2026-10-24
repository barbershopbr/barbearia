"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { creditarPontosPedido } from "@/lib/fidelidade/creditar";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";
import { SEM_EMAIL_SUFIXO } from "@/lib/auth/cliente-identity";
import { tenantOrigin } from "@/lib/tenant/domain";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email/send";

/**
 * Fluxo da retirada na barbearia:
 *   pendente → pronto (separado) → retirado e pago (baixa estoque, credita pontos)
 *   e cancelar em qualquer ponto antes da retirada.
 */

/** Carrega o pedido com a sessão de quem está no painel (a RLS garante que é da empresa dele). */
async function carregarPedido(pedidoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pagamentos")
    .select("id, empresa_id, cliente_id, valor, status, separado, tipo, retirado_em")
    .eq("id", pedidoId)
    .eq("tipo", "produto")
    .maybeSingle();
  return data;
}

export async function marcarPedidoPronto(pedidoId: string, pronto: boolean) {
  await exigirEdicao("pedidos");
  const pedido = await carregarPedido(pedidoId);
  if (!pedido || pedido.status !== "pendente") return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("pagamentos").update({ separado: pronto }).eq("id", pedidoId);

  if (pronto) {
    // Aviso por e-mail (best-effort; cliente de balcão sem e-mail não recebe).
    const admin = createSupabaseServiceRoleClient();
    const [{ data: cliente }, { data: empresa }] = await Promise.all([
      admin.from("clientes").select("nome, email").eq("id", pedido.cliente_id).maybeSingle(),
      admin.from("empresas").select("nome, slug, endereco").eq("id", pedido.empresa_id).maybeSingle(),
    ]);
    if (cliente && empresa && !cliente.email.endsWith(SEM_EMAIL_SUFIXO)) {
      const valor = `R$ ${Number(pedido.valor).toFixed(2).replace(".", ",")}`;
      await sendEmail({
        to: cliente.email,
        fromName: empresa.nome,
        subject: `Seu pedido está pronto para retirada — ${empresa.nome}`,
        text: `Olá, ${cliente.nome}! Seu pedido na ${empresa.nome} está pronto. Valor: ${valor} (pagamento na retirada).${empresa.endereco ? `\nEndereço: ${empresa.endereco}` : ""}`,
        html: emailLayout({
          titulo: "Seu pedido está pronto!",
          corpo: `<p>Olá, ${escapeHtml(cliente.nome)}! Seu pedido na <strong>${escapeHtml(empresa.nome)}</strong> já pode ser retirado.</p>
<p>Valor: <strong>${valor}</strong> — pagamento na retirada.</p>${empresa.endereco ? `<p>Endereço: ${escapeHtml(empresa.endereco)}</p>` : ""}`,
          botao: { texto: "Ver meus pedidos", url: `${tenantOrigin(empresa.slug)}/area-cliente/pagamentos` },
        }),
      });
    }
  }
  refresh();
}

export async function marcarPedidoRetirado(pedidoId: string) {
  await exigirEdicao("pedidos");
  const pedido = await carregarPedido(pedidoId);
  if (!pedido || pedido.status !== "pendente") return;

  const supabase = await createSupabaseServerClient();
  const { data: atualizado } = await supabase
    .from("pagamentos")
    .update({ status: "pago", separado: true, retirado_em: new Date().toISOString(), pago_em: new Date().toISOString() })
    .eq("id", pedidoId)
    .eq("status", "pendente") // evita baixar o estoque duas vezes em cliques repetidos
    .select("id")
    .maybeSingle();
  if (!atualizado) return;

  // Baixa de estoque e pontos rodam como servidor: quem cuida dos pedidos nem
  // sempre tem permissão de editar produtos (RLS por seção).
  const admin = createSupabaseServiceRoleClient();
  const { data: itens } = await admin.from("pagamento_itens").select("produto_id, quantidade").eq("pagamento_id", pedidoId);
  for (const item of itens ?? []) {
    const { data: produto } = await admin.from("produtos").select("estoque_atual").eq("id", item.produto_id).maybeSingle();
    if (!produto) continue;
    await admin
      .from("produtos")
      .update({ estoque_atual: Math.max(0, produto.estoque_atual - item.quantidade) })
      .eq("id", item.produto_id);
    await admin.from("estoque_movimentacoes").insert({
      empresa_id: pedido.empresa_id,
      produto_id: item.produto_id,
      tipo: "saida",
      quantidade: item.quantidade,
      motivo: "Venda — pedido da loja",
    });
  }

  await creditarPontosPedido(admin, {
    empresaId: pedido.empresa_id,
    clienteId: pedido.cliente_id,
    pedidoId,
    valor: Number(pedido.valor),
  });
  refresh();
}

export async function cancelarPedido(pedidoId: string) {
  await exigirEdicao("pedidos");
  const pedido = await carregarPedido(pedidoId);
  if (!pedido || pedido.status !== "pendente") return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("pagamentos").update({ status: "cancelado" }).eq("id", pedidoId).eq("status", "pendente");
  refresh();
}
