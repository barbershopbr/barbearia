"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { avaliarAtendimento } from "../agendamento-actions";

/** Estrelas + comentário para avaliar um atendimento concluído. */
export function AvaliarAtendimento({ slug, agendamentoId }: { slug: string; agendamentoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, startTransition] = useTransition();

  if (enviado) return <span className="text-xs text-emerald-600">Obrigado pela avaliação!</span>;
  if (!aberto) {
    return (
      <Button size="sm" variant="outline" onClick={() => setAberto(true)}>
        Avaliar
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-md border p-3">
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={() => setNota(n)}
            onMouseEnter={() => setHover(n)}
            className="p-0.5"
          >
            <Star className={cn("size-6", (hover || nota) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
      <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Conte como foi (opcional)" maxLength={1000} rows={2} />
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || nota === 0}
          onClick={() =>
            startTransition(async () => {
              const r = await avaliarAtendimento(slug, agendamentoId, nota, comentario);
              if (r.error) setErro(r.error);
              else setEnviado(true);
            })
          }
        >
          {pending ? "Enviando..." : "Enviar avaliação"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
