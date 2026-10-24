"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConfigPote } from "@/lib/comissoes/pote-calculo";
import { salvarConfigPote } from "./actions";

const SELECT = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function ConfigPoteForm({
  slug,
  config,
  funcionarios,
  servicos,
}: {
  slug: string;
  config: ConfigPote;
  funcionarios: { id: string; nome: string }[];
  servicos: { id: string; nome: string; preco: number }[];
}) {
  const [state, formAction, pending] = useActionState(salvarConfigPote.bind(null, slug), null);
  const [casaModo, setCasaModo] = useState(Object.keys(config.casaPorBarbeiro).length > 0 ? "por_barbeiro" : "unica");
  const [peso, setPeso] = useState(config.peso);

  return (
    <form action={formAction} className="space-y-5">
      <label className="flex items-start gap-3 rounded-md border p-3">
        <input type="checkbox" name="ativo" defaultChecked={config.ativo} className="mt-0.5 size-4" />
        <span>
          <span className="block text-sm font-medium">Usar o pote das assinaturas</span>
          <span className="block text-xs text-muted-foreground">
            Atendimentos de clientes assinantes deixam de gerar comissão avulsa e passam a valer pontos no pote do mês.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="casa_modo">Parte da casa</Label>
          <select id="casa_modo" name="casa_modo" value={casaModo} onChange={(e) => setCasaModo(e.target.value)} className={SELECT}>
            <option value="unica">Uma % para todos</option>
            <option value="por_barbeiro">% diferente por barbeiro</option>
          </select>
          <div className="flex items-center gap-2">
            <Input name="casa_percentual" type="number" min="0" max="100" step="0.1" defaultValue={config.casaPercentual} className="w-24" />
            <span className="text-sm text-muted-foreground">% fica com a casa{casaModo === "por_barbeiro" ? " (padrão)" : ""}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="peso">Como cada atendimento pontua</Label>
          <select id="peso" name="peso" value={peso} onChange={(e) => setPeso(e.target.value as ConfigPote["peso"])} className={SELECT}>
            <option value="valor">Pelo preço do serviço (corte R$35 = 35 pontos)</option>
            <option value="atendimentos">1 ponto por atendimento</option>
            <option value="manual">Pontos que eu definir por serviço</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="modo">Pote</Label>
          <select id="modo" name="modo" defaultValue={config.modo} className={SELECT}>
            <option value="unico">Um pote só para todos os planos</option>
            <option value="por_plano">Um pote por plano</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sobra">Se sobrar (mês sem atendimentos de assinante)</Label>
          <select id="sobra" name="sobra" defaultValue={config.sobra} className={SELECT}>
            <option value="casa">Fica com a casa</option>
            <option value="dividir">Divide igual entre os barbeiros</option>
            <option value="acumular">Acumula para o próximo mês</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Barbeiros no pote</p>
        <div className="divide-y rounded-md border">
          {funcionarios.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <input type="hidden" name="funcionario_ids" value={f.id} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`participa_${f.id}`} defaultChecked={config.participantes[f.id] !== false} className="size-4" />
                {f.nome}
              </label>
              {casaModo === "por_barbeiro" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  casa
                  <Input
                    name={`casa_${f.id}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    defaultValue={config.casaPorBarbeiro[f.id] ?? ""}
                    placeholder={String(config.casaPercentual)}
                    className="h-7 w-20"
                  />
                  %
                </span>
              )}
            </div>
          ))}
          {funcionarios.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum profissional ativo.</p>}
        </div>
      </div>

      {peso === "manual" && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Pontos por serviço</p>
          <div className="divide-y rounded-md border">
            {servicos.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <input type="hidden" name="servico_ids" value={s.id} />
                <span>{s.nome}</span>
                <Input
                  name={`peso_${s.id}`}
                  type="number"
                  min="0"
                  step="0.5"
                  defaultValue={config.pesosManuais[s.id] ?? ""}
                  placeholder={String(s.preco)}
                  className="h-7 w-24"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Em branco = usa o preço do serviço.</p>
        </div>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar configuração"}
      </Button>
    </form>
  );
}
