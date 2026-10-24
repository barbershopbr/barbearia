import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { MasterAdmin } from "@/lib/supabase/types";

export async function getCurrentMaster(): Promise<MasterAdmin | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: isMaster } = await supabase.rpc("auth_is_master_admin");
  if (!isMaster) return null;

  // master_admins não tem policy para authenticated (só service_role) —
  // já confirmamos acima via RPC que este usuário é master, então buscamos os
  // dados com o client admin.
  const admin = createSupabaseServiceRoleClient();
  const { data } = await admin.from("master_admins").select("*").eq("auth_user_id", user.id).maybeSingle();
  return data;
}

/**
 * Toda Server Action do painel Master usa a service_role (ignora RLS por
 * completo) porque precisa operar entre empresas. Isso só é seguro se cada
 * action confirmar o papel de master ela mesma — o guard do layout só protege
 * a renderização da página, não impede alguém de invocar a action
 * diretamente. Nunca remover esta checagem das actions em app/master.
 */
export async function requireMaster() {
  const master = await getCurrentMaster();
  if (!master) throw new Error("Acesso negado: requer conta de admin do SaaS (Master).");
  return master;
}
