"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { rodarRotinaCobranca } from "./actions";

export function RotinaBotao() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await rodarRotinaCobranca();
            setMsg(r.error ?? r.resultado ?? null);
          })
        }
      >
        {pending ? "Rodando..." : "Gerar faturas / verificar atrasos agora"}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
