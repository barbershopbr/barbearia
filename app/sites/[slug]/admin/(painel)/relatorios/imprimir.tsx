"use client";

import { Button } from "@/components/ui/button";

/** Abre a impressão do navegador (dá para "Salvar como PDF"). O layout esconde o menu na impressão. */
export function BotaoImprimir() {
  return (
    <Button size="sm" variant="outline" onClick={() => window.print()}>
      Imprimir / PDF
    </Button>
  );
}
