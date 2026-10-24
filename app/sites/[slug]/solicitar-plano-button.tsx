"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { solicitarPlano } from "./solicitar-plano-actions";

export function SolicitarPlanoButton({ slug, planoId }: { slug: string; planoId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="destructive"
        className="w-full"
        disabled={pending || (!!message && !isError)}
        onClick={() =>
          startTransition(async () => {
            const result = await solicitarPlano(slug, planoId);
            setMessage(result.error ?? result.success ?? null);
            setIsError(!!result.error);
          })
        }
      >
        {pending ? "Enviando..." : message && !isError ? "Solicitado ✓" : "Assinar"}
      </Button>
      {message && <p className={`text-xs ${isError ? "text-destructive" : "text-emerald-600"}`}>{message}</p>}
    </div>
  );
}
