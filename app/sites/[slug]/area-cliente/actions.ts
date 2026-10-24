"use server";

import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { syntheticAuthEmail } from "@/lib/auth/cliente-identity";
import { tenantOrigin } from "@/lib/tenant/domain";
import { tenantBasePath } from "@/lib/tenant/base-path";

export type ActionState = { error?: string; success?: string } | null;

async function getEmpresaIdAtivaBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("empresas").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

export async function signUpCliente(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");

  if (!nome || !email || password.length < 8) {
    return { error: "Preencha nome, e-mail e uma senha com pelo menos 8 caracteres." };
  }

  const empresaId = await getEmpresaIdAtivaBySlug(slug);
  if (!empresaId) return { error: "Barbearia não encontrada." };

  const admin = createSupabaseServiceRoleClient();
  const authEmail = syntheticAuthEmail(empresaId, email);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { empresa_id: empresaId, real_email: email },
  });

  if (createError || !created.user) {
    return { error: "Este e-mail já possui cadastro nesta barbearia." };
  }

  const { error: insertError } = await admin.from("clientes").insert({
    empresa_id: empresaId,
    auth_user_id: created.user.id,
    email,
    nome,
    telefone,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Não foi possível concluir o cadastro. Tente novamente." };
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password });
  if (signInError) return { error: "Cadastro criado, mas falhou ao entrar automaticamente. Faça login." };

  redirect(`${await tenantBasePath(slug)}/area-cliente`);
}

export async function signInCliente(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const empresaId = await getEmpresaIdAtivaBySlug(slug);
  if (!empresaId) return { error: "Barbearia não encontrada." };

  const authEmail = syntheticAuthEmail(empresaId, email);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });

  if (error) return { error: "E-mail ou senha inválidos." };

  redirect(`${await tenantBasePath(slug)}/area-cliente`);
}

export async function signOutCliente(slug: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const base = await tenantBasePath(slug);
  redirect(base === "" ? "/" : base);
}

export async function requestPasswordReset(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const generic: ActionState = { success: "Se este e-mail estiver cadastrado, enviaremos as instruções de redefinição." };

  const empresaId = await getEmpresaIdAtivaBySlug(slug);
  if (!empresaId) return generic;

  const admin = createSupabaseServiceRoleClient();
  const { data: cliente } = await admin
    .from("clientes")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("email", email)
    .maybeSingle();

  if (!cliente) return generic; // não revela se o e-mail existe ou não

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await admin.from("cliente_password_reset_tokens").insert({
    cliente_id: cliente.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  const resetLink = `${tenantOrigin(slug)}/area-cliente/redefinir-senha?token=${token}`;

  // TODO: integrar um provedor de e-mail (ex.: Resend) e enviar `resetLink`
  // para o e-mail real do cliente. Por enquanto, registramos no log do
  // servidor para permitir testar o fluxo em desenvolvimento.
  console.log(`[reset-senha] link para ${email} (${slug}): ${resetLink}`);

  return generic;
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) return { error: "A senha deve ter pelo menos 8 caracteres." };

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const admin = createSupabaseServiceRoleClient();

  const { data: resetToken } = await admin
    .from("cliente_password_reset_tokens")
    .select("id, cliente_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!resetToken || resetToken.used_at || new Date(resetToken.expires_at) < new Date()) {
    return { error: "Link inválido ou expirado. Solicite uma nova redefinição." };
  }

  const { data: cliente } = await admin
    .from("clientes")
    .select("auth_user_id")
    .eq("id", resetToken.cliente_id)
    .maybeSingle();

  if (!cliente) return { error: "Conta não encontrada." };

  await admin.auth.admin.updateUserById(cliente.auth_user_id, { password });
  await admin.from("cliente_password_reset_tokens").update({ used_at: new Date().toISOString() }).eq("id", resetToken.id);

  return { success: "Senha redefinida com sucesso. Você já pode fazer login." };
}
