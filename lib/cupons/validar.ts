import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { empresaTemRecurso } from "@/lib/plano/recursos";

export type CupomValidado = {
  id: string;
  tipoDesconto: "percentual" | "valor_fixo";
  valor: number;
  /** Desconto em reais já calculado sobre o subtotal informado (nunca maior que o subtotal). */
  desconto: number;
};

/**
 * Valida um código de cupom para uma empresa e já calcula o desconto sobre o
 * subtotal. Passa pela função SQL `validar_cupom` (SECURITY DEFINER) — o
 * cliente comum não consegue ler a tabela `cupons` diretamente (só staff),
 * então toda a checagem de validade/limite de uso mora no banco.
 *
 * Retorna `{}` quando `codigo` está vazio (nenhum cupom aplicado, sem erro).
 */
export async function validarEComputarCupom(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  codigo: string,
  subtotal: number,
): Promise<{ cupom?: CupomValidado; erro?: string }> {
  const cod = codigo.trim();
  if (!cod) return {};

  if (!(await empresaTemRecurso(supabase, empresaId, "cupons"))) {
    return { erro: "Esta barbearia não aceita cupons." };
  }

  const { data, error } = await supabase.rpc("validar_cupom", {
    p_empresa_id: empresaId,
    p_codigo: cod,
  });

  if (error) return { erro: "Não foi possível validar o cupom." };

  const row = data?.[0];
  if (!row || !row.id || !row.tipo_desconto || row.valor == null) {
    return { erro: row?.motivo ?? "Cupom inválido." };
  }

  const tipoDesconto = row.tipo_desconto as "percentual" | "valor_fixo";
  const valor = Number(row.valor);
  const bruto = tipoDesconto === "percentual" ? (subtotal * valor) / 100 : valor;
  const desconto = Math.min(Math.max(bruto, 0), subtotal);

  return { cupom: { id: row.id, tipoDesconto, valor, desconto } };
}
