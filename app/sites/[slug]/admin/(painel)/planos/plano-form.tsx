"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { salvarPlano } from "./actions";
import type { Plano } from "@/lib/supabase/types";

export function PlanoDialog({ slug, plano }: { slug: string; plano?: Plano }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await salvarPlano(slug, plano?.id ?? null, null, formData);
    setPending(false);
    if (result?.error) setError(result.error);
    else setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={plano ? <Button size="sm" variant="outline">Editar</Button> : <Button>Novo plano</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plano ? "Editar plano" : "Novo plano"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" defaultValue={plano?.nome} placeholder="Plano Bronze" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input id="valor" name="valor" type="number" step="0.01" min="0" defaultValue={plano?.valor} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodo">Período</Label>
              <Select name="periodo" defaultValue={plano?.periodo ?? "mensal"} required>
                <SelectTrigger id="periodo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantidade_cortes">Cortes incluídos (opcional)</Label>
            <Input id="quantidade_cortes" name="quantidade_cortes" type="number" min="0" defaultValue={plano?.quantidade_cortes ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beneficios">Benefícios (separados por vírgula)</Label>
            <Input
              id="beneficios"
              name="beneficios"
              defaultValue={(plano?.beneficios ?? []).map(String).join(", ")}
              placeholder="Desconto em produtos, Prioridade na agenda"
            />
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
