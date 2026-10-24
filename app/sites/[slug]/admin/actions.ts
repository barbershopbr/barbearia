"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE_SUPORTE } from "@/lib/plataforma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantBasePath } from "@/lib/tenant/base-path";
import type { ActionState } from "../area-cliente/actions";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { dentroDoLimite, MSG_LIMITE } from "@/lib/seguranca/limite";

export async function signInStaff(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await dentroDoLimite("login-equipe", 10, 600))) return { error: MSG_LIMITE };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha inválidos." };

  redirect(`${await tenantBasePath(slug)}/admin`);
}

export async function signOutStaff(slug: string) {
  (await cookies()).delete(COOKIE_SUPORTE);
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`${await tenantBasePath(slug)}/admin/login`);
}

/** Marca que a pessoa logada já viu (ou pulou) o tutorial — só a própria linha. */
export async function marcarTutorialVisto(slug: string) {
  const empresa = await getEmpresaBySlug(slug);
  const staff = empresa ? await getCurrentStaff(empresa.id) : null;
  if (!staff || staff.tutorial_visto_em) return;
  const admin = createSupabaseServiceRoleClient();
  await admin.from("usuarios_empresa").update({ tutorial_visto_em: new Date().toISOString() }).eq("id", staff.id);
}
