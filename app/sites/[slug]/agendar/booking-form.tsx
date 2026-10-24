"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAgendamento, listarHorariosDisponiveis } from "./actions";
import { validarCupom } from "../cupom-actions";
import type { Servico, Funcionario } from "@/lib/supabase/types";

export function BookingForm({
  slug,
  empresaId,
  servicos,
  funcionarios,
  inicial,
  remarcarId,
}: {
  slug: string;
  empresaId: string;
  servicos: Servico[];
  funcionarios: Funcionario[];
  /** Serviço/profissional já escolhidos (ex.: remarcar ou "agendar com este barbeiro"). */
  inicial?: { servicoId?: string; funcionarioId?: string };
  /** Ao remarcar: o agendamento antigo é cancelado quando o novo for confirmado. */
  remarcarId?: string;
}) {
  const [servicoId, setServicoId] = useState(inicial?.servicoId ?? "");
  const [funcionarioId, setFuncionarioId] = useState(inicial?.funcionarioId ?? "");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");

  const [horarios, setHorarios] = useState<string[]>([]);
  const [buscandoHorarios, startBusca] = useTransition();
  const [buscaFeita, setBuscaFeita] = useState(false);

  const [codigoCupom, setCodigoCupom] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{ codigo: string; desconto: number } | null>(null);
  const [cupomErro, setCupomErro] = useState<string | null>(null);
  const [validandoCupom, startValidacaoCupom] = useTransition();

  const [pending, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const servico = servicos.find((s) => s.id === servicoId) ?? null;
  const preco = servico ? Number(servico.preco) : 0;
  const desconto = cupomAplicado?.desconto ?? 0;

  function aplicarCupom() {
    setCupomErro(null);
    if (!servico) {
      setCupomErro("Selecione um serviço antes de aplicar o cupom.");
      return;
    }
    startValidacaoCupom(async () => {
      const res = await validarCupom(slug, codigoCupom, preco);
      if (res.erro) {
        setCupomAplicado(null);
        setCupomErro(res.erro);
      } else {
        setCupomAplicado({ codigo: codigoCupom.trim().toUpperCase(), desconto: res.desconto ?? 0 });
      }
    });
  }

  function removerCupom() {
    setCupomAplicado(null);
    setCodigoCupom("");
    setCupomErro(null);
  }

  useEffect(() => {
    // Não precisa resetar `horarios`/`buscaFeita` quando algum campo está
    // vazio: o JSX só renderiza a lista de horários quando os 3 campos estão
    // preenchidos, então um valor antigo em `horarios` nunca aparece à toa.
    if (!servicoId || !funcionarioId || !data) return;
    startBusca(async () => {
      const disponiveis = await listarHorariosDisponiveis(slug, funcionarioId, data, servicoId);
      setHorarios(disponiveis);
      setBuscaFeita(true);
    });
  }, [slug, servicoId, funcionarioId, data]);

  function handleSubmit() {
    setError(null);
    startSubmit(async () => {
      const formData = new FormData();
      formData.set("servico_id", servicoId);
      formData.set("funcionario_id", funcionarioId);
      formData.set("data", data);
      formData.set("hora", hora);
      formData.set("codigo_cupom", cupomAplicado?.codigo ?? "");
      if (remarcarId) formData.set("remarcar_id", remarcarId);
      const result = await createAgendamento(slug, empresaId, null, formData);
      if (result?.error) setError(result.error);
    });
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="servico_id">Serviço</Label>
        <Select value={servicoId} onValueChange={(v) => { setServicoId(v ?? ""); setHora(""); removerCupom(); }}>
          <SelectTrigger id="servico_id"><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
          <SelectContent>
            {servicos.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome} · {s.duracao_minutos}min · R$ {Number(s.preco).toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="funcionario_id">Profissional</Label>
        <Select value={funcionarioId} onValueChange={(v) => { setFuncionarioId(v ?? ""); setHora(""); }}>
          <SelectTrigger id="funcionario_id"><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
          <SelectContent>
            {funcionarios.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="data">Data</Label>
        <Input id="data" type="date" min={hoje} value={data} onValueChange={(v) => { setData(v); setHora(""); }} />
      </div>

      {servicoId && funcionarioId && data && (
        <div className="space-y-2">
          <Label>Horário</Label>
          {buscandoHorarios ? (
            <p className="text-sm text-muted-foreground">Buscando horários livres...</p>
          ) : horarios.length === 0 && buscaFeita ? (
            <p className="text-sm text-muted-foreground">Nenhum horário disponível nesse dia. Tente outra data.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {horarios.map((h) => (
                <Button
                  key={h}
                  type="button"
                  size="sm"
                  variant={hora === h ? "default" : "outline"}
                  onClick={() => setHora(h)}
                >
                  {h}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {servico && (
        <div className="space-y-2 rounded-md border p-3">
          <Label htmlFor="codigo_cupom">Cupom de desconto</Label>
          {cupomAplicado ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-600">
                Cupom <span className="font-mono font-medium">{cupomAplicado.codigo}</span> aplicado
              </span>
              <Button type="button" size="sm" variant="outline" onClick={removerCupom}>
                Remover
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id="codigo_cupom"
                value={codigoCupom}
                onValueChange={(v) => setCodigoCupom(v)}
                placeholder="Código do cupom"
                className="uppercase"
              />
              <Button type="button" variant="outline" disabled={validandoCupom || !codigoCupom.trim()} onClick={aplicarCupom}>
                {validandoCupom ? "..." : "Aplicar"}
              </Button>
            </div>
          )}
          {cupomErro && <p className="text-sm text-destructive">{cupomErro}</p>}

          <div className="space-y-1 border-t pt-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Serviço</span>
              <span>R$ {preco.toFixed(2)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Desconto</span>
                <span>- R$ {desconto.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>R$ {Math.max(preco - desconto, 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        className="w-full"
        disabled={pending || !hora}
        onClick={handleSubmit}
      >
        {pending ? "Agendando..." : "Confirmar agendamento"}
      </Button>
    </div>
  );
}
