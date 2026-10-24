"use server";

import { refresh } from "next/cache";
import { requireMaster } from "@/lib/auth/current-master";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

/** Gera as faturas do mês que faltam e aplica bloqueio/desbloqueio (a mesma rotina do pg_cron diário). */
export async function rodarRotinaCobranca(): Promise<{ resultado?: string; error?: string }> {
  await requireMaster();
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin.rpc("rotina_cobranca_saas", {});
  if (error) return { error: "Não foi possível rodar a rotina." };
  refresh();
  return { resultado: `${data.geradas} fatura(s) gerada(s), ${data.bloqueadas} bloqueio(s), ${data.desbloqueadas} desbloqueio(s).` };
}

/** Baixa manual (Pix/transferência direto para o BarberControl) até a cobrança online existir. */
export async function marcarFaturaPaga(faturaId: string, formData: FormData) {
  await requireMaster();
  const admin = createSupabaseServiceRoleClient();
  await admin
    .from("faturas_saas")
    .update({ status: "paga", pago_em: new Date().toISOString(), metodo: String(formData.get("metodo") ?? "pix") })
    .eq("id", faturaId)
    .eq("status", "aberta");
  // Desbloqueia na hora se era o atraso que segurava a barbearia.
  await admin.rpc("rotina_cobranca_saas", {});
  refresh();
}

export async function cancelarFatura(faturaId: string) {
  await requireMaster();
  const admin = createSupabaseServiceRoleClient();
  await admin.from("faturas_saas").update({ status: "cancelada" }).eq("id", faturaId).eq("status", "aberta");
  await admin.rpc("rotina_cobranca_saas", {});
  refresh();
}
