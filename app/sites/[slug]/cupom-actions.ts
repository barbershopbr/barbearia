"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { validarEComputarCupom } from "@/lib/cupons/validar";

/**
 * Valida um cupom para o site público (agendamento / carrinho) e devolve
 * apenas o valor de desconto — usado para o preview antes de confirmar. A
 * gravação sempre revalida no servidor (createAgendamento / criarPedido).
 */
export async function validarCupom(
  slug: string,
  codigo: string,
  subtotal: number,
): Promise<{ desconto?: number; erro?: string }> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { erro: "Barbearia não encontrada." };

  const supabase = await createSupabaseServerClient();
  const { cupom, erro } = await validarEComputarCupom(supabase, empresa.id, codigo, subtotal);
  if (erro) return { erro };
  if (!cupom) return {};
  return { desconto: cupom.desconto };
}
