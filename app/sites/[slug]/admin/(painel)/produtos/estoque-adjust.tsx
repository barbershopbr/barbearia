"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ajustarEstoque } from "./actions";

export function EstoqueAdjust({
  produtoId,
  empresaId,
  estoqueAtual,
}: {
  produtoId: string;
  empresaId: string;
  estoqueAtual: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        disabled={pending || estoqueAtual <= 0}
        onClick={() => startTransition(() => ajustarEstoque(produtoId, empresaId, -1))}
      >
        −
      </Button>
      <span className="w-8 text-center tabular-nums">{estoqueAtual}</span>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => ajustarEstoque(produtoId, empresaId, 1))}
      >
        +
      </Button>
    </div>
  );
}
