import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Scissors } from "lucide-react";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { signOutStaff } from "../actions";
import { Button } from "@/components/ui/button";
import { PLANOS_SAAS, temRecurso, type Recurso } from "@/lib/plano/recursos";
import { PAPEL_LABEL, nivelSecao, podeAcessarSecao, secaoDoCaminho, secaoInicial } from "@/lib/auth/papeis";

const NAV_ITEMS: { href: string; label: string; recurso?: Recurso }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/funcionarios", label: "Funcionários" },
  { href: "/admin/pedidos", label: "Pedidos", recurso: "loja" },
  { href: "/admin/planos", label: "Planos", recurso: "assinaturas" },
  { href: "/admin/assinaturas", label: "Assinaturas", recurso: "assinaturas" },
  { href: "/admin/produtos", label: "Produtos", recurso: "loja" },
  { href: "/admin/fornecedores", label: "Fornecedores", recurso: "loja" },
  { href: "/admin/cupons", label: "Cupons", recurso: "cupons" },
  { href: "/admin/fidelidade", label: "Fidelidade", recurso: "fidelidade" },
  { href: "/admin/comissoes", label: "Comissões", recurso: "comissoes" },
  { href: "/admin/financeiro", label: "Financeiro", recurso: "financeiro" },
  { href: "/admin/pagamentos", label: "Recebimentos" },
  { href: "/admin/dominio", label: "Domínio", recurso: "dominio_proprio" },
  { href: "/admin/site", label: "Aparência do site" },
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

  // Página fora do papel (ex.: barbeiro abrindo /admin/financeiro pela URL):
  // manda para a primeira seção liberada. O menu abaixo já esconde o resto.
  const secao = secaoDoCaminho((await headers()).get("x-pathname") ?? "");
  if (secao !== null && !podeAcessarSecao(staff, secao)) {
    const destino = secaoInicial(staff);
    redirect(`${base}/admin${destino ? `/${destino}` : ""}`);
  }

  const itens = NAV_ITEMS.filter(
    (item) =>
      (!item.recurso || temRecurso(empresa, item.recurso)) &&
      podeAcessarSecao(staff, item.href.replace(/^\/admin\/?/, "")),
  );

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
        <div className="mb-6 flex items-center gap-2">
          <Scissors className="size-4 shrink-0" />
          <p className="font-heading truncate text-sm font-semibold tracking-wide uppercase">{empresa.nome}</p>
        </div>
        <nav className="flex-1 space-y-1">
          {itens.map((item) => (
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
          <p className="mb-1 text-xs text-sidebar-foreground/60">Plano {PLANOS_SAAS[empresa.plano_saas].nome}</p>
          <p className="mb-2 text-xs text-sidebar-foreground/60">{staff.nome} · {PAPEL_LABEL[staff.role]}</p>
          <form action={signOutStaff.bind(null, slug)}>
            <Button type="submit" variant="outline" size="sm" className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent">
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 bg-background p-6">
        {secao !== null && nivelSecao(staff, secao) === "ver" && (
          <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Você pode ver esta seção, mas não alterar. Fale com o responsável se precisar editar.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
