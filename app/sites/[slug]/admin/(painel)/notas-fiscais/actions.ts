"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";
import { assinar } from "@/lib/pagamentos/cripto";
import { blingConfigurado, desconectarBling, salvarConfigBling, urlAutorizacaoBling } from "@/lib/fiscal/bling";
import { lerConfigFiscal } from "@/lib/fiscal/config";
import type { ActionState } from "../../../area-cliente/actions";

export async function conectarBling(slug: string) {
  await exigirEdicao("notas-fiscais");
  if (!blingConfigurado()) throw new Error("A conexão com o Bling ainda não foi ativada no BarberControl.");
  const empresa = await getEmpresaBySlug(slug);
  const staff = empresa ? await getCurrentStaff(empresa.id) : null;
  if (!empresa || !staff) throw new Error("Sessão expirada. Entre novamente.");
  redirect(urlAutorizacaoBling(await assinar({ d: empresa.id, s: empresa.slug, u: staff.id }, 15 * 60)));
}

export async function desconectarBlingEmpresa(slug: string) {
  await exigirEdicao("notas-fiscais");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return;
  await desconectarBling(empresa.id);
  refresh();
}

export async function salvarConfigFiscal(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await exigirEdicao("notas-fiscais");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  const marcado = (k: string) => formData.get(k) === "on";
  await salvarConfigBling(
    empresa.id,
    lerConfigFiscal({
      emitirAutomatico: marcado("emitir_automatico"),
      servicos: marcado("servicos"),
      assinaturas: marcado("assinaturas"),
      produtos: marcado("produtos"),
    }),
  );
  refresh();
  return { success: "Configuração salva." };
}
