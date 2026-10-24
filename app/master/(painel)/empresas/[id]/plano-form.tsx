"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PLANOS_SAAS, RECURSO_LABEL, temRecurso, type Recurso } from "@/lib/plano/recursos";
import type { Empresa, PlanoSaas } from "@/lib/supabase/types";
import { updateEmpresaPlano } from "./actions";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PlanoForm({ empresa }: { empresa: Empresa }) {
  const action = updateEmpresaPlano.bind(null, empresa.id);
  const [state, formAction, pending] = useActionState(action, null);
  const recursos = Object.keys(RECURSO_LABEL) as Recurso[];
  const padrao = { plano_saas: empresa.plano_saas, recursos_extras: {} };

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="plano_saas">Plano</Label>
        <select id="plano_saas" name="plano_saas" defaultValue={empresa.plano_saas} className={SELECT_CLASS}>
          {(Object.keys(PLANOS_SAAS) as PlanoSaas[]).map((p) => (
            <option key={p} value={p}>
              {PLANOS_SAAS[p].nome} — R$ {PLANOS_SAAS[p].preco}/mês
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Exceções por recurso</p>
        <p className="text-xs text-muted-foreground">
          &quot;Conforme o plano&quot; segue o plano escolhido acima. Use liberar/bloquear para cortesias ou suporte.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {recursos.map((r) => {
            const extra = empresa.recursos_extras?.[r];
            return (
              <div key={r} className="space-y-1">
                <Label htmlFor={`recurso_${r}`} className="text-xs">
                  {RECURSO_LABEL[r]}
                </Label>
                <select
                  id={`recurso_${r}`}
                  name={`recurso_${r}`}
                  defaultValue={extra === true ? "liberado" : extra === false ? "bloqueado" : "plano"}
                  className={SELECT_CLASS}
                >
                  <option value="plano">Conforme o plano ({temRecurso(padrao, r) ? "sim" : "não"})</option>
                  <option value="liberado">Liberado</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar plano"}
      </Button>
    </form>
  );
}
