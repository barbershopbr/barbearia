import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Baixa de estoque por venda (pedido retirado ou venda no PDV) com registro
 * da saída. Recebe o client de service role: quem vende nem sempre tem
 * permissão de editar produtos (RLS por seção). Estoque nunca fica negativo.
 */
export async function baixarEstoque(
  admin: SupabaseClient<Database>,
  empresaId: string,
  itens: { produto_id: string | null; quantidade: number }[],
  motivo: string,
): Promise<void> {
  for (const item of itens) {
    if (!item.produto_id) continue;
    const { data: produto } = await admin
      .from("produtos")
      .select("estoque_atual")
      .eq("id", item.produto_id)
      .eq("empresa_id", empresaId)
      .maybeSingle();
    if (!produto) continue;
    await admin
      .from("produtos")
      .update({ estoque_atual: Math.max(0, produto.estoque_atual - item.quantidade) })
      .eq("id", item.produto_id);
    await admin.from("estoque_movimentacoes").insert({
      empresa_id: empresaId,
      produto_id: item.produto_id,
      tipo: "saida",
      quantidade: item.quantidade,
      motivo,
    });
  }
}
