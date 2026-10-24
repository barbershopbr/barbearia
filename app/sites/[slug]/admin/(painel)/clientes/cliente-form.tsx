"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Cliente } from "@/lib/supabase/types";
import { salvarCliente } from "./actions";

export function ClienteDialog({ slug, cliente }: { slug: string; cliente?: Pick<Cliente, "id" | "nome" | "telefone"> }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ erro?: string; ok?: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMsg(null);
    const r = await salvarCliente(slug, cliente?.id ?? null, null, formData);
    setPending(false);
    if (r?.error) setMsg({ erro: r.error });
    else if (cliente) setOpen(false);
    else setMsg({ ok: r?.success });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setMsg(null);
      }}
    >
      <DialogTrigger render={cliente ? <Button size="sm" variant="outline">Editar</Button> : <Button>Novo cliente</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cli_nome">Nome</Label>
            <Input id="cli_nome" name="nome" defaultValue={cliente?.nome} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli_telefone">Telefone / WhatsApp</Label>
            <Input id="cli_telefone" name="telefone" defaultValue={cliente?.telefone ?? ""} placeholder="(15) 99999-0000" />
          </div>
          {!cliente && (
            <div className="space-y-2">
              <Label htmlFor="cli_email">E-mail (opcional)</Label>
              <Input id="cli_email" name="email" type="email" />
              <p className="text-xs text-muted-foreground">Com e-mail, o cliente pode depois entrar no site pelo &quot;Esqueci minha senha&quot;.</p>
            </div>
          )}
          {msg?.erro && <p className="text-sm text-destructive">{msg.erro}</p>}
          {msg?.ok && <p className="text-sm text-emerald-600">{msg.ok}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
