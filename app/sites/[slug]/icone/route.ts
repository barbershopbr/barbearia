import { NextResponse, type NextRequest } from "next/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { lerSiteConfig, corTextoSobre } from "@/lib/site/config";

/**
 * Ícone do app (PWA) gerado com a inicial e as cores da barbearia — funciona
 * mesmo sem logo enviado. ?t=tamanho, ?m=1 deixa margem extra (ícone "maskable").
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return new NextResponse("Não encontrado", { status: 404 });

  const tamanho = Math.min(Math.max(Number(request.nextUrl.searchParams.get("t")) || 512, 48), 1024);
  const maskable = request.nextUrl.searchParams.get("m") === "1";
  const fundo = ((empresa.cores ?? {}) as { primaria?: string }).primaria || "#171717";
  const destaque = lerSiteConfig(empresa.site_config).corDestaque;
  const letra = (empresa.nome.trim()[0] ?? "B").toUpperCase().replace(/[<>&"']/g, "");
  const raio = maskable ? 0 : tamanho * 0.22;
  const fonte = tamanho * (maskable ? 0.42 : 0.52);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 ${tamanho} ${tamanho}">
<rect width="${tamanho}" height="${tamanho}" rx="${raio}" fill="${fundo}"/>
<circle cx="${tamanho / 2}" cy="${tamanho / 2}" r="${tamanho * (maskable ? 0.3 : 0.38)}" fill="none" stroke="${destaque}" stroke-width="${tamanho * 0.025}"/>
<text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Oswald, Arial, sans-serif" font-weight="700" font-size="${fonte}" fill="${corTextoSobre(fundo)}">${letra}</text>
</svg>`;

  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
