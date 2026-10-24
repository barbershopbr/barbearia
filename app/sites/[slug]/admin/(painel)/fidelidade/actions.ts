"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { ActionState } from "../../../area-cliente/actions";

export async function salvarConfigFidelidade(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const ativo = formData.get("ativo") === "on";
  const pontosPorAtendimento = Number(formData.get("pontos_por_atendimento") ?? 0);
  const pontosPorRealProduto = Number(formData.get("pontos_por_real_produto") ?? 0);
  const reaisPorPonto = Number(formData.get("reais_por_ponto") ?? 0);

  if (
    !Number.isFinite(pontosPorAtendimento) || pontosPorAtendimento < 0 ||
    !Number.isFinite(pontosPorRealProduto) || pontosPorRealProduto < 0 ||
    !Number.isFinite(reaisPorPonto) || reaisPorPonto < 0
  ) {
    return { error: "Os valores não podem ser negativos." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("fidelidade_config").upsert(
    {
      empresa_id: empresa.id,
      ativo,
      pontos_por_atendimento: Math.floor(pontosPorAtendimento),
      pontos_por_real_produto: pontosPorRealProduto,
      reais_por_ponto: reaisPorPonto,
    },
    { onConflict: "empresa_id" },
  );

  if (error) return { error: "Não foi possível salvar a configuração." };
  return { success: "Programa de fidelidade atualizado." };
}

export async function ajustarPontosCliente(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const clienteId = String(formData.get("cliente_id") ?? "");
  const pontos = Number(formData.get("pontos") ?? 0);
  const motivo = String(formData.get("motivo") ?? "").trim() || "Ajuste manual";

  if (!clienteId) return { error: "Selecione um cliente." };
  if (!Number.isInteger(pontos) || pontos === 0) return { error: "Informe um número de pontos diferente de zero." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("fidelidade_pontos").insert({
    empresa_id: empresa.id,
    cliente_id: clienteId,
    pontos: Math.abs(pontos),
    tipo: pontos > 0 ? "credito" : "debito",
    motivo,
    referencia_tipo: "manual",
  });

  if (error) return { error: "Não foi possível lançar o ajuste." };
  return { success: "Ajuste lançado." };
}
