"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { abrirCaixa, fecharCaixa, registrarMovimento } from "./actions";

const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

function Mensagem({ state }: { state: { error?: string; success?: string } | null }) {
  if (state?.error) return <p className="text-sm text-destructive">{state.error}</p>;
  if (state?.success) return <p className="text-sm text-emerald-600">{state.success}</p>;
  return null;
}

export function AbrirCaixaForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(abrirCaixa.bind(null, slug), null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="valor_inicial">Troco inicial (R$)</Label>
        <Input id="valor_inicial" name="valor_inicial" type="number" min="0" step="0.01" defaultValue="0" className="w-36" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Abrindo..." : "Abrir caixa"}
      </Button>
      <Mensagem state={state} />
    </form>
  );
}

export function MovimentoDialog({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(registrarMovimento.bind(null, slug), null);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">Sangria / suprimento</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimentar dinheiro do caixa</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mov_tipo">Tipo</Label>
              <select id="mov_tipo" name="tipo" className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm" defaultValue="sangria">
                <option value="sangria">Sangria (retirada)</option>
                <option value="suprimento">Suprimento (entrada)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mov_valor">Valor (R$)</Label>
              <Input id="mov_valor" name="valor" type="number" min="0.01" step="0.01" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mov_motivo">Motivo</Label>
            <Input id="mov_motivo" name="motivo" placeholder="Ex.: depósito no banco, troco" />
          </div>
          <Mensagem state={state} />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando..." : "Registrar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FecharCaixaDialog({ slug, esperadoDinheiro }: { slug: string; esperadoDinheiro: number }) {
  const [open, setOpen] = useState(false);
  const [contado, setContado] = useState("");
  const [state, action, pending] = useActionState(fecharCaixa.bind(null, slug), null);
  const valor = Number(contado.replace(",", "."));
  const diferenca = contado ? valor - esperadoDinheiro : null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Fechar caixa</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dinheiro esperado na gaveta: <strong className="text-foreground">{brl(esperadoDinheiro)}</strong>
          </p>
          <div className="space-y-2">
            <Label htmlFor="valor_contado">Dinheiro contado (R$)</Label>
            <Input id="valor_contado" name="valor_contado" type="number" min="0" step="0.01" value={contado} onValueChange={setContado} required />
            {diferenca !== null && Number.isFinite(diferenca) && (
              <p className={diferenca === 0 ? "text-sm text-emerald-600" : "text-sm text-amber-600"}>
                {diferenca === 0 ? "Bateu certinho." : diferenca > 0 ? `Sobrando ${brl(diferenca)}.` : `Faltando ${brl(-diferenca)}.`}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Input id="observacao" name="observacao" />
          </div>
          <Mensagem state={state} />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Fechando..." : "Confirmar fechamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
