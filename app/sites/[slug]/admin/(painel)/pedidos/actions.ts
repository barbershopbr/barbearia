"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { creditarPontosPedido } from "@/lib/fidelidade/creditar";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";

export async function toggleSeparado(pagamentoId: string, separado: boolean) {
  await exigirEdicao("pedidos");
  const supabase = await createSupabaseServerClient();
  const { data: pagamento } = await supabase
    .from("pagamentos")
    .update({ separado: !separado })
    .eq("id", pagamentoId)
    .select("empresa_id, cliente_id, valor, tipo")
    .maybeSingle();

  // Credita pontos só na transição para "separado" (não ao desmarcar). O
  // índice único parcial de fidelidade_pontos evita duplicar se marcar/desmarcar.
  if (!pagamento || separado || pagamento.tipo !== "produto") return;

  await creditarPontosPedido(supabase, {
    empresaId: pagamento.empresa_id,
    clienteId: pagamento.cliente_id,
    pedidoId: pagamentoId,
    valor: Number(pagamento.valor),
  });
}
