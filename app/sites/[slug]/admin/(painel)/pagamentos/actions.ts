"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";
import { assinar } from "@/lib/pagamentos/cripto";
import { desconectar, mercadoPagoConfigurado, urlAutorizacao } from "@/lib/pagamentos/mercadopago";
import { lerPreferencias } from "@/lib/pagamentos/preferencias";
import type { ActionState } from "../../../area-cliente/actions";

/** Leva o dono para a tela de autorização do Mercado Pago (volta em /api/mercadopago/callback). */
export async function conectarMercadoPago(slug: string) {
  await exigirEdicao("pagamentos");
  if (!mercadoPagoConfigurado()) throw new Error("A conexão com o Mercado Pago ainda não foi ativada no BarberControl.");
  const empresa = await getEmpresaBySlug(slug);
  const staff = empresa ? await getCurrentStaff(empresa.id) : null;
  if (!empresa || !staff) throw new Error("Sessão expirada. Entre novamente.");

  const state = await assinar({ e: empresa.id, s: empresa.slug, u: staff.id }, 15 * 60);
  redirect(urlAutorizacao(state));
}

export async function desconectarMercadoPago(slug: string) {
  await exigirEdicao("pagamentos");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return;
  await desconectar(empresa.id);
  refresh();
}

export async function salvarPreferencias(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await exigirEdicao("pagamentos");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const marcado = (k: string) => formData.get(k) === "on";
  const preferencias = lerPreferencias({
    pix: marcado("pix"),
    cartao: marcado("cartao"),
    lojaOnline: marcado("loja_online"),
    assinaturaRecorrente: marcado("assinatura_recorrente"),
    sinal: {
      ativo: marcado("sinal_ativo"),
      tipo: formData.get("sinal_tipo"),
      valor: Number(String(formData.get("sinal_valor") ?? "").replace(",", ".")),
    },
  });
  if (!preferencias.pix && !preferencias.cartao) return { error: "Deixe ao menos Pix ou cartão ativo." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("empresas").update({ pagamentos_config: preferencias }).eq("id", empresa.id);
  if (error) return { error: "Não foi possível salvar." };
  refresh();
  return { success: "Preferências salvas." };
}
