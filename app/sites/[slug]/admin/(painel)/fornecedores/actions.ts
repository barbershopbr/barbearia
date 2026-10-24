"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { ActionState } from "../../../area-cliente/actions";
import { exigirRecurso } from "@/lib/plano/recursos";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";

export async function createFornecedor(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await exigirEdicao("fornecedores");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  exigirRecurso(empresa, "loja");

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome do fornecedor." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("fornecedores").insert({
    empresa_id: empresa.id,
    nome,
    telefone: String(formData.get("telefone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    cnpj: String(formData.get("cnpj") ?? "").trim() || null,
  });

  if (error) return { error: "Não foi possível cadastrar o fornecedor." };
  return { success: "Fornecedor cadastrado." };
}

export async function deleteFornecedor(fornecedorId: string) {
  await exigirEdicao("fornecedores");
  const supabase = await createSupabaseServerClient();
  await supabase.from("fornecedores").delete().eq("id", fornecedorId);
}
