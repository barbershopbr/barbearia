"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { criarBloqueio } from "./bloqueio-actions";

const SELECT = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function BloqueioDialog({
  slug,
  profissionais,
  permiteBarbeariaToda,
  diaInicial,
}: {
  slug: string;
  profissionais: { id: string; nome: string }[];
  permiteBarbeariaToda: boolean;
  diaInicial: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [diaInteiro, setDiaInteiro] = useState(true);
  const [msg, setMsg] = useState<{ erro?: string; ok?: string } | null>(null);

  async function handleSubmit(fd: FormData) {
    setPending(true);
    setMsg(null);
    const r = await criarBloqueio(slug, null, fd);
    setPending(false);
    setMsg(r?.error ? { erro: r.error } : { ok: r?.success });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setMsg(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline">Bloquear horário</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Folga ou bloqueio</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blq_prof">Quem</Label>
            <select id="blq_prof" name="funcionario_id" className={SELECT} defaultValue={profissionais[0]?.id ?? ""}>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
              {permiteBarbeariaToda && <option value="">Barbearia inteira (feriado, evento)</option>}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="blq_di">De</Label>
              <Input id="blq_di" name="data_inicio" type="date" defaultValue={diaInicial} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blq_df">Até</Label>
              <Input id="blq_df" name="data_fim" type="date" defaultValue={diaInicial} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="dia_inteiro" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} className="size-4" />
            Dia inteiro
          </label>
          {!diaInteiro && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="blq_hi">Das</Label>
                <Input id="blq_hi" name="hora_inicio" type="time" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blq_hf">Até as</Label>
                <Input id="blq_hf" name="hora_fim" type="time" required />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="blq_motivo">Motivo (opcional)</Label>
            <Input id="blq_motivo" name="motivo" placeholder="Folga, férias, médico, feriado..." maxLength={120} />
          </div>
          {msg?.erro && <p className="text-sm text-destructive">{msg.erro}</p>}
          {msg?.ok && <p className="text-sm text-emerald-600">{msg.ok}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando..." : "Salvar bloqueio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
