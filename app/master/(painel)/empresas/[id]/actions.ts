"use server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { requireMaster } from "@/lib/auth/current-master";
import { invalidateDomainCache } from "@/lib/tenant/domain";
import { createCustomHostname, deleteCustomHostname, getCustomHostnameStatus, isCloudflareConfigured } from "@/lib/cloudflare/custom-hostnames";
import type { ActionState } from "../../../../sites/[slug]/area-cliente/actions";
import { PLANOS_SAAS, RECURSO_LABEL } from "@/lib/plano/recursos";
import type { PlanoSaas } from "@/lib/supabase/types";

const DOMINIO_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

function normalizarDominio(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export async function updateEmpresaDetalhes(
  empresaId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireMaster();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Nome é obrigatório." };

  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin
    .from("empresas")
    .update({
      nome,
      descricao: String(formData.get("descricao") ?? "").trim() || null,
      endereco: String(formData.get("endereco") ?? "").trim() || null,
      telefone: String(formData.get("telefone") ?? "").trim() || null,
      whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
      instagram: String(formData.get("instagram") ?? "").trim() || null,
    })
    .eq("id", empresaId);

  if (error) return { error: "Não foi possível salvar as alterações." };

  return { success: "Dados atualizados." };
}

export async function updateEmpresaPlano(
  empresaId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireMaster();

  const plano = String(formData.get("plano_saas") ?? "") as PlanoSaas;
  if (!(plano in PLANOS_SAAS)) return { error: "Plano inválido." };

  const recursosExtras: Record<string, boolean> = {};
  for (const recurso of Object.keys(RECURSO_LABEL)) {
    const valor = formData.get(`recurso_${recurso}`);
    if (valor === "liberado") recursosExtras[recurso] = true;
    if (valor === "bloqueado") recursosExtras[recurso] = false;
  }

  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin
    .from("empresas")
    .update({ plano_saas: plano, recursos_extras: recursosExtras })
    .eq("id", empresaId);

  if (error) return { error: "Não foi possível salvar o plano." };
  return { success: `Plano ${PLANOS_SAAS[plano].nome} salvo.` };
}

export async function configurarDominioEmpresa(
  empresaId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireMaster();

  if (!isCloudflareConfigured()) {
    return { error: "Provisionamento de domínio não configurado no servidor (CLOUDFLARE_API_TOKEN/CLOUDFLARE_ZONE_ID)." };
  }

  const dominio = normalizarDominio(String(formData.get("dominio") ?? ""));
  if (!DOMINIO_REGEX.test(dominio)) {
    return { error: "Domínio inválido. Use o formato exemplo.com.br, sem \"http://\" ou caminho." };
  }

  const admin = createSupabaseServiceRoleClient();
  const { data: empresa } = await admin
    .from("empresas")
    .select("slug, dominio_principal, dominio_cloudflare_id")
    .eq("id", empresaId)
    .maybeSingle();
  if (!empresa) return { error: "Empresa não encontrada." };

  if (empresa.dominio_cloudflare_id) {
    // Troca de domínio: remove o recurso antigo na Cloudflare antes de criar
    // o novo (best-effort — se já tiver sido removido lá, ignora o erro).
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
      .eq("id", empresaId);
    if (error) return { error: "Domínio criado na Cloudflare, mas não foi possível salvar no banco. Tente novamente." };

    await invalidateDomainCache({
      hostnames: [dominio, ...(empresa.dominio_principal ? [empresa.dominio_principal] : [])],
      slugs: [empresa.slug],
    });

    return {
      success:
        status === "verificado"
          ? "Domínio configurado e verificado."
          : "Domínio criado na Cloudflare. Aponte um CNAME desse domínio para o app e clique em \"Verificar novamente\" — a emissão do SSL pode levar alguns minutos.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não foi possível criar o domínio na Cloudflare." };
  }
}

export async function verificarDominioEmpresa(empresaId: string): Promise<ActionState> {
  await requireMaster();

  const admin = createSupabaseServiceRoleClient();
  const { data: empresa } = await admin
    .from("empresas")
    .select("slug, dominio_principal, dominio_cloudflare_id")
    .eq("id", empresaId)
    .maybeSingle();
  if (!empresa?.dominio_cloudflare_id) return { error: "Essa empresa não tem domínio cadastrado." };

  try {
    const status = await getCustomHostnameStatus(empresa.dominio_cloudflare_id);
    await admin.from("empresas").update({ dominio_status: status }).eq("id", empresaId);
    if (empresa.dominio_principal) {
      await invalidateDomainCache({ hostnames: [empresa.dominio_principal], slugs: [empresa.slug] });
    }
    return status === "verificado"
      ? { success: "Domínio verificado! O subdomínio antigo já redireciona pra lá." }
      : { error: `Ainda não verificado (status: ${status}). Confirme o CNAME e tente de novo em alguns minutos.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não foi possível consultar o status na Cloudflare." };
  }
}

export async function removerDominioEmpresa(empresaId: string): Promise<ActionState> {
  await requireMaster();

  const admin = createSupabaseServiceRoleClient();
  const { data: empresa } = await admin
    .from("empresas")
    .select("slug, dominio_principal, dominio_cloudflare_id")
    .eq("id", empresaId)
    .maybeSingle();
  if (!empresa) return { error: "Empresa não encontrada." };

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
    .eq("id", empresaId);
  if (error) return { error: "Não foi possível remover o domínio." };

  if (empresa.dominio_principal) {
    await invalidateDomainCache({ hostnames: [empresa.dominio_principal], slugs: [empresa.slug] });
  }

  return { success: "Domínio removido. O acesso volta a ser pelo subdomínio." };
}
