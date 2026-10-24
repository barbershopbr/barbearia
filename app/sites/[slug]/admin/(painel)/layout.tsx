import { redirect } from "next/navigation";
import Link from "next/link";
import { Scissors } from "lucide-react";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { signOutStaff } from "../actions";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/funcionarios", label: "Funcionários" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/planos", label: "Planos" },
  { href: "/admin/assinaturas", label: "Assinaturas" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/fornecedores", label: "Fornecedores" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/fidelidade", label: "Fidelidade" },
  { href: "/admin/comissoes", label: "Comissões" },
  { href: "/admin/financeiro", label: "Financeiro" },
  { href: "/admin/dominio", label: "Domínio" },
  { href: "/admin/configuracoes", label: "Configurações" },
  { href: "/admin/meu-historico", label: "Meu Histórico" },
];

export default async function AdminPainelLayout({
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
  const staff = await getCurrentStaff(empresa.id);
  if (!staff) redirect(`${base}/admin/login`);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
        <div className="mb-6 flex items-center gap-2">
          <Scissors className="size-4 shrink-0" />
          <p className="font-heading truncate text-sm font-semibold tracking-wide uppercase">{empresa.nome}</p>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={`${base}${item.href}`}
              className="block rounded px-2 py-1.5 text-sm tracking-wide uppercase hover:bg-sidebar-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-sidebar-border pt-4">
          <p className="mb-2 text-xs text-sidebar-foreground/60">{staff.nome} · {staff.role}</p>
          <form action={signOutStaff.bind(null, slug)}>
            <Button type="submit" variant="outline" size="sm" className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent">
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 bg-background p-6">{children}</main>
    </div>
  );
}
