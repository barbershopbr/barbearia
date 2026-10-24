"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Estrutura dos painéis (barbearia e Master): no computador o menu fica fixo
 * na lateral; no celular vira uma gaveta aberta pelo botão do topo e fecha
 * sozinha ao navegar.
 */
export function PainelShell({ titulo, menu, children }: { titulo: string; menu: React.ReactNode; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  // Fecha a gaveta quando a página muda (clicou num item do menu).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reage à navegação
    setAberto(false);
  }, [pathname]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" className="-ml-1 rounded p-1 hover:bg-sidebar-accent">
          <Menu className="size-5" />
        </button>
        <p className="font-heading truncate text-sm font-semibold tracking-wide uppercase">{titulo}</p>
      </header>

      {aberto && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setAberto(false)} aria-hidden />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground transition-transform duration-200",
          "md:sticky md:top-0 md:h-screen md:w-56 md:translate-x-0",
          aberto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar menu"
          className="absolute top-3 right-3 rounded p-1 hover:bg-sidebar-accent md:hidden"
        >
          <X className="size-5" />
        </button>
        {menu}
      </aside>

      <main className="min-w-0 flex-1 bg-background p-4 md:p-6">{children}</main>
    </div>
  );
}
