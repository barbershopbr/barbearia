"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AssinaturaStatus } from "@/lib/supabase/types";

export async function updateAssinaturaStatus(assinaturaId: string, status: AssinaturaStatus) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("assinaturas_clientes").update({ status }).eq("id", assinaturaId);
}
