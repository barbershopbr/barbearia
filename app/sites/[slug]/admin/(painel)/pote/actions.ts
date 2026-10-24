"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";
import { exigirRecurso } from "@/lib/plano/recursos";
import { lerConfigPote } from "@/lib/comissoes/pote-calculo";
import { fecharPote, reabrirPote } from "@/lib/comissoes/pote";
import { hojeNoBrasil } from "@/lib/tenant/timezone";
import type { ActionState } from "../../../area-cliente/actions";

const MES = /^\d{4}-\d{2}$/;

export async function salvarConfigPote(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await exigirEdicao("pote");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  exigirRecurso(empresa, "assinaturas");

  // Campos por funcionário/serviço chegam como participa_<id>, casa_<id>, peso_<id>.
  const participantes: Record<string, boolean> = {};
  const casaPorBarbeiro: Record<string, number> = {};
  const pesosManuais: Record<string, number> = {};
  for (const id of formData.getAll("funcionario_ids").map(String)) {
    participantes[id] = formData.get(`participa_${id}`) === "on";
    const casa = String(formData.get(`casa_${id}`) ?? "").trim();
    if (formData.get("casa_modo") === "por_barbeiro" && casa !== "") casaPorBarbeiro[id] = Number(casa.replace(",", "."));
  }
  for (const id of formData.getAll("servico_ids").map(String)) {
    const peso = String(formData.get(`peso_${id}`) ?? "").trim();
    if (peso !== "") pesosManuais[id] = Number(peso.replace(",", "."));
  }

  const config = lerConfigPote({
    ativo: formData.get("ativo") === "on",
    casaPercentual: Number(String(formData.get("casa_percentual") ?? "40").replace(",", ".")),
    casaPorBarbeiro,
    peso: formData.get("peso"),
    pesosManuais,
    modo: formData.get("modo"),
    sobra: formData.get("sobra"),
    participantes,
  });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("empresas").update({ pote_config: config }).eq("id", empresa.id);
  if (error) return { error: "Não foi possível salvar." };
  refresh();
  return { success: "Configuração do pote salva." };
}

export async function fecharMesPote(slug: string, competencia: string): Promise<{ error?: string }> {
  await exigirEdicao("pote");
  if (!MES.test(competencia)) return { error: "Mês inválido." };
  if (competencia >= hojeNoBrasil().slice(0, 7)) return { error: "Só dá para fechar um mês depois que ele terminar." };
  const empresa = await getEmpresaBySlug(slug);
  const staff = empresa ? await getCurrentStaff(empresa.id) : null;
  if (!empresa || !staff) return { error: "Sessão expirada." };
  const r = await fecharPote(empresa.id, competencia, empresa.pote_config, staff.id);
  refresh();
  return r;
}

export async function reabrirMesPote(slug: string, competencia: string): Promise<{ error?: string }> {
  await exigirEdicao("pote");
  if (!MES.test(competencia)) return { error: "Mês inválido." };
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  const r = await reabrirPote(empresa.id, competencia);
  refresh();
  return r;
}
