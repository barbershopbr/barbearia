import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { UsuarioEmpresaRole } from "@/lib/supabase/types";

/**
 * Cria a conta de login de um funcionário/admin. Diferente do cliente, o
 * e-mail aqui é o real (auth.users é global) — um mesmo e-mail não pode ser
 * staff de duas empresas diferentes nesta fase; é uma limitação conhecida,
 * não um requisito de produto (ver plano).
 */
export async function createStaffAccount(
  empresaId: string,
  input: { nome: string; email: string; password: string; role: UsuarioEmpresaRole },
) {
  const admin = createSupabaseServiceRoleClient();
  const email = input.email.trim().toLowerCase();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { empresa_id: empresaId },
  });

  if (createError || !created.user) {
    return { error: "Não foi possível criar a conta: e-mail já em uso ou inválido." };
  }

  const { data: usuario, error: insertError } = await admin
    .from("usuarios_empresa")
    .insert({
      empresa_id: empresaId,
      auth_user_id: created.user.id,
      nome: input.nome,
      email,
      role: input.role,
    })
    .select("id")
    .single();

  if (insertError || !usuario) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Não foi possível vincular a conta à empresa." };
  }

  return { error: null, usuarioEmpresaId: usuario.id };
}
