import "server-only";
import type { EmpresaDominioStatus } from "@/lib/supabase/types";

/**
 * Provisionamento de domínio próprio via Cloudflare for SaaS (Custom
 * Hostnames) — https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/
 *
 * Pré-requisitos que só dá pra fazer uma vez, manualmente (painel/API
 * Cloudflare, fora deste código):
 * 1. Habilitar "Cloudflare for SaaS" na zona `usebrcontrol.com.br`.
 * 2. Configurar o "Fallback Origin" da zona apontando pro app (mesmo host
 *    usado pelo domínio raiz/subdomínios).
 * 3. Gerar um API Token (não a Global API Key) escopado só nessa zona, com
 *    permissão "SSL and Certificates: Edit" + "Custom Hostnames: Edit" —
 *    salvar em CLOUDFLARE_API_TOKEN. CLOUDFLARE_ZONE_ID vem em
 *    Overview > API na zona.
 *
 * Fluxo por empresa (ver actions em app/master/(painel) e
 * app/sites/[slug]/admin): empresa aponta um CNAME do domínio dela pro
 * fallback origin -> createCustomHostname() cria o recurso na Cloudflare
 * (valida posse + emite SSL via "http", que depende desse mesmo CNAME já
 * estar no ar) -> getCustomHostnameStatus() é chamado (botão "verificar
 * novamente") até virar "verificado".
 */

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

type CloudflareCustomHostname = {
  id: string;
  hostname: string;
  status: string;
  ssl?: { status?: string };
};

function config(): { apiToken: string; zoneId: string } | null {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!apiToken || !zoneId) return null;
  return { apiToken, zoneId };
}

export function isCloudflareConfigured(): boolean {
  return config() !== null;
}

async function cfFetch(path: string, init?: RequestInit): Promise<unknown> {
  const cfg = config();
  if (!cfg) {
    throw new Error("Provisionamento de domínio não configurado (faltam CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID).");
  }

  const res = await fetch(`${CLOUDFLARE_API_BASE}/zones/${cfg.zoneId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await res.json()) as { success: boolean; result: unknown; errors?: { message: string }[] };

  if (!res.ok || !body.success) {
    const message = body.errors?.[0]?.message ?? `Erro ${res.status} na API da Cloudflare.`;
    throw new Error(message);
  }

  return body.result;
}

/** Traduz o status bruto da Cloudflare (hostname + ssl, muitos valores possíveis) pro nosso enum de 3 estados. */
function mapStatus(hostname: CloudflareCustomHostname): EmpresaDominioStatus {
  const sslStatus = hostname.ssl?.status;

  if (hostname.status === "active" && sslStatus === "active") return "verificado";

  const failedStates = new Set([
    "blocked",
    "test_blocked",
    "test_failed",
    "pending_deletion",
    "deleted",
  ]);
  const failedSslStates = new Set([
    "initializing_timed_out",
    "validation_timed_out",
    "issuance_timed_out",
    "deployment_timed_out",
    "deletion_timed_out",
    "expired",
    "deactivating",
    "inactive",
  ]);
  if (failedStates.has(hostname.status) || (sslStatus && failedSslStates.has(sslStatus))) {
    return "falhou";
  }

  return "pendente";
}

export async function createCustomHostname(hostname: string): Promise<{ cloudflareId: string; status: EmpresaDominioStatus }> {
  const result = (await cfFetch("/custom_hostnames", {
    method: "POST",
    body: JSON.stringify({ hostname, ssl: { method: "http", type: "dv" } }),
  })) as CloudflareCustomHostname;

  return { cloudflareId: result.id, status: mapStatus(result) };
}

export async function getCustomHostnameStatus(cloudflareId: string): Promise<EmpresaDominioStatus> {
  const result = (await cfFetch(`/custom_hostnames/${cloudflareId}`)) as CloudflareCustomHostname;
  return mapStatus(result);
}

export async function deleteCustomHostname(cloudflareId: string): Promise<void> {
  await cfFetch(`/custom_hostnames/${cloudflareId}`, { method: "DELETE" });
}
