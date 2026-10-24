"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { ActionState } from "../../../area-cliente/actions";
import { exigirRecurso } from "@/lib/plano/recursos";

export async function createCategoria(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  exigirRecurso(empresa, "loja");

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome da categoria." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categorias").insert({ empresa_id: empresa.id, nome });
  if (error) return { error: "Não foi possível criar a categoria." };

  return { success: "Categoria criada." };
}

/** Cria (produtoId null) ou edita um produto. Na edição o estoque atual não muda (tem ajuste/entrada próprios). */
export async function salvarProduto(
  slug: string,
  produtoId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  exigirRecurso(empresa, "loja");

  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const preco = Number(formData.get("preco") ?? 0);
  const custo = Number(formData.get("custo") ?? 0);
  const estoqueInicial = Number(formData.get("estoque_atual") ?? 0);
  const estoqueMinimo = Number(formData.get("estoque_minimo") ?? 0);
  const categoriaId = String(formData.get("categoria_id") ?? "").trim() || null;
  const fotoUrl = String(formData.get("foto_url") ?? "").trim() || null;

  if (!nome || preco < 0) return { error: "Preencha nome e preço corretamente." };

  const supabase = await createSupabaseServerClient();
  const dados = { nome, descricao, preco, custo, estoque_minimo: estoqueMinimo, categoria_id: categoriaId, foto_url: fotoUrl };
  const { error } = produtoId
    ? await supabase.from("produtos").update(dados).eq("id", produtoId).eq("empresa_id", empresa.id)
    : await supabase.from("produtos").insert({ ...dados, empresa_id: empresa.id, estoque_atual: estoqueInicial });

  if (error) return { error: "Não foi possível salvar o produto." };

  refresh();
  return { success: "Produto salvo." };
}

export async function toggleProdutoAtivo(produtoId: string, ativo: boolean) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("produtos").update({ ativo: !ativo }).eq("id", produtoId);
  refresh();
}

export async function deleteProduto(produtoId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("produtos").delete().eq("id", produtoId);
  refresh();
}

export async function ajustarEstoque(
  produtoId: string,
  empresaId: string,
  delta: number,
  opcoes?: { fornecedorId?: string | null; motivo?: string },
) {
  if (delta === 0) return;
  const supabase = await createSupabaseServerClient();

  const { data: produto } = await supabase
    .from("produtos")
    .select("estoque_atual")
    .eq("id", produtoId)
    .maybeSingle();
  if (!produto) return;

  const novoEstoque = Math.max(0, produto.estoque_atual + delta);

  await supabase.from("produtos").update({ estoque_atual: novoEstoque }).eq("id", produtoId);
  await supabase.from("estoque_movimentacoes").insert({
    empresa_id: empresaId,
    produto_id: produtoId,
    tipo: delta > 0 ? "entrada" : "saida",
    quantidade: Math.abs(delta),
    motivo: opcoes?.motivo?.trim() || (delta > 0 ? "Ajuste manual (entrada)" : "Ajuste manual (saída)"),
    fornecedor_id: delta > 0 ? opcoes?.fornecedorId ?? null : null,
  });
}

export async function registrarEntradaEstoque(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  exigirRecurso(empresa, "loja");

  const produtoId = String(formData.get("produto_id") ?? "");
  const quantidade = Number(formData.get("quantidade") ?? 0);
  const fornecedorId = String(formData.get("fornecedor_id") ?? "").trim() || null;
  const motivo = String(formData.get("motivo") ?? "").trim() || "Entrada de estoque";

  if (!produtoId) return { error: "Produto inválido." };
  if (!Number.isInteger(quantidade) || quantidade <= 0) return { error: "Informe uma quantidade positiva." };

  await ajustarEstoque(produtoId, empresa.id, quantidade, { fornecedorId, motivo });
  return { success: "Entrada registrada." };
}
