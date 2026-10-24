import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { TenantProvider } from "@/lib/tenant/context";
import { CartProvider } from "@/lib/cart/cart-context";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return {};
  const icone = empresa.favicon_url || empresa.logo_url;
  return {
    title: { default: empresa.nome, template: `%s · ${empresa.nome}` },
    description: empresa.descricao ?? `Agende seu horário em ${empresa.nome}.`,
    icons: icone ? { icon: icone, apple: empresa.logo_url ?? icone } : undefined,
    openGraph: {
      title: empresa.nome,
      description: empresa.descricao ?? undefined,
      images: empresa.banner_url ? [empresa.banner_url] : undefined,
    },
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);

  if (!empresa) {
    notFound();
  }

  const cores = empresa.cores as { primaria?: string; secundaria?: string };

  return (
    <TenantProvider empresa={empresa}>
      <CartProvider slug={slug}>
        <div
          data-tenant={empresa.slug}
          style={
            {
              "--tenant-primary": cores.primaria || "#171717",
              "--tenant-secondary": cores.secundaria || "#404040",
            } as React.CSSProperties
          }
          className="min-h-screen"
        >
          {children}
        </div>
      </CartProvider>
    </TenantProvider>
  );
}
