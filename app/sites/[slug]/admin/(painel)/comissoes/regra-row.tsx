"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RegraComissaoTipo } from "@/lib/supabase/types";
import { lancarComissaoManual, salvarExcecoesServico, salvarRegraComissao, salvarTaxas } from "./actions";

const SELECT = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";
const TIPO_LABELS: Record<RegraComissaoTipo, string> = {
  percentual: "% do serviço",
  fixo_por_servico: "Valor fixo por atendimento",
  diaria: "Diária (lançada à mão)",
  mensal: "Salário mensal (lançado à mão)",
};

type RegraInicial = { tipo: RegraComissaoTipo; valor: number; fixoAdicional: number; percentualProduto: number; descontarTaxa: boolean } | null;
type Excecao = { servicoId: string; tipo: "percentual" | "fixo"; valor: string };

/** Editor da regra de comissão de um profissional, com exceções por serviço. */
export function RegraEditor({
  slug,
  funcionarioId,
  nome,
  regraInicial,
  servicos,
  excecoesIniciais,
}: {
  slug: string;
  funcionarioId: string;
  nome: string;
  regraInicial: RegraInicial;
  servicos: { id: string; nome: string; preco: number }[];
  excecoesIniciais: { servicoId: string; tipo: "percentual" | "fixo"; valor: number }[];
}) {
  const [tipo, setTipo] = useState<RegraComissaoTipo>(regraInicial?.tipo ?? "percentual");
  const [valor, setValor] = useState(String(regraInicial?.valor ?? ""));
  const [fixo, setFixo] = useState(String(regraInicial?.fixoAdicional || ""));
  const [produto, setProduto] = useState(String(regraInicial?.percentualProduto || ""));
  const [taxa, setTaxa] = useState(regraInicial?.descontarTaxa ?? false);
  const [aberto, setAberto] = useState(false);
  const [excecoes, setExcecoes] = useState<Excecao[]>(
    servicos.map((s) => {
      const e = excecoesIniciais.find((x) => x.servicoId === s.id);
      return { servicoId: s.id, tipo: e?.tipo ?? "percentual", valor: e ? String(e.valor) : "" };
    }),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const manual = tipo === "diaria" || tipo === "mensal";
  const num = (v: string) => Number(v.replace(",", ".")) || 0;

  function salvar() {
    setMsg(null);
    startTransition(async () => {
      const r1 = await salvarRegraComissao(slug, funcionarioId, {
        tipo,
        valor: num(valor),
        fixoAdicional: num(fixo),
        percentualProduto: num(produto),
        descontarTaxa: taxa,
      });
      const r2 = aberto
        ? await salvarExcecoesServico(
            slug,
            funcionarioId,
            excecoes.map((e) => ({ servicoId: e.servicoId, tipo: e.tipo, valor: e.valor.trim() === "" ? null : num(e.valor) })),
          )
        : {};
      setMsg(r1.error ?? r2.error ?? "Salvo ✓");
    });
  }

  const qtdExcecoes = excecoes.filter((e) => e.valor.trim() !== "").length;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="font-medium">{nome}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Regra</Label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as RegraComissaoTipo)} className={SELECT}>
            {(Object.keys(TIPO_LABELS) as RegraComissaoTipo[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{tipo === "percentual" ? "%" : "R$"}</Label>
          <Input type="number" min="0" step="0.01" value={valor} onValueChange={setValor} className="w-24" />
        </div>
        {tipo === "percentual" && (
          <div className="space-y-1">
            <Label className="text-xs">+ fixo por atendimento (R$)</Label>
            <Input type="number" min="0" step="0.01" value={fixo} onValueChange={setFixo} placeholder="0" className="w-28" />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">% sobre produtos vendidos</Label>
          <Input type="number" min="0" max="100" step="0.1" value={produto} onValueChange={setProduto} placeholder="0" className="w-24" />
        </div>
        <label className="flex items-center gap-2 pb-1.5 text-sm">
          <input type="checkbox" checked={taxa} onChange={(e) => setTaxa(e.target.checked)} className="size-4" />
          Descontar taxa da maquininha
        </label>
      </div>

      {!manual && servicos.length > 0 && (
        <div>
          <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setAberto(!aberto)}>
            {aberto ? "Esconder" : "Comissão diferente por serviço"}
            {qtdExcecoes > 0 ? ` (${qtdExcecoes})` : ""}
          </button>
          {aberto && (
            <div className="mt-2 divide-y rounded-md border">
              {servicos.map((s, i) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-sm">
                  <span>{s.nome}</span>
                  <span className="flex items-center gap-1">
                    <select
                      value={excecoes[i].tipo}
                      onChange={(e) => setExcecoes(excecoes.map((x, j) => (j === i ? { ...x, tipo: e.target.value as "percentual" | "fixo" } : x)))}
                      className={SELECT}
                      aria-label="Tipo"
                    >
                      <option value="percentual">%</option>
                      <option value="fixo">R$</option>
                    </select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={excecoes[i].valor}
                      onValueChange={(v) => setExcecoes(excecoes.map((x, j) => (j === i ? { ...x, valor: v } : x)))}
                      placeholder="regra geral"
                      className="h-8 w-28"
                    />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={pending || !valor} onClick={salvar}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {manual && regraInicial && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await lancarComissaoManual(slug, funcionarioId, tipo as "diaria" | "mensal", num(valor));
                setMsg("Lançado ✓");
              })
            }
          >
            Lançar {tipo === "diaria" ? "diária" : "salário"} agora
          </Button>
        )}
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}

export function TaxasForm({ slug, taxas }: { slug: string; taxas: Record<string, number> }) {
  const [state, action, pending] = useActionState(salvarTaxas.bind(null, slug), null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      {(["cartao", "pix", "dinheiro"] as const).map((m) => (
        <div key={m} className="space-y-1">
          <Label htmlFor={`taxa_${m}`} className="text-xs">
            {m === "cartao" ? "Cartão" : m === "pix" ? "Pix" : "Dinheiro"} (%)
          </Label>
          <Input id={`taxa_${m}`} name={m} type="number" min="0" max="100" step="0.01" defaultValue={taxas[m] ?? 0} className="w-24" />
        </div>
      ))}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando..." : "Salvar taxas"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
