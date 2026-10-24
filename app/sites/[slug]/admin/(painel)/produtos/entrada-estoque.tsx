"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { registrarEntradaEstoque } from "./actions";

export function EntradaEstoqueDialog({
  slug,
  produtos,
  fornecedores,
}: {
  slug: string;
  produtos: { id: string; nome: string }[];
  fornecedores: { id: string; nome: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [produtoId, setProdutoId] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("produto_id", produtoId);
    formData.set("fornecedor_id", fornecedorId);
    setPending(true);
    setError(null);
    const result = await registrarEntradaEstoque(slug, null, formData);
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setOpen(false);
      setProdutoId("");
      setFornecedorId("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Registrar entrada</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrada de estoque</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="produto_trigger">Produto</Label>
            <Select value={produtoId} onValueChange={(v) => setProdutoId(v ?? "")}>
              <SelectTrigger id="produto_trigger" className="w-full">
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input id="quantidade" name="quantidade" type="number" min="1" step="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fornecedor_trigger">Fornecedor</Label>
              <Select value={fornecedorId} onValueChange={(v) => setFornecedorId(v ?? "")}>
                <SelectTrigger id="fornecedor_trigger" className="w-full">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Observação</Label>
            <Input id="motivo" name="motivo" placeholder="Ex.: nota fiscal 1234" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending || !produtoId}>
            {pending ? "Registrando..." : "Registrar entrada"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
