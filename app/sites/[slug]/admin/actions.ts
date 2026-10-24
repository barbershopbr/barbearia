"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantBasePath } from "@/lib/tenant/base-path";
import type { ActionState } from "../area-cliente/actions";

export async function signInStaff(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha inválidos." };

  redirect(`${await tenantBasePath(slug)}/admin`);
}

export async function signOutStaff(slug: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`${await tenantBasePath(slug)}/admin/login`);
}
