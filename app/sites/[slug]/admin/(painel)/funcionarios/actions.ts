"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { ActionState } from "../../../area-cliente/actions";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";

/** Cria (funcionarioId null) ou edita o perfil público de um funcionário. */
export async function salvarFuncionario(
  slug: string,
  funcionarioId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await exigirEdicao("funcionarios");
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
  const dados = { nome, bio, foto_url: fotoUrl, especialidades };
  const { error } = funcionarioId
    ? await supabase.from("funcionarios").update(dados).eq("id", funcionarioId).eq("empresa_id", empresa.id)
    : await supabase.from("funcionarios").insert({ ...dados, empresa_id: empresa.id });

  if (error) return { error: "Não foi possível salvar o funcionário." };

  refresh();
  return { success: "Funcionário salvo." };
}

export async function toggleFuncionarioAtivo(funcionarioId: string, ativo: boolean) {
  await exigirEdicao("funcionarios");
  const supabase = await createSupabaseServerClient();
  await supabase.from("funcionarios").update({ ativo: !ativo }).eq("id", funcionarioId);
  refresh();
}

export async function deleteFuncionario(funcionarioId: string) {
  await exigirEdicao("funcionarios");
  const supabase = await createSupabaseServerClient();
  await supabase.from("funcionarios").delete().eq("id", funcionarioId);
  refresh();
}
