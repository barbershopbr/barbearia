import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const RESERVED_SUBDOMAINS = new Set(["www", "master", "admin"]);

/** TTL do cache de resolução de domínio (KV `TENANT_DOMAINS`). Curto de propósito: troca de domínio precisa refletir rápido, e a invalidação em invalidateDomainCache() já cobre o caso comum (usuário troca na hora). Isso é só rede de segurança. */
const DOMAIN_CACHE_TTL_SECONDS = 300;

export function rootDomain(): string {
  return process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "usebrcontrol.com.br"
    : process.env.NEXT_PUBLIC_ROOT_DOMAIN_DEV ?? "lvh.me:3000";
}

/**
 * Origem fixa do app (ex.: https://usebrcontrol.conta.workers.dev) para o
 * deploy provisório, antes de o DNS do domínio raiz apontar para o Worker.
 * Quando definida, os links absolutos usam o modo por caminho
 * (/sites/{slug}, /master) que o middleware já atende em qualquer host.
 */
function appOrigin(): string | null {
  const origin = process.env.APP_ORIGIN?.trim();
  return origin ? origin.replace(/\/+$/, "") : null;
}

/** URL de origem completa (com protocolo) do site de um tenant, para montar links absolutos (ex.: e-mail de reset de senha). */
export function tenantOrigin(slug: string): string {
  const fixed = appOrigin();
  if (fixed) return `${fixed}/sites/${slug}`;
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${slug}.${rootDomain()}`;
}

/** Endereço do site do tenant para exibir na tela (sem protocolo). */
export function tenantLabel(slug: string): string {
  return tenantOrigin(slug).replace(/^https?:\/\//, "");
}

/** URL de origem completa do painel Master (subdomínio "master"). */
export function masterOrigin(): string {
  const fixed = appOrigin();
  if (fixed) return `${fixed}/master`;
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://master.${rootDomain()}`;
}

export type HostResolution =
  | { kind: "marketing"; slug: null }
  | { kind: "master"; slug: null }
  | { kind: "tenant"; slug: string; redirectTo?: string };

/**
 * Extrai o tenant a partir do host da requisição.
 *
 * Dois caminhos:
 * - Subdomínio da plataforma ({slug}.{rootDomain}) — resolvido sem I/O, como
 *   sempre foi. Se essa empresa já tiver domínio próprio verificado,
 *   `redirectTo` vem preenchido (o middleware faz um 301 pra lá — domínio
 *   próprio substitui o subdomínio).
 * - Qualquer outro host — candidato a domínio próprio de alguma empresa
 *   (dominio_principal/dominio_secundario). Consulta o Supabase (com cache
 *   em KV) e só resolve como tenant se o domínio estiver verificado.
 */
export async function resolveHost(host: string | null): Promise<HostResolution> {
  const domain = rootDomain();
  const hostname = (host ?? "").toLowerCase().split(":")[0];
  const domainHostname = domain.split(":")[0];

  if (!hostname || hostname === domainHostname) {
    return { kind: "marketing", slug: null };
  }

  if (hostname.endsWith(`.${domainHostname}`)) {
    const subdomain = hostname.slice(0, hostname.length - domainHostname.length - 1);

    if (subdomain === "www") return { kind: "marketing", slug: null };
    if (subdomain === "master" || subdomain === "admin") return { kind: "master", slug: null };
    if (RESERVED_SUBDOMAINS.has(subdomain)) return { kind: "marketing", slug: null };

    const redirectTo = await lookupVerifiedDomainForSlug(subdomain);
    return { kind: "tenant", slug: subdomain, redirectTo: redirectTo ?? undefined };
  }

  // Não é subdomínio da plataforma: candidato a domínio próprio de alguma
  // empresa. Não encontrado / não verificado ainda / host desconhecido (ex.:
  // acesso direto pelo domínio de preview da Cloudflare) — trata como
  // marketing para não vazar tenant nem quebrar o preview.
  const custom = await lookupSlugForCustomDomain(hostname);
  if (!custom) {
    return { kind: "marketing", slug: null };
  }
  return { kind: "tenant", slug: custom.slug };
}

