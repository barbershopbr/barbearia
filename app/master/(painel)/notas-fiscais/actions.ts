"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getCurrentMaster, requireMaster } from "@/lib/auth/current-master";
import { assinar } from "@/lib/pagamentos/cripto";
import { blingConfigurado, desconectarBling, salvarConfigBling, urlAutorizacaoBling } from "@/lib/fiscal/bling";

/** Bling do próprio BarberControl (empresa_id null): notas das mensalidades das barbearias. */
export async function conectarBlingMaster() {
  await requireMaster();
  const master = await getCurrentMaster();
  if (!master) throw new Error("Sessão expirada.");
  if (!blingConfigurado()) throw new Error("Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET no Worker.");
  redirect(urlAutorizacaoBling(await assinar({ d: "master", u: master.id }, 15 * 60)));
}

export async function desconectarBlingMaster() {
  await requireMaster();
  await desconectarBling(null);
  refresh();
}

export async function salvarConfigBlingMaster(formData: FormData) {
  await requireMaster();
  await salvarConfigBling(null, { emitirMensalidades: formData.get("emitir_mensalidades") === "on" });
  refresh();
}
