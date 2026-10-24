"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FidelidadeConfig } from "@/lib/supabase/types";
import { salvarConfigFidelidade } from "./actions";

export function ConfigFidelidadeForm({ slug, config }: { slug: string; config: FidelidadeConfig | null }) {
  const [state, formAction, pending] = useActionState(salvarConfigFidelidade.bind(null, slug), null);

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Regras do programa</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="ativo" defaultChecked={config?.ativo ?? false} className="size-4" />
            Programa de fidelidade ativo
          </label>

          <div className="space-y-2">
            <Label htmlFor="pontos_por_atendimento">Pontos por atendimento concluído</Label>
            <Input
              id="pontos_por_atendimento"
              name="pontos_por_atendimento"
              type="number"
              min="0"
              step="1"
              defaultValue={config?.pontos_por_atendimento ?? 0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pontos_por_real_produto">Pontos por R$ 1,00 em produtos</Label>
            <Input
              id="pontos_por_real_produto"
              name="pontos_por_real_produto"
              type="number"
              min="0"
              step="0.01"
              defaultValue={config?.pontos_por_real_produto ?? 0}
            />
            <p className="text-xs text-muted-foreground">
              Ex.: 1 = ganha 1 ponto por real gasto. Creditado quando o pedido é marcado como separado.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reais_por_ponto">Valor de resgate de cada ponto (R$)</Label>
            <Input
              id="reais_por_ponto"
              name="reais_por_ponto"
              type="number"
              min="0"
              step="0.01"
              defaultValue={config?.reais_por_ponto ?? 0}
            />
            <p className="text-xs text-muted-foreground">
              0 = pontos são só simbólicos (sem equivalência em dinheiro exibida ao cliente).
            </p>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
