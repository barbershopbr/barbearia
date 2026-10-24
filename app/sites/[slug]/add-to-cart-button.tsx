"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-context";

export function AddToCartButton({
  produtoId,
  nome,
  preco,
  foto,
  disponivel = true,
}: {
  produtoId: string;
  nome: string;
  preco: number;
  foto?: string | null;
  disponivel?: boolean;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  if (!disponivel) {
    return (
      <Button size="sm" variant="outline" className="w-full" disabled>
        Esgotado
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="w-full"
      onClick={() => {
        addItem({ produtoId, nome, preco, foto });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? "Adicionado ✓" : "Adicionar ao carrinho"}
    </Button>
  );
}
