"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ConfigFiscal } from "@/lib/fiscal/config";
import { salvarConfigFiscal } from "./actions";

export function ConfigFiscalForm({ slug, config }: { slug: string; config: ConfigFiscal }) {
  const [state, formAction, pending] = useActionState(salvarConfigFiscal.bind(null, slug), null);
  const [auto, setAuto] = useState(config.emitirAutomatico);

  const item = (name: "servicos" | "assinaturas" | "produtos", titulo: string, texto: string) => (
    <label className="flex items-start gap-3 rounded-md border p-3">
      <input type="checkbox" name={name} defaultChecked={config[name]} className="mt-0.5 size-4" />
      <span>
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{texto}</span>
      </span>
    </label>
  );

  return (
    <form action={formAction} className="space-y-3">
      <label className="flex items-start gap-3 rounded-md border p-3">
        <input type="checkbox" name="emitir_automatico" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="mt-0.5 size-4" />
        <span>
          <span className="block text-sm font-medium">Emitir nota automaticamente</span>
          <span className="block text-xs text-muted-foreground">
            Quando um pagamento feito pelo site for aprovado, o BarberControl gera a nota no seu Bling e envia ao cliente.
          </span>
        </span>
      </label>
      {/* Escondido (não removido) quando desligado, para não perder as escolhas ao salvar. */}
      <div className={auto ? "grid gap-3 pl-4 sm:grid-cols-3" : "hidden"}>
        {item("servicos", "Serviços", "Atendimentos pagos pelo site (NFS-e).")}
        {item("assinaturas", "Assinaturas", "Mensalidades dos planos (NFS-e).")}
        {item("produtos", "Produtos", "Vendas da loja (NF-e/NFC-e).")}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
