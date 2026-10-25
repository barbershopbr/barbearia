"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atualizarMinhaConta } from "./actions";

export function ContaForm({ slug, nome, email }: { slug: string; nome: string; email: string }) {
  const [estado, acao, pendente] = useActionState(atualizarMinhaConta.bind(null, slug), null);

  return (
    <form action={acao} className="max-w-md space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Seu nome</Label>
        <Input id="nome" name="nome" defaultValue={nome} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail de login</Label>
        <Input id="email" name="email" type="email" defaultValue={email} required autoComplete="username" />
      </div>
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Trocar senha (opcional)</legend>
        <div className="space-y-1.5">
          <Label htmlFor="nova_senha">Nova senha</Label>
          <Input id="nova_senha" name="nova_senha" type="password" minLength={8} autoComplete="new-password" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmar_senha">Repita a nova senha</Label>
          <Input id="confirmar_senha" name="confirmar_senha" type="password" autoComplete="new-password" />
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor="senha_atual">Senha atual</Label>
        <Input id="senha_atual" name="senha_atual" type="password" autoComplete="current-password" />
        <p className="text-xs text-muted-foreground">Obrigatória para trocar o e-mail ou a senha.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
        {estado?.error && <p className="text-sm text-destructive">{estado.error}</p>}
        {estado?.success && <p className="text-sm text-emerald-600">{estado.success}</p>}
      </div>
    </form>
  );
}
