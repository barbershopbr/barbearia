"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createEmpresa } from "./actions";

export function NovaEmpresaDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createEmpresa(null, formData);
    setPending(false);
    if (result?.error) setError(result.error);
    else setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nova empresa</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provisionar nova barbearia</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da barbearia</Label>
            <Input id="nome" name="nome" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Subdomínio (slug)</Label>
            <Input id="slug" name="slug" placeholder="ex.: elite-barber" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </div>

          <Separator />
          <p className="text-sm font-medium">Conta do responsável (acesso ao painel admin)</p>

          <div className="space-y-2">
            <Label htmlFor="owner_nome">Nome</Label>
            <Input id="owner_nome" name="owner_nome" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_email">E-mail</Label>
            <Input id="owner_email" name="owner_email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_password">Senha provisória</Label>
            <Input id="owner_password" name="owner_password" type="password" minLength={8} required />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Criando..." : "Criar empresa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
