"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCupom } from "./actions";

export function NovoCupomDialog({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"percentual" | "valor_fixo">("percentual");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createCupom(slug, null, formData);
    setPending(false);
    if (result?.error) setError(result.error);
    else setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Novo cupom</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cupom</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" name="codigo" placeholder="BEMVINDO10" required className="uppercase" />
          </div>
          <input type="hidden" name="tipo_desconto" value={tipo} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_desconto_trigger">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo((v ?? "percentual") as "percentual" | "valor_fixo")}>
                <SelectTrigger id="tipo_desconto_trigger" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="valor_fixo">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">{tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}</Label>
              <Input id="valor" name="valor" type="number" step={tipo === "percentual" ? "1" : "0.01"} min="0" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validade">Validade (opcional)</Label>
              <Input id="validade" name="validade" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usos_maximos">Limite de usos (opcional)</Label>
              <Input id="usos_maximos" name="usos_maximos" type="number" min="1" step="1" placeholder="Ilimitado" />
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
