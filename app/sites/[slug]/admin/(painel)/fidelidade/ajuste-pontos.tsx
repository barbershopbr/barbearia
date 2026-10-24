"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ajustarPontosCliente } from "./actions";

export function AjustePontosDialog({
  slug,
  clientes,
}: {
  slug: string;
  clientes: { id: string; nome: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("cliente_id", clienteId);
    setPending(true);
    setError(null);
    const result = await ajustarPontosCliente(slug, null, formData);
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setOpen(false);
      setClienteId("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Ajuste manual</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuste manual de pontos</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente_id_trigger">Cliente</Label>
            <Select value={clienteId} onValueChange={(v) => setClienteId(v ?? "")}>
              <SelectTrigger id="cliente_id_trigger" className="w-full">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pontos">Pontos (use número negativo para debitar)</Label>
            <Input id="pontos" name="pontos" type="number" step="1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input id="motivo" name="motivo" placeholder="Ex.: bônus de indicação" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending || !clienteId}>
            {pending ? "Lançando..." : "Lançar ajuste"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
