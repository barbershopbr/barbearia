import { type NextRequest, NextResponse } from "next/server";
import { resolveHost } from "@/lib/tenant/domain";

// NOTA: usamos o nome antigo "middleware.ts" (não "proxy.ts", a convenção
// nova do Next 16) de propósito — proxy.ts sempre roda em runtime Node.js no
// Next 16 e o adaptador OpenNext Cloudflare ainda não suporta isso
// (https://github.com/opennextjs/opennextjs-cloudflare/issues/962).
// middleware.ts continua rodando em Edge Runtime, compatível com Workers.
// Reverter para proxy.ts quando o OpenNext adicionar suporte.
export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const resolution = await resolveHost(host);
  const { pathname, search } = request.nextUrl;

  if (resolution.kind === "marketing") {
    return NextResponse.next();
  }

  if (resolution.kind === "master") {
    const url = request.nextUrl.clone();
    url.pathname = `/master${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // kind === "tenant"
  if (resolution.redirectTo) {
    // Domínio próprio verificado: substitui o subdomínio (301 preserva
    // path/query — ver decisão em lib/tenant/domain.ts).
    const url = new URL(`https://${resolution.redirectTo}${pathname}${search}`);
    return NextResponse.redirect(url, 301);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/sites/${resolution.slug}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, exceto assets internos do Next.js e arquivos estáticos
     * (identificados por ter uma extensão, ex. .png, .ico).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
