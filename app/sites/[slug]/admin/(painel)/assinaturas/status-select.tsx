"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateAssinaturaStatus } from "./actions";
import type { AssinaturaStatus } from "@/lib/supabase/types";

const STATUS_OPTIONS: AssinaturaStatus[] = ["pendente", "ativa", "inadimplente", "cancelada"];

export function AssinaturaStatusSelect({ assinaturaId, status }: { assinaturaId: string; status: AssinaturaStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      disabled={pending}
      onValueChange={(value) => startTransition(() => updateAssinaturaStatus(assinaturaId, value as AssinaturaStatus))}
    >
      <SelectTrigger className="w-36">
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
