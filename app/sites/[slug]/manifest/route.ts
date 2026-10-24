import { NextResponse } from "next/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { lerSiteConfig } from "@/lib/site/config";

/**
 * Web App Manifest de cada barbearia: o site instala no celular com o nome,
 * as cores e o logo dela. Sem extensão no caminho porque o middleware ignora
 * URLs com ponto (não reescreveria para o tenant).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return new NextResponse("Não encontrado", { status: 404 });

  const base = await tenantBasePath(slug);
  const cores = (empresa.cores ?? {}) as { primaria?: string };
  const config = lerSiteConfig(empresa.site_config);
  const corTema = cores.primaria || "#171717";
  const icones = [
    // Ícone gerado (inicial + cores) sempre presente; o logo enviado entra como opção.
    { src: `${base}/icone?t=192`, sizes: "192x192", type: "image/svg+xml", purpose: "any" },
    { src: `${base}/icone?t=512`, sizes: "512x512", type: "image/svg+xml", purpose: "any" },
    { src: `${base}/icone?t=512&m=1`, sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ...(empresa.logo_url ? [{ src: empresa.logo_url, sizes: "512x512", purpose: "any" }] : []),
  ];

  return NextResponse.json(
    {
      name: empresa.nome,
      short_name: empresa.nome.length > 12 ? empresa.nome.split(" ")[0] : empresa.nome,
      description: empresa.descricao ?? `Agende seu horário em ${empresa.nome}.`,
      start_url: `${base}/`,
      scope: `${base}/`,
      display: "standalone",
      background_color: config.tema === "minimal" ? "#ffffff" : corTema,
      theme_color: corTema,
      lang: "pt-BR",
      icons: icones,
      shortcuts: [
        { name: "Agendar horário", url: `${base}/agendar` },
        { name: "Meus horários", url: `${base}/area-cliente` },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
