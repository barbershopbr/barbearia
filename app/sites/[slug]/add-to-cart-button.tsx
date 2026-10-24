"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-context";

export function AddToCartButton({ produtoId, nome, preco }: { produtoId: string; nome: string; preco: number }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <Button
      size="sm"
      className="w-full"
      onClick={() => {
        addItem({ produtoId, nome, preco });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? "Adicionado ✓" : "Adicionar ao carrinho"}
    </Button>
  );
}
