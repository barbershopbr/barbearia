"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { ActionState } from "../../../area-cliente/actions";
import type { PlanoPeriodo } from "@/lib/supabase/types";
import { exigirRecurso } from "@/lib/plano/recursos";

/** Cria (planoId null) ou edita um plano de assinatura. */
export async function salvarPlano(
  slug: string,
  planoId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
  const dados = { nome, valor, periodo, quantidade_cortes: quantidadeCortesRaw ? Number(quantidadeCortesRaw) : null, beneficios };
  const { error } = planoId
    ? await supabase.from("planos").update(dados).eq("id", planoId).eq("empresa_id", empresa.id)
    : await supabase.from("planos").insert({ ...dados, empresa_id: empresa.id });

  if (error) return { error: "Não foi possível salvar o plano." };

  refresh();
  return { success: "Plano salvo." };
}

export async function togglePlanoAtivo(planoId: string, ativo: boolean) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("planos").update({ ativo: !ativo }).eq("id", planoId);
  refresh();
}

export async function deletePlano(planoId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("planos").delete().eq("id", planoId);
  refresh();
}
