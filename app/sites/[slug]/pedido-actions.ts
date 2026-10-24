"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { validarEComputarCupom } from "@/lib/cupons/validar";
import type { CartItem } from "@/lib/cart/cart-context";
import { temRecurso } from "@/lib/plano/recursos";

export async function criarPedido(
  slug: string,
  itens: CartItem[],
  codigoCupom = "",
): Promise<{ error?: string; success?: string }> {
  if (itens.length === 0) return { error: "Carrinho vazio." };

  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  if (!temRecurso(empresa, "loja")) return { error: "Esta barbearia não vende produtos online." };

  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) return { error: "Faça login para finalizar o pedido." };

  // Nunca confia no preço vindo do carrinho (client-side) — sempre revalida
  // contra o preço/ativo atual do produto no banco antes de gravar o pedido.
  const supabase = await createSupabaseServerClient();
  const produtoIds = itens.map((i) => i.produtoId);
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, preco, ativo")
    .eq("empresa_id", empresa.id)
    .in("id", produtoIds);

  const produtoPorId = new Map((produtos ?? []).map((p) => [p.id, p]));
  const itensValidos = itens.filter((i) => produtoPorId.get(i.produtoId)?.ativo);

  if (itensValidos.length === 0) {
    return { error: "Os produtos do carrinho não estão mais disponíveis." };
  }

  const subtotal = itensValidos.reduce(
    (soma, i) => soma + Number(produtoPorId.get(i.produtoId)!.preco) * i.quantidade,
    0,
  );

  // Revalida o cupom no servidor (o preview do carrinho não é confiável).
  const { cupom, erro: erroCupom } = await validarEComputarCupom(supabase, empresa.id, codigoCupom, subtotal);
  if (erroCupom) return { error: erroCupom };

  const desconto = cupom?.desconto ?? 0;
  const valorTotal = Math.max(subtotal - desconto, 0);

  const { data: pagamento, error: pagamentoError } = await supabase
    .from("pagamentos")
    .insert({
      empresa_id: empresa.id,
      cliente_id: cliente.id,
      tipo: "produto",
      valor: valorTotal,
      desconto,
      cupom_id: cupom?.id ?? null,
      metodo: "pix", // provisório — a escolha real de método vem com o gateway (Fase B)
      status: "pendente",
    })
    .select("id")
    .single();

  if (pagamentoError || !pagamento) return { error: "Não foi possível registrar o pedido." };

  if (cupom) {
    await supabase.from("cupom_usos").insert({
      empresa_id: empresa.id,
      cupom_id: cupom.id,
      cliente_id: cliente.id,
      referencia_tipo: "pedido",
      referencia_id: pagamento.id,
      valor_desconto: desconto,
    });
  }

  const { error: itensError } = await supabase.from("pagamento_itens").insert(
    itensValidos.map((i) => ({
      pagamento_id: pagamento.id,
      produto_id: i.produtoId,
      quantidade: i.quantidade,
      preco_unitario: Number(produtoPorId.get(i.produtoId)!.preco),
    })),
  );

  if (itensError) {
    await supabase.from("pagamentos").delete().eq("id", pagamento.id);
    return { error: "Não foi possível registrar os itens do pedido." };
  }

  return { success: "Pedido enviado! A barbearia vai preparar e avisar quando estiver pronto." };
}
