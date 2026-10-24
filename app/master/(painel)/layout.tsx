import { redirect } from "next/navigation";
import Link from "next/link";
import { Skull } from "lucide-react";
import { getCurrentMaster } from "@/lib/auth/current-master";
import { masterBasePath } from "@/lib/tenant/master-base-path";
import { signOutMaster } from "../actions";
import { Button } from "@/components/ui/button";
import { PainelShell } from "@/components/painel-shell";

const NAV = [
  { href: "/metricas", label: "Métricas" },
  { href: "", label: "Empresas" },
  { href: "/faturas", label: "Faturas" },
  { href: "/notas-fiscais", label: "Notas fiscais" },
];

export default async function MasterPainelLayout({ children }: { children: React.ReactNode }) {
  const base = await masterBasePath();
  const master = await getCurrentMaster();
  if (!master) redirect(`${base}/login`);

  return (
    <PainelShell
      titulo="BarberControl"
      menu={
        <>
          <div className="mb-6 flex items-center gap-2">
            <Skull className="size-4 shrink-0" />
            <p className="font-heading text-sm font-semibold tracking-wide uppercase">BarberControl</p>
          </div>
          <nav className="flex-1 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={`${base}${item.href}` || "/"}
                className="block rounded px-2 py-1.5 text-sm tracking-wide uppercase hover:bg-sidebar-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 border-t border-sidebar-border pt-4">
            <p className="mb-2 text-xs text-sidebar-foreground/60">{master.nome}</p>
            <form action={signOutMaster}>
              <Button type="submit" variant="outline" size="sm" className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent">
                Sair
              </Button>
            </form>
          </div>
        </>
      }
    >
      {children}
    </PainelShell>
  );
}
