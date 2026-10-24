"use server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { requireMaster } from "@/lib/auth/current-master";
import { criarEmpresaComResponsavel, SLUG_REGEX } from "@/lib/tenant/nova-empresa";
import type { ActionState } from "../../sites/[slug]/area-cliente/actions";
import type { EmpresaStatus, PlanoSaas } from "@/lib/supabase/types";
import { PLANOS_SAAS } from "@/lib/plano/recursos";

export async function createEmpresa(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireMaster();

  const nome = String(formData.get("nome") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const ownerNome = String(formData.get("owner_nome") ?? "").trim();
  const ownerEmail = String(formData.get("owner_email") ?? "").trim().toLowerCase();
  const ownerPassword = String(formData.get("owner_password") ?? "");
  const plano = String(formData.get("plano_saas") ?? "basico") as PlanoSaas;

  if (!nome || !SLUG_REGEX.test(slug)) {
    return { error: "Nome obrigatório e slug deve conter apenas letras minúsculas, números e hífens." };
  }
  if (!ownerNome || !ownerEmail || ownerPassword.length < 8) {
    return { error: "Preencha os dados do responsável (nome, e-mail, senha com 8+ caracteres)." };
  }
  if (!(plano in PLANOS_SAAS)) return { error: "Plano inválido." };

  const resultado = await criarEmpresaComResponsavel({
    nome,
    slug,
    plano,
    responsavel: { nome: ownerNome, email: ownerEmail, password: ownerPassword },
  });
  if ("error" in resultado) return { error: resultado.error };

  return { success: `Empresa "${nome}" criada em ${slug}.` };
}

export async function updateEmpresaStatus(empresaId: string, status: EmpresaStatus) {
  await requireMaster();
  const admin = createSupabaseServiceRoleClient();
  // Bloqueio pelo Master é "manual": a rotina de cobrança não desbloqueia sozinha.
  await admin
    .from("empresas")
    .update({ status, bloqueio_motivo: status === "bloqueado" ? "manual" : null })
    .eq("id", empresaId);
}
