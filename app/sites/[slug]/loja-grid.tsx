"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProdutoPublico } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "./add-to-cart-button";

const brl = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

/** Vitrine da loja com filtro por categoria (filtra no navegador; a lista já vem completa do servidor). */
export function LojaGrid({ produtos, minimal, card }: { produtos: ProdutoPublico[]; minimal: boolean; card: string }) {
  const categorias = [...new Set(produtos.map((p) => p.categoria_nome).filter((c): c is string => !!c))].sort();
  const [categoria, setCategoria] = useState<string | null>(null);
  const visiveis = categoria ? produtos.filter((p) => p.categoria_nome === categoria) : produtos;

  return (
    <div className="space-y-4">
      {categorias.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          {[null, ...categorias].map((c) => (
            <button
              key={c ?? "todas"}
              type="button"
              onClick={() => setCategoria(c)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                categoria === c ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40",
              )}
            >
              {c ?? "Todos"}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {visiveis.map((p) => (
          <Card key={p.id} className={cn(card, "flex flex-col overflow-hidden pt-0")}>
            <div className="relative aspect-square bg-muted">
              {p.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.foto_url} alt={p.nome} loading="lazy" className={cn("size-full object-cover", !p.disponivel && "opacity-50 grayscale")} />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ShoppingBag className="size-8" />
                </div>
              )}
              {!p.disponivel && (
                <span className="absolute top-2 left-2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium">Esgotado</span>
              )}
            </div>
            <CardHeader className="pb-0">
              <CardTitle className={minimal ? "text-sm" : "font-heading text-sm tracking-wide uppercase"}>{p.nome}</CardTitle>
            </CardHeader>
            <CardContent className="mt-auto space-y-2 text-sm text-muted-foreground">
              {p.descricao && <p className="line-clamp-2 text-xs">{p.descricao}</p>}
              <p className="text-base font-semibold text-foreground">{brl(p.preco)}</p>
              <AddToCartButton produtoId={p.id} nome={p.nome} preco={Number(p.preco)} foto={p.foto_url} disponivel={p.disponivel} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
