"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { ActionState } from "../../../area-cliente/actions";

export async function createCupom(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const tipoDesconto = String(formData.get("tipo_desconto") ?? "");
  const valor = Number(formData.get("valor") ?? 0);
  const validade = String(formData.get("validade") ?? "").trim() || null;
  const usosMaximosRaw = String(formData.get("usos_maximos") ?? "").trim();
  const usosMaximos = usosMaximosRaw ? Number(usosMaximosRaw) : null;

  if (!codigo) return { error: "Informe o código do cupom." };
  if (tipoDesconto !== "percentual" && tipoDesconto !== "valor_fixo") {
    return { error: "Tipo de desconto inválido." };
  }
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Informe um valor de desconto maior que zero." };
  if (tipoDesconto === "percentual" && valor > 100) return { error: "O percentual não pode passar de 100." };
  if (usosMaximos !== null && (!Number.isInteger(usosMaximos) || usosMaximos <= 0)) {
    return { error: "O limite de usos deve ser um número inteiro positivo." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("cupons").insert({
    empresa_id: empresa.id,
    codigo,
    tipo_desconto: tipoDesconto,
    valor,
    validade,
    usos_maximos: usosMaximos,
  });

  if (error) {
    if (error.code === "23505") return { error: "Já existe um cupom com esse código." };
    return { error: "Não foi possível criar o cupom." };
  }

  return { success: "Cupom criado." };
}

export async function toggleCupomAtivo(cupomId: string, ativo: boolean) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("cupons").update({ ativo: !ativo }).eq("id", cupomId);
}

export async function deleteCupom(cupomId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("cupons").delete().eq("id", cupomId);
}
