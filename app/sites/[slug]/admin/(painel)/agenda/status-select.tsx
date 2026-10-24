"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateAgendamentoStatus } from "./actions";
import type { AgendamentoStatus } from "@/lib/supabase/types";

const STATUS_OPTIONS: AgendamentoStatus[] = ["agendado", "confirmado", "concluido", "cancelado", "falta"];

export function StatusSelect({ agendamentoId, status }: { agendamentoId: string; status: AgendamentoStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      disabled={pending}
      onValueChange={(value) => startTransition(() => updateAgendamentoStatus(agendamentoId, value as AgendamentoStatus))}
    >
      <SelectTrigger className="ml-auto w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
