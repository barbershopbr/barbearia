"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { criarAssinaturaManual, registrarMensalidade } from "./actions";

const SELECT = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

function useEnvio() {
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ erro?: string; ok?: string } | null>(null);
  async function enviar(fn: () => Promise<{ error?: string; success?: string } | null>) {
    setPending(true);
    setMsg(null);
    const r = await fn();
    setPending(false);
    setMsg(r?.error ? { erro: r.error } : { ok: r?.success });
    return !r?.error;
  }
  return { pending, msg, setMsg, enviar };
}

export function NovaAssinaturaDialog({
  slug,
  clientes,
  planos,
}: {
  slug: string;
  clientes: { id: string; nome: string }[];
  planos: { id: string; nome: string; valor: number }[];
}) {
  const [open, setOpen] = useState(false);
  const { pending, msg, setMsg, enviar } = useEnvio();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setMsg(null);
      }}
    >
      <DialogTrigger render={<Button>Nova assinatura</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova assinatura (balcão)</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            await enviar(() => criarAssinaturaManual(slug, null, fd));
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="ass_cliente">Cliente</Label>
            <select id="ass_cliente" name="cliente_id" className={SELECT} required defaultValue="">
              <option value="" disabled>
                Escolha o cliente
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Não está na lista? Cadastre em Clientes primeiro.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ass_plano">Plano</Label>
            <select id="ass_plano" name="plano_id" className={SELECT} required defaultValue="">
              <option value="" disabled>
                Escolha o plano
              </option>
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — R$ {Number(p.valor).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          {msg?.erro && <p className="text-sm text-destructive">{msg.erro}</p>}
          {msg?.ok && <p className="text-sm text-emerald-600">{msg.ok}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando..." : "Criar assinatura"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RegistrarMensalidadeDialog({ slug, assinaturaId, valorPlano, hoje }: { slug: string; assinaturaId: string; valorPlano: number; hoje: string }) {
  const [open, setOpen] = useState(false);
  const { pending, msg, setMsg, enviar } = useEnvio();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setMsg(null);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline">Registrar pagamento</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mensalidade recebida</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            if (await enviar(() => registrarMensalidade(slug, assinaturaId, null, fd))) setTimeout(() => setOpen(false), 1200);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="men_valor">Valor (R$)</Label>
              <Input id="men_valor" name="valor" type="number" step="0.01" min="0.01" defaultValue={valorPlano} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="men_data">Data</Label>
              <Input id="men_data" name="data" type="date" defaultValue={hoje} max={hoje} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="men_metodo">Forma de pagamento</Label>
            <select id="men_metodo" name="metodo" className={SELECT} defaultValue="pix">
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão (maquininha)</option>
            </select>
          </div>
          {msg?.erro && <p className="text-sm text-destructive">{msg.erro}</p>}
          {msg?.ok && <p className="text-sm text-emerald-600">{msg.ok}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Registrando..." : "Registrar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
