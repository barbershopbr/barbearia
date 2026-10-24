"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PreferenciasPagamento } from "@/lib/pagamentos/preferencias";
import { salvarPreferencias } from "./actions";

function Opcao({ name, defaultChecked, titulo, texto }: { name: string; defaultChecked: boolean; titulo: string; texto: string }) {
  return (
    <label className="flex items-start gap-3 rounded-md border p-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4" />
      <span>
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{texto}</span>
      </span>
    </label>
  );
}

export function PreferenciasForm({ slug, pref, desabilitado }: { slug: string; pref: PreferenciasPagamento; desabilitado: boolean }) {
  const [state, formAction, pending] = useActionState(salvarPreferencias.bind(null, slug), null);
  const [sinalAtivo, setSinalAtivo] = useState(pref.sinal.ativo);

  return (
    <form action={formAction} className="space-y-3">
      <fieldset disabled={desabilitado} className="space-y-3 disabled:opacity-60">
        <div className="grid gap-3 sm:grid-cols-2">
          <Opcao name="pix" defaultChecked={pref.pix} titulo="Pix" texto="QR Code e copia-e-cola. O dinheiro cai na hora." />
          <Opcao name="cartao" defaultChecked={pref.cartao} titulo="Cartão de crédito" texto="O cliente digita o cartão na tela segura do Mercado Pago." />
          <Opcao
            name="loja_online"
            defaultChecked={pref.lojaOnline}
            titulo="Pagar a loja pelo site"
            texto="Além de pagar na retirada, o cliente pode pagar o pedido online."
          />
          <Opcao
            name="assinatura_recorrente"
            defaultChecked={pref.assinaturaRecorrente}
            titulo="Assinaturas no cartão, todo mês"
            texto="Planos de assinatura cobrados automaticamente pelo Mercado Pago."
          />
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="sinal_ativo" checked={sinalAtivo} onChange={(e) => setSinalAtivo(e.target.checked)} className="mt-0.5 size-4" />
            <span>
              <span className="block text-sm font-medium">Cobrar sinal no agendamento</span>
              <span className="block text-xs text-muted-foreground">
                O cliente paga uma parte (ou tudo) adiantado para confirmar o horário. Reduz faltas.
              </span>
            </span>
          </label>
          {sinalAtivo && (
            <div className="flex flex-wrap items-center gap-2 pl-7">
              <Input name="sinal_valor" type="number" min="1" step="0.01" defaultValue={pref.sinal.valor} className="w-28" aria-label="Valor do sinal" />
              <select name="sinal_tipo" defaultValue={pref.sinal.tipo} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <option value="percentual">% do serviço</option>
                <option value="valor">reais (valor fixo)</option>
              </select>
              <span className="text-xs text-muted-foreground">Use 100% para cobrar o serviço inteiro adiantado.</span>
            </div>
          )}
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending || desabilitado}>
        {pending ? "Salvando..." : "Salvar preferências"}
      </Button>
    </form>
  );
}
