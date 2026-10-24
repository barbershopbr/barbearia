"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateEmpresaStatus } from "./actions";
import type { EmpresaStatus } from "@/lib/supabase/types";

const STATUS_OPTIONS: EmpresaStatus[] = ["ativo", "inativo", "bloqueado"];

export function EmpresaStatusSelect({ empresaId, status }: { empresaId: string; status: EmpresaStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      disabled={pending}
      onValueChange={(value) => startTransition(() => updateEmpresaStatus(empresaId, value as EmpresaStatus))}
    >
      <SelectTrigger className="w-32">
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
