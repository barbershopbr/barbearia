import Link from "next/link";
import { BadgePercent, CalendarDays, ChevronRight, LayoutDashboard, Settings, ShoppingBag, Users, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ItemMenu = { href: string; label: string };
export type GrupoMenu = { titulo: string; icone: LucideIcon; itens: ItemMenu[] };

export const ICONES_GRUPO = { LayoutDashboard, CalendarDays, ShoppingBag, Users, BadgePercent, Wallet, Settings };

/**
 * Menu lateral agrupado. Grupos abrem/fecham (<details>, sem JS); o grupo da
 * página atual já vem aberto e o item atual destacado. `data-tour` em cada
 * item é usado pelo tutorial (que abre o grupo antes de destacar).
 */
export function MenuPainel({ base, inicio, grupos, atual }: { base: string; inicio: ItemMenu | null; grupos: GrupoMenu[]; atual: string | null }) {
  const secaoDe = (href: string) => href.replace(/^\/admin\/?/, "");
  const ativo = (href: string) => atual !== null && secaoDe(href) === atual;
  const classeItem = (href: string) =>
    cn(
      "block rounded px-2 py-1.5 text-sm hover:bg-sidebar-accent",
      ativo(href) ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "text-sidebar-foreground/85",
    );

  return (
    <nav className="flex-1 space-y-1">
      {inicio && (
        <Link href={`${base}${inicio.href}`} data-tour="nav-inicio" className={cn(classeItem(inicio.href), "flex items-center gap-2 font-medium")}>
          <LayoutDashboard className="size-4" />
          {inicio.label}
        </Link>
      )}
      {grupos.map((g) => {
        const Icone = g.icone;
        const aberto = g.itens.some((i) => ativo(i.href));
        return (
          <details key={g.titulo} open={aberto} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold tracking-wider text-sidebar-foreground/60 uppercase hover:bg-sidebar-accent [&::-webkit-details-marker]:hidden">
              <Icone className="size-4" />
              <span className="flex-1">{g.titulo}</span>
              <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
            </summary>
            <div className="mt-0.5 mb-1 ml-3 space-y-0.5 border-l border-sidebar-border pl-2">
              {g.itens.map((i) => (
                <Link key={i.href} href={`${base}${i.href}`} data-tour={`nav-${secaoDe(i.href)}`} className={classeItem(i.href)} aria-current={ativo(i.href) ? "page" : undefined}>
                  {i.label}
                </Link>
              ))}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
