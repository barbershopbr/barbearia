"use server";

import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { invalidateDomainCache } from "@/lib/tenant/domain";
import { createCustomHostname, deleteCustomHostname, getCustomHostnameStatus, isCloudflareConfigured } from "@/lib/cloudflare/custom-hostnames";
import type { ActionState } from "../../../area-cliente/actions";

const DOMINIO_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

function normalizarDominio(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

/**
 * Domínio próprio é um recurso sensível (aponta o site inteiro da empresa
 * pra outro lugar) — restrito a owner/admin, diferente do resto do painel
 * do tenant que hoje deixa qualquer staff ativo mexer (ver achado sobre
 * permissions granulares no plano de arquitetura white label).
 */
async function requireOwnerOrAdmin(slug: string) {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." as const };

  const staff = await getCurrentStaff(empresa.id);
  if (!staff || (staff.role !== "owner" && staff.role !== "admin")) {
    return { error: "Só o responsável ou um admin da empresa pode configurar o domínio." as const };
  }

  return { empresa };
}

export async function configurarDominioTenant(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const check = await requireOwnerOrAdmin(slug);
  if ("error" in check) return { error: check.error };
  const { empresa } = check;

  if (!isCloudflareConfigured()) {
    return { error: "Provisionamento de domínio ainda não está disponível. Fale com o suporte." };
  }

  const dominio = normalizarDominio(String(formData.get("dominio") ?? ""));
  if (!DOMINIO_REGEX.test(dominio)) {
    return { error: "Domínio inválido. Use o formato exemplo.com.br, sem \"http://\" ou caminho." };
  }

  const admin = createSupabaseServiceRoleClient();

  if (empresa.dominio_cloudflare_id) {
    try {
      await deleteCustomHostname(empresa.dominio_cloudflare_id);
    } catch {
      // segue o fluxo mesmo assim
    }
  }

  try {
    const { cloudflareId, status } = await createCustomHostname(dominio);

    const { error } = await admin
      .from("empresas")
      .update({ dominio_principal: dominio, dominio_status: status, dominio_cloudflare_id: cloudflareId })
      .eq("id", empresa.id);
    if (error) return { error: "Domínio criado na Cloudflare, mas não foi possível salvar. Tente novamente." };

    await invalidateDomainCache({
      hostnames: [dominio, ...(empresa.dominio_principal ? [empresa.dominio_principal] : [])],
      slugs: [slug],
    });

    return {
      success:
        status === "verificado"
          ? "Domínio configurado e verificado."
          : "Domínio criado. Aponte um CNAME desse domínio para o app e clique em \"Verificar novamente\" — a emissão do certificado pode levar alguns minutos.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não foi possível criar o domínio." };
  }
}

export async function verificarDominioTenant(slug: string): Promise<ActionState> {
  const check = await requireOwnerOrAdmin(slug);
  if ("error" in check) return { error: check.error };
  const { empresa } = check;

  if (!empresa.dominio_cloudflare_id) return { error: "Essa empresa não tem domínio cadastrado." };

  const admin = createSupabaseServiceRoleClient();
  try {
    const status = await getCustomHostnameStatus(empresa.dominio_cloudflare_id);
    await admin.from("empresas").update({ dominio_status: status }).eq("id", empresa.id);
    if (empresa.dominio_principal) {
      await invalidateDomainCache({ hostnames: [empresa.dominio_principal], slugs: [slug] });
    }
    return status === "verificado"
      ? { success: "Domínio verificado! O acesso por subdomínio agora redireciona pra lá." }
      : { error: `Ainda não verificado (status: ${status}). Confirme o CNAME e tente de novo em alguns minutos.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não foi possível consultar o status." };
  }
}

export async function removerDominioTenant(slug: string): Promise<ActionState> {
  const check = await requireOwnerOrAdmin(slug);
  if ("error" in check) return { error: check.error };
  const { empresa } = check;

  const admin = createSupabaseServiceRoleClient();

  if (empresa.dominio_cloudflare_id) {
    try {
      await deleteCustomHostname(empresa.dominio_cloudflare_id);
    } catch {
      // segue removendo do nosso lado mesmo se a Cloudflare já não tiver o recurso
    }
  }

  const { error } = await admin
    .from("empresas")
    .update({ dominio_principal: null, dominio_status: "pendente", dominio_cloudflare_id: null })
    .eq("id", empresa.id);
  if (error) return { error: "Não foi possível remover o domínio." };

  if (empresa.dominio_principal) {
    await invalidateDomainCache({ hostnames: [empresa.dominio_principal], slugs: [slug] });
  }

  return { success: "Domínio removido. O acesso volta a ser pelo subdomínio." };
}