// ---------------------------------------------------------------------------
// Lookup de domínio (Supabase, anon key — só enxerga empresas status='ativo',
// mesma regra da policy empresas_select_public) + cache em Cloudflare KV.
// ---------------------------------------------------------------------------

type EmpresaDomainInfo = {
  slug: string;
  empresaId: string;
  dominioPrincipal: string | null;
  dominioStatus: "pendente" | "verificado" | "falhou";
};

function anonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  // Client "cru" (sem @supabase/ssr) de propósito: essa consulta roda no
  // middleware (sem acesso a cookies/document) e é sempre anônima — o
  // isolamento fica por conta da RLS (status = 'ativo'), igual ao restante
  // do app.
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchEmpresaDomainInfo(
  column: "slug" | "dominio_principal" | "dominio_secundario",
  value: string,
): Promise<EmpresaDomainInfo | null> {
  const supabase = anonSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("empresas")
    .select("id, slug, dominio_principal, dominio_status")
    .eq(column, value)
    .eq("status", "ativo")
    .maybeSingle();

  if (error || !data) return null;
  return {
    slug: data.slug,
    empresaId: data.id,
    dominioPrincipal: data.dominio_principal,
    dominioStatus: data.dominio_status,
  };
}

async function lookupSlugForCustomDomain(hostname: string): Promise<{ slug: string; empresaId: string } | null> {
  const cacheKey = `host:${hostname}`;
  const cached = await kvRead(cacheKey);
  if (cached !== undefined && cached !== null) {
    return JSON.parse(cached) as { slug: string; empresaId: string } | null;
  }

  let info = await fetchEmpresaDomainInfo("dominio_principal", hostname);
  if (!info) info = await fetchEmpresaDomainInfo("dominio_secundario", hostname);

  const result = info && info.dominioStatus === "verificado" ? { slug: info.slug, empresaId: info.empresaId } : null;
  await kvWrite(cacheKey, JSON.stringify(result));
  return result;
}

async function lookupVerifiedDomainForSlug(slug: string): Promise<string | null> {
  const cacheKey = `slug-redirect:${slug}`;
  const cached = await kvRead(cacheKey);
  if (cached !== undefined && cached !== null) {
    return (JSON.parse(cached) as { redirectTo: string | null }).redirectTo;
  }

  const info = await fetchEmpresaDomainInfo("slug", slug);
  const redirectTo = info && info.dominioStatus === "verificado" ? info.dominioPrincipal : null;
  await kvWrite(cacheKey, JSON.stringify({ redirectTo }));
  return redirectTo;
}

/**
 * Invalidação write-through: chamar sempre que dominio_principal,
 * dominio_secundario, dominio_status ou status de uma empresa mudar (ver
 * lib/cloudflare/custom-hostnames.ts e as actions de domínio do Master/admin
 * do tenant). Best-effort — se a KV não estiver disponível, o TTL curto do
 * cache já limita o estrago de um valor desatualizado.
 */
export async function invalidateDomainCache(keys: { hostnames?: string[]; slugs?: string[] }) {
  const kv = getKv();
  if (!kv) return;
  try {
    await Promise.all([
      ...(keys.hostnames ?? []).map((h) => kv.delete(`host:${h.toLowerCase()}`)),
      ...(keys.slugs ?? []).map((s) => kv.delete(`slug-redirect:${s}`)),
    ]);
  } catch {
    // best-effort
  }
}

function getKv(): KVNamespace | null {
  try {
    return getCloudflareContext().env.TENANT_DOMAINS ?? null;
  } catch {
    // Sem contexto Cloudflare disponível (ex.: ambiente de build/teste que
    // não passou por initOpenNextCloudflareForDev) — cai pro modo sem cache.
    return null;
  }
}

async function kvRead(key: string): Promise<string | null | undefined> {
  const kv = getKv();
  if (!kv) return undefined;
  try {
    return await kv.get(key);
  } catch {
    return undefined;
  }
}

async function kvWrite(key: string, value: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.put(key, value, { expirationTtl: DOMAIN_CACHE_TTL_SECONDS });
  } catch {
    // cache é best-effort
  }
}
