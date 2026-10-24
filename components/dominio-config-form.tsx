"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { EmpresaDominioStatus } from "@/lib/supabase/types";

type ActionState = { error?: string; success?: string } | null;

const STATUS_LABEL: Record<EmpresaDominioStatus, { texto: string; variant: "default" | "secondary" | "destructive" }> = {
  verificado: { texto: "Verificado", variant: "default" },
  pendente: { texto: "Pendente", variant: "secondary" },
  falhou: { texto: "Falhou", variant: "destructive" },
};

/** Usado no painel Master (por empresa) e no admin do tenant (própria empresa) — só muda quais Server Actions são passadas. */
export function DominioConfigForm({
  dominioPrincipal,
  dominioStatus,
  onConfigurar,
  onVerificar,
  onRemover,
}: {
  dominioPrincipal: string | null;
  dominioStatus: EmpresaDominioStatus;
  onConfigurar: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  onVerificar: () => Promise<ActionState>;
  onRemover: () => Promise<ActionState>;
}) {
  const [configState, configFormAction, configPending] = useActionState(onConfigurar, null);
  const [verifying, startVerify] = useTransition();
  const [removing, startRemove] = useTransition();
  const [lastActionMsg, setLastActionMsg] = useState<ActionState>(null);

  return (
    <div className="space-y-4">
      {dominioPrincipal ? (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="font-medium">{dominioPrincipal}</p>
            <Badge variant={STATUS_LABEL[dominioStatus].variant} className="mt-1">
              {STATUS_LABEL[dominioStatus].texto}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={verifying}
              onClick={() => startVerify(async () => setLastActionMsg(await onVerificar()))}
            >
              {verifying ? "Verificando..." : "Verificar novamente"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={removing}
              onClick={() => startRemove(async () => setLastActionMsg(await onRemover()))}
            >
              {removing ? "Removendo..." : "Remover"}
            </Button>
          </div>
        </div>
      ) : (
        <form action={configFormAction} className="space-y-2">
          <Label htmlFor="dominio">Domínio próprio (ex.: barbeariaalpha.com.br)</Label>
          <div className="flex gap-2">
            <Input id="dominio" name="dominio" placeholder="barbeariaalpha.com.br" required />
            <Button type="submit" disabled={configPending}>
              {configPending ? "Configurando..." : "Configurar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Depois de configurar, aponte um CNAME desse domínio para o app antes de clicar em &quot;Verificar novamente&quot;.
          </p>
        </form>
      )}

      {configState?.error && <p className="text-sm text-destructive">{configState.error}</p>}
      {configState?.success && <p className="text-sm text-emerald-600">{configState.success}</p>}
      {lastActionMsg?.error && <p className="text-sm text-destructive">{lastActionMsg.error}</p>}
      {lastActionMsg?.success && <p className="text-sm text-emerald-600">{lastActionMsg.success}</p>}
    </div>
  );
}
