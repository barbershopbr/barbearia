"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AssinaturaStatus } from "@/lib/supabase/types";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";

export async function updateAssinaturaStatus(assinaturaId: string, status: AssinaturaStatus) {
  await exigirEdicao("assinaturas");
  const supabase = await createSupabaseServerClient();
  await supabase.from("assinaturas_clientes").update({ status }).eq("id", assinaturaId);
}
