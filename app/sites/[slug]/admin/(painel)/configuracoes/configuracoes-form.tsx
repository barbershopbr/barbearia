"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Empresa } from "@/lib/supabase/types";
import { salvarConfiguracoes } from "./actions";

type Horario = { abre?: string; fecha?: string; fechado?: boolean; pausa_inicio?: string; pausa_fim?: string };

const DIAS: { key: string; label: string }[] = [
  { key: "segunda", label: "Segunda" },
  { key: "terca", label: "Terça" },
  { key: "quarta", label: "Quarta" },
  { key: "quinta", label: "Quinta" },
  { key: "sexta", label: "Sexta" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];

function Campo({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ConfiguracoesForm({ empresa }: { empresa: Empresa }) {
  const [state, formAction, pending] = useActionState(salvarConfiguracoes.bind(null, empresa.slug), null);

  const horarios = (empresa.horarios ?? {}) as Record<string, Horario>;

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Campo id="nome" label="Nome da barbearia">
            <Input id="nome" name="nome" defaultValue={empresa.nome} required />
          </Campo>
          <Campo id="descricao" label="Descrição" hint="Aparece no topo do site (se o título/subtítulo não forem personalizados em Aparência do site).">
            <Textarea id="descricao" name="descricao" defaultValue={empresa.descricao ?? ""} rows={3} />
          </Campo>
          <Campo id="cnpj" label="CNPJ">
            <Input id="cnpj" name="cnpj" defaultValue={empresa.cnpj ?? ""} placeholder="00.000.000/0000-00" />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Localização e contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Campo id="endereco" label="Endereço">
            <Input id="endereco" name="endereco" defaultValue={empresa.endereco ?? ""} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="latitude" label="Latitude">
              <Input id="latitude" name="latitude" defaultValue={empresa.latitude?.toString() ?? ""} placeholder="-23.5505" />
            </Campo>
            <Campo id="longitude" label="Longitude">
              <Input id="longitude" name="longitude" defaultValue={empresa.longitude?.toString() ?? ""} placeholder="-46.6333" />
            </Campo>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo id="telefone" label="Telefone">
              <Input id="telefone" name="telefone" defaultValue={empresa.telefone ?? ""} />
            </Campo>
            <Campo id="whatsapp" label="WhatsApp" hint="Só números, com DDD.">
              <Input id="whatsapp" name="whatsapp" defaultValue={empresa.whatsapp ?? ""} placeholder="5511999999999" />
            </Campo>
            <Campo id="instagram" label="Instagram" hint="Sem o @.">
              <Input id="instagram" name="instagram" defaultValue={empresa.instagram ?? ""} placeholder="suabarbearia" />
            </Campo>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horário de funcionamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DIAS.map(({ key, label }) => {
            const h = horarios[key] ?? {};
            return (
              <div key={key} className="flex flex-wrap items-center gap-3">
                <span className="w-20 text-sm font-medium">{label}</span>
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <input type="checkbox" name={`${key}_fechado`} defaultChecked={!!h.fechado} className="size-4" />
                  Fechado
                </label>
                <Input
                  name={`${key}_abre`}
                  type="time"
                  defaultValue={h.abre ?? "09:00"}
                  className="w-32"
                  aria-label={`${label} abre`}
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  name={`${key}_fecha`}
                  type="time"
                  defaultValue={h.fecha ?? "18:00"}
                  className="w-32"
                  aria-label={`${label} fecha`}
                />
                <span className="text-xs text-muted-foreground">pausa</span>
                <Input
                  name={`${key}_pausa_inicio`}
                  type="time"
                  defaultValue={h.pausa_inicio ?? ""}
                  className="w-28"
                  aria-label={`${label} início da pausa`}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  name={`${key}_pausa_fim`}
                  type="time"
                  defaultValue={h.pausa_fim ?? ""}
                  className="w-28"
                  aria-label={`${label} fim da pausa`}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}
