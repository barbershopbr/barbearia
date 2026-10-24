"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCart } from "@/lib/cart/cart-context";
import { criarPedido } from "./pedido-actions";
import { validarCupom } from "./cupom-actions";

export function CartWidget({ slug, loggedIn, entrarHref }: { slug: string; loggedIn: boolean; entrarHref: string }) {
  const { items, count, total, updateQuantidade, removeItem, clear } = useCart();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const [codigoCupom, setCodigoCupom] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{ codigo: string; desconto: number } | null>(null);
  const [cupomErro, setCupomErro] = useState<string | null>(null);
  const [validandoCupom, startValidacaoCupom] = useTransition();

  const desconto = cupomAplicado?.desconto ?? 0;
  const totalComDesconto = Math.max(total - desconto, 0);

  function aplicarCupom() {
    setCupomErro(null);
    startValidacaoCupom(async () => {
      const res = await validarCupom(slug, codigoCupom, total);
      if (res.erro) {
        setCupomAplicado(null);
        setCupomErro(res.erro);
      } else {
        setCupomAplicado({ codigo: codigoCupom.trim().toUpperCase(), desconto: res.desconto ?? 0 });
      }
    });
  }

  function removerCupom() {
    setCupomAplicado(null);
    setCodigoCupom("");
    setCupomErro(null);
  }

  function finalizarPedido() {
    startTransition(async () => {
      const result = await criarPedido(slug, items, cupomAplicado?.codigo ?? "");
      setMessage(result.error ?? result.success ?? null);
      setIsError(!!result.error);
      if (result.success) {
        clear();
        removerCupom();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="relative border-white/40 bg-white/10 text-white hover:bg-white/20">
            <ShoppingBag className="size-4" />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                {count}
              </span>
            )}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Carrinho</DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Seu carrinho está vazio.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.produtoId} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">R$ {item.preco.toFixed(2)} cada</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon-sm" variant="outline" onClick={() => updateQuantidade(item.produtoId, item.quantidade - 1)}>
                      −
                    </Button>
                    <span className="w-6 text-center tabular-nums">{item.quantidade}</span>
                    <Button type="button" size="icon-sm" variant="outline" onClick={() => updateQuantidade(item.produtoId, item.quantidade + 1)}>
                      +
                    </Button>
                  </div>
                  <Button type="button" size="sm" variant="destructive" onClick={() => removeItem(item.produtoId)}>
                    Remover
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t pt-3">
              {cupomAplicado ? (
                <div className="flex items-center justify-between text-sm text-emerald-600">
                  <span>
                    Cupom <span className="font-mono font-medium">{cupomAplicado.codigo}</span> aplicado
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={removerCupom}>
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={codigoCupom}
                    onValueChange={(v) => setCodigoCupom(v)}
                    placeholder="Cupom de desconto"
                    className="uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={validandoCupom || !codigoCupom.trim()}
                    onClick={aplicarCupom}
                  >
                    {validandoCupom ? "..." : "Aplicar"}
                  </Button>
                </div>
              )}
              {cupomErro && <p className="text-sm text-destructive">{cupomErro}</p>}
            </div>

            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Desconto</span>
                  <span>- R$ {desconto.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>R$ {totalComDesconto.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Retirada na barbearia · pagamento na hora da retirada.</p>

            {message && <p className={`text-sm ${isError ? "text-destructive" : "text-emerald-600"}`}>{message}</p>}

            {loggedIn ? (
              <Button className="w-full" disabled={pending} onClick={finalizarPedido}>
                {pending ? "Enviando..." : "Finalizar pedido"}
              </Button>
            ) : (
              <Button className="w-full" render={<Link href={entrarHref}>Entrar para finalizar</Link>} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
