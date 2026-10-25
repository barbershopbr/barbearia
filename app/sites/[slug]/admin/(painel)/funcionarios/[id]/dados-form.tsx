"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FuncionarioDados } from "@/lib/supabase/types";
import { CONTRATO_LABEL } from "@/lib/funcionarios/contrato";
import { salvarDadosFuncionario } from "../actions";

const classeSelect = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function DadosFuncionarioForm({ slug, funcionarioId, dados, podeEditar }: { slug: string; funcionarioId: string; dados: FuncionarioDados | null; podeEditar: boolean }) {
  const [estado, acao, pendente] = useActionState(salvarDadosFuncionario.bind(null, slug, funcionarioId), null);

  const campo = (nome: keyof FuncionarioDados, rotulo: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={nome}>{rotulo}</Label>
      <Input id={nome} name={nome} defaultValue={(dados?.[nome] as string | number | null) ?? ""} disabled={!podeEditar} {...props} />
    </div>
  );

  return (
    <form action={acao} className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold tracking-wide uppercase">Contato e documentos</legend>
        {campo("telefone", "Telefone / WhatsApp", { type: "tel", placeholder: "(11) 90000-0000" })}
        {campo("email", "E-mail", { type: "email" })}
        {campo("cpf", "CPF / CNPJ")}
        {campo("data_nascimento", "Nascimento", { type: "date" })}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" name="endereco" defaultValue={dados?.endereco ?? ""} disabled={!podeEditar} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold tracking-wide uppercase">Contrato e pagamento</legend>
        {campo("cargo", "Cargo", { placeholder: "Barbeiro, recepcionista…" })}
        <div className="space-y-1.5">
          <Label htmlFor="tipo_contrato">Tipo de contrato</Label>
          <select id="tipo_contrato" name="tipo_contrato" defaultValue={dados?.tipo_contrato ?? ""} disabled={!podeEditar} className={classeSelect}>
            <option value="">—</option>
            {Object.entries(CONTRATO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {campo("data_admissao", "Data de admissão", { type: "date" })}
        {campo("salario_fixo", "Salário fixo mensal (R$)", { type: "number", min: 0, step: "0.01", placeholder: "0 = só comissão" })}
        {campo("dia_pagamento", "Dia do pagamento", { type: "number", min: 1, max: 31, placeholder: "Ex.: 5" })}
        {campo("chave_pix", "Chave Pix para pagamento")}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="observacoes">Observações internas</Label>
          <Textarea id="observacoes" name="observacoes" rows={3} defaultValue={dados?.observacoes ?? ""} disabled={!podeEditar} />
        </div>
      </fieldset>

      {podeEditar && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar dados"}
          </Button>
          {estado?.error && <p className="text-sm text-destructive">{estado.error}</p>}
          {estado?.success && <p className="text-sm text-emerald-600">{estado.success}</p>}
        </div>
      )}
    </form>
  );
}
