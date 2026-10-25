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
): Promise<ActionState & { id?: string }> {
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
  const { data: salvo, error } = funcionarioId
    ? await supabase.from("funcionarios").update(dados).eq("id", funcionarioId).eq("empresa_id", empresa.id).select("id").single()
    : await supabase.from("funcionarios").insert({ ...dados, empresa_id: empresa.id }).select("id").single();

  if (error || !salvo) return { error: "Não foi possível salvar o funcionário." };

  refresh();
  return { success: "Funcionário salvo.", id: salvo.id };
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

const TIPOS_CONTRATO = ["clt", "mei", "autonomo", "parceria", "estagio", "outro"] as const;

/** Dados internos (contato, contrato, salário) — tabela protegida, fora do perfil público. */
export async function salvarDadosFuncionario(slug: string, funcionarioId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await exigirEdicao("funcionarios");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const texto = (campo: string) => String(formData.get(campo) ?? "").trim() || null;
  const data = (campo: string) => {
    const v = texto(campo);
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  };
  const salario = Number(String(formData.get("salario_fixo") ?? "0").replace(",", ".")) || 0;
  const dia = Number(formData.get("dia_pagamento") ?? "") || null;
  const contrato = texto("tipo_contrato");
  if (salario < 0) return { error: "Salário inválido." };
  if (dia !== null && (dia < 1 || dia > 31)) return { error: "Dia de pagamento deve ser de 1 a 31." };

  const supabase = await createSupabaseServerClient();
  // Confirma que o funcionário é desta barbearia antes de gravar.
  const { data: func } = await supabase.from("funcionarios").select("id").eq("id", funcionarioId).eq("empresa_id", empresa.id).maybeSingle();
  if (!func) return { error: "Funcionário não encontrado." };

  const { error } = await supabase.from("funcionarios_dados").upsert({
    funcionario_id: funcionarioId,
    empresa_id: empresa.id,
    telefone: texto("telefone"),
    email: texto("email"),
    cpf: texto("cpf"),
    data_nascimento: data("data_nascimento"),
    data_admissao: data("data_admissao"),
    cargo: texto("cargo"),
    tipo_contrato: TIPOS_CONTRATO.find((t) => t === contrato) ?? null,
    salario_fixo: Math.round(salario * 100) / 100,
    dia_pagamento: dia,
    chave_pix: texto("chave_pix"),
    endereco: texto("endereco"),
    observacoes: texto("observacoes"),
  });
  if (error) return { error: "Não foi possível salvar os dados." };

  refresh();
  return { success: "Dados salvos." };
}
