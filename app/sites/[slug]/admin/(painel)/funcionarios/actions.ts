"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { ActionState } from "../../../area-cliente/actions";

export async function createFuncionario(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const nome = String(formData.get("nome") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const fotoUrl = String(formData.get("foto_url") ?? "").trim() || null;
  const especialidades = String(formData.get("especialidades") ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!nome) return { error: "Informe o nome." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("funcionarios").insert({
    empresa_id: empresa.id,
    nome,
    bio,
    foto_url: fotoUrl,
    especialidades,
  });

  if (error) return { error: "Não foi possível cadastrar o funcionário." };

  return { success: "Funcionário cadastrado." };
}

export async function toggleFuncionarioAtivo(funcionarioId: string, ativo: boolean) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("funcionarios").update({ ativo: !ativo }).eq("id", funcionarioId);
}

export async function deleteFuncionario(funcionarioId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("funcionarios").delete().eq("id", funcionarioId);
}
