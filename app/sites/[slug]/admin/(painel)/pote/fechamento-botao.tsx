"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { fecharMesPote, reabrirMesPote } from "./actions";

export function FechamentoBotao({ slug, competencia, fechado, podeFechar }: { slug: string; competencia: string; fechado: boolean; podeFechar: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const agir = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setErro(null);
      const r = await fn();
      if (r.error) setErro(r.error);
      setConfirmando(false);
    });

  if (fechado) {
    return (
      <div className="space-y-1">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => agir(() => reabrirMesPote(slug, competencia))}>
          {pending ? "Reabrindo..." : "Reabrir mês"}
        </Button>
        {erro && <p className="text-xs text-destructive">{erro}</p>}
      </div>
    );
  }
  if (!podeFechar) return <p className="text-xs text-muted-foreground">Prévia — o fechamento fica disponível quando o mês terminar.</p>;

  return (
    <div className="space-y-1">
      {confirmando ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Fechar o mês e gerar as comissões?</span>
          <Button size="sm" disabled={pending} onClick={() => agir(() => fecharMesPote(slug, competencia))}>
            {pending ? "Fechando..." : "Sim, fechar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={() => setConfirmando(true)}>
          Fechar mês
        </Button>
      )}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
