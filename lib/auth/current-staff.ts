import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UsuarioEmpresa } from "@/lib/supabase/types";

export async function getCurrentStaff(empresaId: string): Promise<UsuarioEmpresa | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuarios_empresa")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  return data;
}
