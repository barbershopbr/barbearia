import { redirect } from "next/navigation";
import Link from "next/link";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { SignOutButton } from "../sign-out-button";
import { temRecurso, type Recurso } from "@/lib/plano/recursos";

const NAV_ITEMS: { href: string; label: string; recurso?: Recurso }[] = [
  { href: "/area-cliente", label: "Início" },
  { href: "/area-cliente/historico", label: "Histórico" },
  { href: "/area-cliente/produtos", label: "Produtos", recurso: "loja" },
  { href: "/area-cliente/pagamentos", label: "Pedidos" },
  { href: "/area-cliente/fidelidade", label: "Fidelidade", recurso: "fidelidade" },
];

export default async function AreaClientePainelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const base = await tenantBasePath(slug);
  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) redirect(`${base}/area-cliente/login`);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-wide uppercase">Olá, {cliente.nome}</h1>
          <p className="text-sm text-muted-foreground">{empresa.nome}</p>
        </div>
        <SignOutButton slug={slug} />
      </div>

      <nav className="flex flex-wrap gap-1 border-b pb-2">
        {NAV_ITEMS.filter((item) => !item.recurso || temRecurso(empresa, item.recurso)).map((item) => (
          <Link
            key={item.href}
            href={`${base}${item.href}`}
            className="rounded px-3 py-1.5 text-sm tracking-wide uppercase hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
