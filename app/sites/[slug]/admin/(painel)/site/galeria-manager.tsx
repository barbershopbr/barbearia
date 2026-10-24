"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImagem } from "@/components/image-upload";
import type { GaleriaFoto } from "@/lib/supabase/types";
import { adicionarFotosGaleria, atualizarLegendaFoto, removerFotoGaleria } from "./actions";

export function GaleriaManager({ slug, empresaId, fotos }: { slug: string; empresaId: string; fotos: GaleriaFoto[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [, startTransition] = useTransition();

  // As actions chamam refresh() (next/cache), então a lista se atualiza sozinha.
  function rodar(acao: () => Promise<unknown>) {
    startTransition(async () => {
      await acao();
    });
  }

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setMsg(null);
    setEnviando(true);
    const urls: string[] = [];
    const falhas: string[] = [];
    for (const file of files) {
      try {
        urls.push(await uploadImagem(file, empresaId, "galeria"));
      } catch (err) {
        falhas.push(`${file.name}: ${err instanceof Error ? err.message : "falha"}`);
      }
    }
    if (urls.length > 0) {
      const res = await adicionarFotosGaleria(slug, urls);
      if (res?.error) falhas.push(res.error);
    }
    setEnviando(false);
    setMsg(falhas.length ? { tipo: "erro", texto: falhas.join(" · ") } : { tipo: "ok", texto: `${urls.length} foto(s) adicionada(s).` });
  }

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={escolher} />
      <Button type="button" variant="outline" disabled={enviando} onClick={() => inputRef.current?.click()}>
        {enviando ? <Loader2 className="size-4 animate-spin" /> : null}
        {enviando ? "Enviando..." : "Adicionar fotos"}
      </Button>
      {msg && <p className={msg.tipo === "erro" ? "text-sm text-destructive" : "text-sm text-emerald-600"}>{msg.texto}</p>}

      {fotos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto ainda. Mostre cortes, o ambiente e a equipe.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {fotos.map((f) => (
            <div key={f.id} className="space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.legenda ?? ""} className="size-full object-cover" />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  className="absolute top-1 right-1"
                  aria-label="Remover foto"
                  onClick={() => rodar(() => removerFotoGaleria(f.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Input
                defaultValue={f.legenda ?? ""}
                placeholder="Legenda (opcional)"
                className="h-7 text-xs"
                onBlur={(e) => {
                  if (e.target.value !== (f.legenda ?? "")) rodar(() => atualizarLegendaFoto(f.id, e.target.value));
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
