import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nivelSecao, SECOES } from "@/lib/auth/papeis";

/**
 * Trava de escrita das Server Actions do admin: só quem tem "editar" na
 * seção (ou é responsável/admin) altera dados. Esconder botões não basta —
 * a action pode ser chamada direto.
 *
 * Busca o vínculo pelo usuário logado (um login de equipe pertence a uma só
 * barbearia — ver lib/auth/staff-management.ts); a RLS das tabelas continua
 * garantindo que ele só toca dados da própria empresa.
 */
export async function exigirEdicao(secao: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Entre novamente.");

  const { data: staff } = await supabase
    .from("usuarios_empresa")
    .select("role, permissions")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (!staff || nivelSecao(staff, secao) !== "editar") {
    const label = SECOES.find((s) => s.id === secao)?.label ?? secao;
    throw new Error(`Você não tem permissão para editar ${label}.`);
  }
}
