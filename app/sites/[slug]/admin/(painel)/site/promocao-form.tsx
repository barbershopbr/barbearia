"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/image-upload";
import type { Promocao } from "@/lib/supabase/types";
import { salvarPromocao } from "./actions";

export function PromocaoDialog({ slug, empresaId, promocao }: { slug: string; empresaId: string; promocao?: Promocao }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await salvarPromocao(slug, promocao?.id ?? null, null, formData);
    setPending(false);
    if (result?.error) setError(result.error);
    else setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={promocao ? <Button size="sm" variant="outline">Editar</Button> : <Button>Nova promoção</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{promocao ? "Editar promoção" : "Nova promoção"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" name="titulo" defaultValue={promocao?.titulo} placeholder="Ex.: Corte + Barba de terça" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" name="descricao" defaultValue={promocao?.descricao ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Imagem</Label>
            <ImageUpload name="imagem_url" empresaId={empresaId} pasta="promocoes" defaultValue={promocao?.imagem_url} formato="largo" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="preco_de">De (R$)</Label>
              <Input id="preco_de" name="preco_de" type="number" step="0.01" min="0" defaultValue={promocao?.preco_de ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco_por">Por (R$)</Label>
              <Input id="preco_por" name="preco_por" type="number" step="0.01" min="0" defaultValue={promocao?.preco_por ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validade">Válida até</Label>
              <Input id="validade" name="validade" type="date" defaultValue={promocao?.validade ?? ""} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
