"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelarAgendamentoCliente } from "../agendamento-actions";

export function CancelarAgendamentoButton({ slug, agendamentoId }: { slug: string; agendamentoId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirmando) {
    return (
      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmando(true)}>
        Cancelar
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-xs text-muted-foreground">Cancelar este horário?</span>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await cancelarAgendamentoCliente(slug, agendamentoId);
            if (r.error) setErro(r.error);
          })
        }
      >
        {pending ? "Cancelando..." : "Sim, cancelar"}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmando(false)}>
        Não
      </Button>
      {erro && <p className="w-full text-right text-xs text-destructive">{erro}</p>}
    </div>
  );
}
