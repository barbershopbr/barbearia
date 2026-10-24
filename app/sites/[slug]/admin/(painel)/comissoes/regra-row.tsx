"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { salvarRegraComissao, lancarComissaoManual } from "./actions";
import type { RegraComissaoTipo } from "@/lib/supabase/types";

const TIPO_LABELS: Record<RegraComissaoTipo, string> = {
  percentual: "% por serviço",
  fixo_por_servico: "Valor fixo por atendimento",
  diaria: "Diária",
  mensal: "Salário mensal fixo",
};

export function RegraRow({
  slug,
  funcionarioId,
  nome,
  regraInicial,
}: {
  slug: string;
  funcionarioId: string;
  nome: string;
  regraInicial: { tipo: RegraComissaoTipo; valor: number } | null;
}) {
  const [tipo, setTipo] = useState<RegraComissaoTipo>(regraInicial?.tipo ?? "percentual");
  const [valor, setValor] = useState(String(regraInicial?.valor ?? ""));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [lancado, setLancado] = useState(false);

  const isManual = tipo === "diaria" || tipo === "mensal";

  return (
    <TableRow>
      <TableCell>{nome}</TableCell>
      <TableCell>
        <Select value={tipo} onValueChange={(v) => { setTipo(v as RegraComissaoTipo); setSaved(false); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.entries(TIPO_LABELS) as [RegraComissaoTipo, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          className="w-28"
          value={valor}
          onValueChange={(v) => { setValor(v); setSaved(false); }}
        />
      </TableCell>
      <TableCell className="flex justify-end gap-2 text-right">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !valor}
          onClick={() =>
            startTransition(async () => {
              await salvarRegraComissao(slug, funcionarioId, tipo, Number(valor));
              setSaved(true);
            })
          }
        >
          {pending ? "Salvando..." : saved ? "Salvo ✓" : "Salvar regra"}
        </Button>
        {isManual && regraInicial && (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await lancarComissaoManual(slug, funcionarioId, tipo as "diaria" | "mensal", Number(valor));
                setLancado(true);
                setTimeout(() => setLancado(false), 1500);
              })
            }
          >
            {lancado ? "Lançado ✓" : "Lançar agora"}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
