import { headers } from "next/headers";
import { resolveHost } from "@/lib/tenant/domain";

/**
 * Prefixo de caminho a usar em redirects dentro de Server Actions do tenant.
 *
 * Em produção final (subdomínio `{slug}.dominio.com`), o middleware já
 * reescreve a URL e o navegador vê caminhos relativos como "/admin" — nesse
 * caso o prefixo é vazio. Sem domínio próprio ainda (como no deploy
 * provisório do Cloudflare), o tenant só é acessível pelo caminho literal
 * "/sites/{slug}/...", então o redirect precisa incluir esse prefixo, senão
 * o navegador vai parar em "/admin" da raiz (404) em vez de
 * "/sites/{slug}/admin". Detectamos qual dos dois casos estamos vivendo lendo
 * o header Host da própria requisição.
 */
export async function tenantBasePath(slug: string): Promise<string> {
  const host = (await headers()).get("host");
  const { kind } = await resolveHost(host);
  return kind === "tenant" ? "" : `/sites/${slug}`;
}
