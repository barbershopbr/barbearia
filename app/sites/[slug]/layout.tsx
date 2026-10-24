import { notFound } from "next/navigation";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { TenantProvider } from "@/lib/tenant/context";
import { CartProvider } from "@/lib/cart/cart-context";

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
