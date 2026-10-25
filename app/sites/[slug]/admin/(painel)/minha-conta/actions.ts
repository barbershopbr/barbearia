"use server";

import { createClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { dentroDoLimite, MSG_LIMITE } from "@/lib/seguranca/limite";
import type { ActionState } from "../../../area-cliente/actions";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Confere a senha atual sem mexer na sessão do navegador (client avulso, sem cookies). */
async function senhaConfere(email: string, senha: string): Promise<boolean> {
  const avulso = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await avulso.auth.signInWithPassword({ email, password: senha });
  return !error;
}

/**
 * Pessoa logada troca o próprio nome, e-mail de login e/ou senha.
 * Exige a senha atual; o e-mail vale para todas as barbearias desse login.
 */
export async function atualizarMinhaConta(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await dentroDoLimite("minha-conta", 10, 600))) return { error: MSG_LIMITE };
  const empresa = await getEmpresaBySlug(slug);
  const staff = empresa ? await getCurrentStaff(empresa.id) : null;
  if (!staff) return { error: "Entre novamente para alterar sua conta." };

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senhaAtual = String(formData.get("senha_atual") ?? "");
  const novaSenha = String(formData.get("nova_senha") ?? "");
  const confirmar = String(formData.get("confirmar_senha") ?? "");

  if (!nome) return { error: "Informe seu nome." };
  if (!EMAIL_VALIDO.test(email)) return { error: "E-mail inválido." };
  if (novaSenha && novaSenha.length < 8) return { error: "A nova senha precisa de pelo menos 8 caracteres." };
  if (novaSenha !== confirmar) return { error: "A confirmação não bate com a nova senha." };

  const trocaEmail = email !== staff.email.toLowerCase();
  if ((trocaEmail || novaSenha) && !(await senhaConfere(staff.email, senhaAtual))) {
    return { error: "Senha atual incorreta." };
  }

  const admin = createSupabaseServiceRoleClient();
  if (trocaEmail || novaSenha) {
    const { error } = await admin.auth.admin.updateUserById(staff.auth_user_id, {
      ...(trocaEmail ? { email, email_confirm: true } : {}),
      ...(novaSenha ? { password: novaSenha } : {}),
    });
    if (error) {
      return { error: /already|registered|exists/i.test(error.message) ? "Esse e-mail já está em uso por outra conta." : "Não foi possível atualizar o login." };
    }
  }

  await admin.from("usuarios_empresa").update({ email }).eq("auth_user_id", staff.auth_user_id);
  await admin.from("usuarios_empresa").update({ nome }).eq("id", staff.id);

  refresh();
  return { success: trocaEmail || novaSenha ? "Conta atualizada. Use os novos dados no próximo login." : "Dados salvos." };
}
