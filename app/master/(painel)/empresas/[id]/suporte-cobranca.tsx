"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gerarAcessoSuporte, salvarCobrancaEmpresa } from "./actions";

export function AcessoSuporteBotao({ empresaId }: { empresaId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setErro(null);
            const r = await gerarAcessoSuporte(empresaId);
            if (r.url) window.open(r.url, "_blank", "noopener");
            else setErro(r.error ?? "Falhou.");
          })
        }
      >
        {pending ? "Gerando acesso..." : "Acessar painel como a barbearia ↗"}
      </Button>
      <p className="text-xs text-muted-foreground">Abre em outra aba, logado como o responsável. O acesso fica registrado.</p>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}

export function CobrancaForm({ empresaId, dia, isentoAte }: { empresaId: string; dia: number; isentoAte: string | null }) {
  const [state, action, pending] = useActionState(salvarCobrancaEmpresa.bind(null, empresaId), null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="saas_dia_vencimento">Dia de vencimento</Label>
        <Input id="saas_dia_vencimento" name="saas_dia_vencimento" type="number" min="1" max="28" defaultValue={dia} className="w-24" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saas_isento_ate">Cortesia até</Label>
        <Input id="saas_isento_ate" name="saas_isento_ate" type="date" defaultValue={isentoAte ?? ""} className="w-40" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
