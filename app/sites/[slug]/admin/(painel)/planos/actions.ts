"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { ActionState } from "../../../area-cliente/actions";
import type { PlanoPeriodo } from "@/lib/supabase/types";
import { exigirRecurso } from "@/lib/plano/recursos";

export async function createPlano(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  exigirRecurso(empresa, "assinaturas");

  const nome = String(formData.get("nome") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const periodo = String(formData.get("periodo") ?? "mensal") as PlanoPeriodo;
  const quantidadeCortesRaw = String(formData.get("quantidade_cortes") ?? "").trim();
  const beneficios = String(formData.get("beneficios") ?? "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  if (!nome || valor <= 0) return { error: "Informe nome e um valor válido." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("planos").insert({
    empresa_id: empresa.id,
    nome,
    valor,
    periodo,
    quantidade_cortes: quantidadeCortesRaw ? Number(quantidadeCortesRaw) : null,
    beneficios,
  });

  if (error) return { error: "Não foi possível criar o plano." };

  return { success: "Plano criado." };
}

export async function togglePlanoAtivo(planoId: string, ativo: boolean) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("planos").update({ ativo: !ativo }).eq("id", planoId);
}

export async function deletePlano(planoId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("planos").delete().eq("id", planoId);
}
