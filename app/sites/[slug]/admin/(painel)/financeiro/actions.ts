"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { ActionState } from "../../../area-cliente/actions";

export async function createDespesa(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const descricao = String(formData.get("descricao") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const valor = Number(formData.get("valor") ?? 0);
  const data = String(formData.get("data") ?? "").trim();

  if (!descricao || valor <= 0) return { error: "Preencha descrição e valor corretamente." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("despesas").insert({
    empresa_id: empresa.id,
    descricao,
    categoria,
    valor,
    data: data || new Date().toISOString().slice(0, 10),
  });

  if (error) return { error: "Não foi possível lançar a despesa." };

  return { success: "Despesa lançada." };
}

export async function deleteDespesa(despesaId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("despesas").delete().eq("id", despesaId);
}
