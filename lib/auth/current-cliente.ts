import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/supabase/types";

export async function getCurrentCliente(empresaId: string): Promise<Cliente | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("clientes")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return data;
}
