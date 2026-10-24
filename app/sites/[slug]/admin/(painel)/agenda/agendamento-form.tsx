"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createAgendamentoAdmin } from "./actions";
import { listarHorariosDisponiveis } from "../../../agendar/actions";
import type { Cliente, Servico, Funcionario } from "@/lib/supabase/types";

export function NovoAgendamentoDialog({
  slug,
  clientes,
  servicos,
  funcionarios,
}: {
  slug: string;
  clientes: Cliente[];
  servicos: Servico[];
  funcionarios: Funcionario[];
}) {
  const [open, setOpen] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [funcionarioId, setFuncionarioId] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");

  const [horarios, setHorarios] = useState<string[]>([]);
  const [buscandoHorarios, startBusca] = useTransition();
  const [buscaFeita, setBuscaFeita] = useState(false);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("cliente_id", clienteId);
    formData.set("servico_id", servicoId);
    formData.set("funcionario_id", funcionarioId);
    formData.set("data", data);
    formData.set("hora", hora);
    const result = await createAgendamentoAdmin(slug, null, formData);
    setPending(false);
    if (result?.error) setError(result.error);
    else setOpen(false);
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Novo agendamento</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente_id">Cliente</Label>
            <Select value={clienteId} onValueChange={(v) => setClienteId(v ?? "")}>
              <SelectTrigger id="cliente_id"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="servico_id">Serviço</Label>
            <Select value={servicoId} onValueChange={(v) => { setServicoId(v ?? ""); setHora(""); }}>
              <SelectTrigger id="servico_id"><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
              <SelectContent>
                {servicos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome} · {s.duracao_minutos}min</SelectItem>
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
                <p className="text-sm text-muted-foreground">Nenhum horário disponível nesse dia.</p>
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

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" className="w-full" disabled={pending || !clienteId || !hora} onClick={handleSubmit}>
            {pending ? "Criando..." : "Criar agendamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
