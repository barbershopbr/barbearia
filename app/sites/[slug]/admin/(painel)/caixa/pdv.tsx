"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarCheck, Minus, Plus, Scissors, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { registrarVenda } from "./actions";

type Opcao = { id: string; nome: string; preco: number; estoque?: number };
type Linha = {
  chave: string;
  tipo: "servico" | "produto";
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  funcionarioId: string | null;
  estoque?: number;
  agendamentoId?: string;
};
export type AtendimentoHoje = {
  id: string;
  rotulo: string;
  servicoId: string;
  servicoNome: string;
  preco: number;
  funcionarioId: string;
  clienteId: string;
};

const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const SELECT = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

export function Pdv({
  slug,
  servicos,
  produtos,
  funcionarios,
  clientes,
  atendimentos,
}: {
  slug: string;
  atendimentos: AtendimentoHoje[];
  servicos: Opcao[];
  produtos: Opcao[];
  funcionarios: { id: string; nome: string }[];
  clientes: { id: string; nome: string }[];
}) {
  const [aba, setAba] = useState<"atendimento" | "servico" | "produto">(atendimentos.length ? "atendimento" : "servico");
  const [busca, setBusca] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [metodo, setMetodo] = useState("pix");
  const [desconto, setDesconto] = useState("");
  const [msg, setMsg] = useState<{ erro?: string; ok?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const opcoes = (aba === "produto" ? produtos : servicos).filter((o) => o.nome.toLowerCase().includes(busca.toLowerCase()));
  const atendimentosLivres = atendimentos.filter(
    (a) => !linhas.some((l) => l.agendamentoId === a.id) && a.rotulo.toLowerCase().includes(busca.toLowerCase()),
  );

  function cobrarAtendimento(a: AtendimentoHoje) {
    setMsg(null);
    setLinhas((atual) => [
      ...atual,
      {
        chave: crypto.randomUUID(),
        tipo: "servico",
        id: a.servicoId,
        nome: a.servicoNome,
        preco: a.preco,
        quantidade: 1,
        funcionarioId: a.funcionarioId,
        agendamentoId: a.id,
      },
    ]);
    if (!clienteId) setClienteId(a.clienteId);
  }
  const subtotal = linhas.reduce((s, l) => s + l.preco * l.quantidade, 0);
  const descontoNum = Math.min(Math.max(Number(desconto.replace(",", ".")) || 0, 0), subtotal);
  const total = subtotal - descontoNum;
  const clientesOrdenados = useMemo(() => clientes, [clientes]);

  function adicionar(o: Opcao) {
    if (aba === "atendimento") return;
    const tipo = aba;
    setMsg(null);
    setLinhas((atual) => {
      const existente = atual.find((l) => l.tipo === tipo && l.id === o.id && !l.agendamentoId);
      if (existente && tipo === "produto") {
        return atual.map((l) => (l === existente ? { ...l, quantidade: Math.min(l.quantidade + 1, o.estoque ?? Infinity) } : l));
      }
      return [
        ...atual,
        {
          chave: crypto.randomUUID(),
          tipo,
          id: o.id,
          nome: o.nome,
          preco: o.preco,
          quantidade: 1,
          funcionarioId: tipo === "servico" ? (funcionarios[0]?.id ?? null) : null,
          estoque: o.estoque,
        },
      ];
    });
  }

  const alterar = (chave: string, mudanca: Partial<Linha>) =>
    setLinhas((a) => a.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));

  function finalizar() {
    setMsg(null);
    const fd = new FormData();
    fd.set(
      "itens",
      JSON.stringify(
        linhas.map((l) => ({
          tipo: l.tipo,
          id: l.id,
          quantidade: l.quantidade,
          funcionarioId: l.funcionarioId,
          agendamentoId: l.agendamentoId ?? null,
        })),
      ),
    );
    fd.set("metodo", metodo);
    fd.set("cliente_id", clienteId);
    fd.set("desconto", String(descontoNum));
    startTransition(async () => {
      const r = await registrarVenda(slug, null, fd);
      if (r?.error) setMsg({ erro: r.error });
      else {
        setMsg({ ok: r?.success });
        setLinhas([]);
        setDesconto("");
        setClienteId("");
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <div className="flex gap-2">
          {(["atendimento", "servico", "produto"] as const).map((t) => (
            <Button key={t} type="button" size="sm" variant={aba === t ? "default" : "outline"} onClick={() => setAba(t)}>
              {t === "atendimento" ? (
                <CalendarCheck className="size-4" />
              ) : t === "servico" ? (
                <Scissors className="size-4" />
              ) : (
                <ShoppingBag className="size-4" />
              )}
              {t === "atendimento" ? `Agenda de hoje (${atendimentos.length})` : t === "servico" ? "Serviços" : "Produtos"}
            </Button>
          ))}
          <Input value={busca} onValueChange={setBusca} placeholder="Buscar..." className="ml-auto max-w-48" />
        </div>
        {aba === "atendimento" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {atendimentosLivres.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => cobrarAtendimento(a)}
                className="rounded-lg border p-3 text-left transition-colors hover:border-foreground/40"
              >
                <p className="truncate text-sm font-medium">{a.rotulo}</p>
                <p className="text-xs text-muted-foreground">{brl(a.preco)}</p>
              </button>
            ))}
            {atendimentosLivres.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">Nenhum atendimento de hoje para cobrar.</p>
            )}
          </div>
        )}
        <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", aba === "atendimento" && "hidden")}>
          {opcoes.map((o) => {
            const esgotado = aba === "produto" && (o.estoque ?? 0) <= 0;
            return (
              <button
                key={o.id}
                type="button"
                disabled={esgotado}
                onClick={() => adicionar(o)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors hover:border-foreground/40",
                  esgotado && "cursor-not-allowed opacity-40",
                )}
              >
                <p className="truncate text-sm font-medium">{o.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {brl(o.preco)}
                  {aba === "produto" && ` · ${esgotado ? "esgotado" : `${o.estoque} em estoque`}`}
                </p>
              </button>
            );
          })}
          {opcoes.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Nada encontrado.</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">Venda</p>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Toque nos serviços e produtos para adicionar.</p>
        ) : (
          <ul className="space-y-2">
            {linhas.map((l) => (
              <li key={l.chave} className="space-y-1 border-b pb-2 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{l.nome}</span>
                  <span className="text-sm font-medium">{brl(l.preco * l.quantidade)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {l.agendamentoId ? (
                    <span className="flex-1 text-xs text-muted-foreground">Atendimento da agenda</span>
                  ) : l.tipo === "servico" ? (
                    <select
                      aria-label="Profissional"
                      value={l.funcionarioId ?? ""}
                      onChange={(e) => alterar(l.chave, { funcionarioId: e.target.value || null })}
                      className={cn(SELECT, "flex-1")}
                    >
                      <option value="">Sem profissional</option>
                      {funcionarios.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <select
                        aria-label="Vendido por"
                        value={l.funcionarioId ?? ""}
                        onChange={(e) => alterar(l.chave, { funcionarioId: e.target.value || null })}
                        className={cn(SELECT, "min-w-0 flex-1")}
                      >
                        <option value="">Vendido por (opcional)</option>
                        {funcionarios.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          onClick={() => alterar(l.chave, { quantidade: Math.max(1, l.quantidade - 1) })}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm tabular-nums">{l.quantidade}</span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          onClick={() => alterar(l.chave, { quantidade: Math.min(l.quantidade + 1, l.estoque ?? Infinity) })}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </>
                  )}
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Remover"
                    onClick={() => setLinhas((a) => a.filter((x) => x.chave !== l.chave))}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <select aria-label="Cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={cn(SELECT, "w-full")}>
          <option value="">Cliente não identificado</option>
          {clientesOrdenados.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            aria-label="Forma de pagamento"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            className={cn(SELECT, "flex-1")}
          >
            <option value="pix">Pix</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartão</option>
          </select>
          <Input value={desconto} onValueChange={setDesconto} placeholder="Desconto R$" inputMode="decimal" className="w-28" />
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">
            {descontoNum > 0 ? `Subtotal ${brl(subtotal)} − ${brl(descontoNum)}` : "Total"}
          </span>
          <span className="text-xl font-bold">{brl(total)}</span>
        </div>
        {msg?.erro && <p className="text-sm text-destructive">{msg.erro}</p>}
        {msg?.ok && <p className="text-sm text-emerald-600">{msg.ok}</p>}
        <Button type="button" className="w-full" size="lg" disabled={pending || linhas.length === 0} onClick={finalizar}>
          {pending ? "Registrando..." : `Receber ${brl(total)}`}
        </Button>
      </div>
    </div>
  );
}
