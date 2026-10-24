"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { masterBasePath } from "@/lib/tenant/master-base-path";
import type { ActionState } from "../sites/[slug]/area-cliente/actions";

export async function signInMaster(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "E-mail ou senha inválidos." };

  const { data: isMaster } = await supabase.rpc("auth_is_master_admin");
  if (!isMaster) {
    await supabase.auth.signOut();
    return { error: "Esta conta não tem acesso ao painel Master." };
  }

  const base = await masterBasePath();
  redirect(base === "" ? "/" : base);
}

export async function signOutMaster() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`${await masterBasePath()}/login`);
}
