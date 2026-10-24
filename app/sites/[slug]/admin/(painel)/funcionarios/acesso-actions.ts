"use server";

import { refresh } from "next/cache";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { createStaffAccount } from "@/lib/auth/staff-management";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { ITENS_PERMISSAO, PAPEIS_ATRIBUIVEIS } from "@/lib/auth/papeis";
import type { UsuarioEmpresaRole } from "@/lib/supabase/types";
import type { ActionState } from "../../../area-cliente/actions";

/**
 * Acesso da equipe ao painel. Só responsável/admin gerencia, ninguém mexe no
 * responsável (owner) nem no próprio acesso, e "owner" não pode ser
 * atribuído por aqui (só pelo Master).
 */
async function requireGestor(slug: string) {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." as const };
  const staff = await getCurrentStaff(empresa.id);
  if (!staff || (staff.role !== "owner" && staff.role !== "admin")) {
    return { error: "Só o responsável ou um admin pode gerenciar acessos." as const };
  }
  return { empresa, staff };
}

function papelValido(v: FormDataEntryValue | null): UsuarioEmpresaRole | null {
  const p = String(v ?? "") as UsuarioEmpresaRole;
  return PAPEIS_ATRIBUIVEIS.includes(p) ? p : null;
}

export async function criarAcesso(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const check = await requireGestor(slug);
  if ("error" in check) return { error: check.error };
  const { empresa } = check;

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const papel = papelValido(formData.get("papel"));
  const funcionarioId = String(formData.get("funcionario_id") ?? "").trim() || null;

  if (!nome || !email || password.length < 8) return { error: "Preencha nome, e-mail e uma senha com 8+ caracteres." };
  if (!papel) return { error: "Escolha o papel." };

  const resultado = await createStaffAccount(empresa.id, { nome, email, password, role: papel });
  if (resultado.error) return { error: resultado.error };

  if (funcionarioId && resultado.usuarioEmpresaId) {
    const admin = createSupabaseServiceRoleClient();
    await admin
      .from("funcionarios")
      .update({ usuario_empresa_id: resultado.usuarioEmpresaId })
      .eq("id", funcionarioId)
      .eq("empresa_id", empresa.id);
  }

  refresh();
  return { success: `Acesso criado. ${nome} entra com ${email} e a senha informada.` };
}

/** Carrega o acesso alvo garantindo que é da mesma empresa, não é o owner e não é o próprio usuário. */
async function acessoEditavel(slug: string, usuarioEmpresaId: string) {
  const check = await requireGestor(slug);
  if ("error" in check) return { error: check.error };
  if (usuarioEmpresaId === check.staff.id) return { error: "Você não pode alterar o seu próprio acesso." as const };

  const admin = createSupabaseServiceRoleClient();
  const { data: alvo } = await admin
    .from("usuarios_empresa")
    .select("id, role, auth_user_id")
    .eq("id", usuarioEmpresaId)
    .eq("empresa_id", check.empresa.id)
    .maybeSingle();
  if (!alvo) return { error: "Acesso não encontrado." as const };
  if (alvo.role === "owner") return { error: "O acesso do responsável só pode ser alterado pelo suporte." as const };
  return { admin, alvo };
}

export async function alterarPapel(slug: string, usuarioEmpresaId: string, formData: FormData): Promise<ActionState> {
  const papel = papelValido(formData.get("papel"));
  if (!papel) return { error: "Papel inválido." };
  const r = await acessoEditavel(slug, usuarioEmpresaId);
  if ("error" in r) return { error: r.error };

  await r.admin.from("usuarios_empresa").update({ role: papel }).eq("id", usuarioEmpresaId);
  refresh();
  return { success: "Papel atualizado." };
}

export async function alternarAcessoAtivo(slug: string, usuarioEmpresaId: string, ativo: boolean): Promise<ActionState> {
  const r = await acessoEditavel(slug, usuarioEmpresaId);
  if ("error" in r) return { error: r.error };

  // Bloquear não apaga a conta (pode ser reativada). O efeito é imediato:
  // getCurrentStaff exige ativo = true em toda requisição do painel.
  await r.admin.from("usuarios_empresa").update({ ativo: !ativo }).eq("id", usuarioEmpresaId);
  refresh();
  return { success: ativo ? "Acesso bloqueado." : "Acesso reativado." };
}

export async function redefinirSenhaAcesso(slug: string, usuarioEmpresaId: string, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "A senha deve ter 8+ caracteres." };
  const r = await acessoEditavel(slug, usuarioEmpresaId);
  if ("error" in r) return { error: r.error };

  const { error } = await r.admin.auth.admin.updateUserById(r.alvo.auth_user_id, { password });
  if (error) return { error: "Não foi possível trocar a senha." };
  return { success: "Senha alterada. Passe a nova senha para a pessoa." };
}

/**
 * Salva o que o funcionário pode ver/editar em cada seção. Campo "secao_<id>"
 * com "", "ver" ou "editar". "restaurar" volta ao modelo do papel.
 */
export async function salvarPermissoes(slug: string, usuarioEmpresaId: string, formData: FormData): Promise<ActionState> {
  const r = await acessoEditavel(slug, usuarioEmpresaId);
  if ("error" in r) return { error: r.error };

  let permissions: Record<string, unknown> = {};
  if (formData.get("restaurar") !== "1") {
    const secoes: Record<string, "ver" | "editar"> = {};
    for (const { id } of ITENS_PERMISSAO) {
      const nivel = formData.get(`secao_${id}`);
      if (nivel === "ver" || nivel === "editar") secoes[id] = nivel;
    }
    permissions = { secoes };
  }

  await r.admin.from("usuarios_empresa").update({ permissions }).eq("id", usuarioEmpresaId);
  refresh();
  return { success: "Permissões salvas." };
}
