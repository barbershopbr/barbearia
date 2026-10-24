"use server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { requireMaster } from "@/lib/auth/current-master";
import { createStaffAccount } from "@/lib/auth/staff-management";
import type { ActionState } from "../../sites/[slug]/area-cliente/actions";
import type { EmpresaStatus, PlanoSaas } from "@/lib/supabase/types";
import { PLANOS_SAAS } from "@/lib/plano/recursos";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Horário padrão só para a barbearia já nascer com agenda funcionando — o dono
// ajusta em Configurações depois.
const HORARIOS_PADRAO = {
  segunda: { abre: "09:00", fecha: "19:00", fechado: false },
  terca: { abre: "09:00", fecha: "19:00", fechado: false },
  quarta: { abre: "09:00", fecha: "19:00", fechado: false },
  quinta: { abre: "09:00", fecha: "19:00", fechado: false },
  sexta: { abre: "09:00", fecha: "19:00", fechado: false },
  sabado: { abre: "09:00", fecha: "17:00", fechado: false },
  domingo: { abre: "09:00", fecha: "13:00", fechado: true },
};

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

  const admin = createSupabaseServiceRoleClient();

  const { data: empresa, error: empresaError } = await admin
    .from("empresas")
    .insert({ nome, slug, horarios: HORARIOS_PADRAO, plano_saas: plano })
    .select("id")
    .single();

  if (empresaError || !empresa) {
    return { error: "Não foi possível criar a empresa (slug já em uso?)." };
  }

  const staffResult = await createStaffAccount(empresa.id, {
    nome: ownerNome,
    email: ownerEmail,
    password: ownerPassword,
    role: "owner",
  });

  if (staffResult.error) {
    await admin.from("empresas").delete().eq("id", empresa.id);
    return { error: staffResult.error };
  }

  return { success: `Empresa "${nome}" criada em ${slug}.` };
}

export async function updateEmpresaStatus(empresaId: string, status: EmpresaStatus) {
  await requireMaster();
  const admin = createSupabaseServiceRoleClient();
  await admin.from("empresas").update({ status }).eq("id", empresaId);
}
