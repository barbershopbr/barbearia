"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLANOS_SAAS } from "@/lib/plano/recursos";
import type { PlanoSaas } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { cadastrarBarbearia, checarSlug } from "./actions";

const DOURADO = "#c8a24a";

/** Mesma regra de lib/tenant/nova-empresa.ts (slugDeNome), repetida aqui porque aquele módulo é server-only. */
function slugDeNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function CadastroForm({ planoInicial, dominio }: { planoInicial: PlanoSaas; dominio: string }) {
  const [state, formAction, pending] = useActionState(cadastrarBarbearia, null);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [plano, setPlano] = useState<PlanoSaas>(planoInicial);
  const [checagem, setChecagem] = useState<{ slug: string; ok: boolean; motivo?: string } | null>(null);

  const slugFinal = slugEditado ? slug : slugDeNome(nome);

  // Confere disponibilidade do endereço com um pequeno atraso enquanto digita.
  useEffect(() => {
    if (!slugFinal) return;
    let ativo = true;
    const t = setTimeout(async () => {
      const r = await checarSlug(slugFinal);
      if (ativo) setChecagem({ slug: slugFinal, ...r });
    }, 400);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [slugFinal]);

  const statusSlug = !slugFinal ? null : checagem?.slug === slugFinal ? checagem : "carregando";
  const erroEm = (campo: string) => state?.campo === campo;

  return (
    <form action={formAction} className="space-y-8">
      <input type="text" name="site_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input type="hidden" name="plano" value={plano} />
      <input type="hidden" name="slug" value={slugFinal} />

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold tracking-wide uppercase">1. Plano</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(PLANOS_SAAS) as PlanoSaas[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlano(p)}
              className={cn("rounded-xl border-2 p-4 text-left transition-colors", plano === p ? "" : "border-border hover:border-foreground/30")}
              style={plano === p ? { borderColor: DOURADO, backgroundColor: `${DOURADO}14` } : undefined}
            >
              <p className="font-semibold">{PLANOS_SAAS[p].nome}</p>
              <p className="text-sm text-muted-foreground">R$ {PLANOS_SAAS[p].preco}/mês</p>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold tracking-wide uppercase">2. Sua barbearia</legend>
        <div className="space-y-2">
          <Label htmlFor="nome">Nome da barbearia</Label>
          <Input id="nome" name="nome" value={nome} onValueChange={setNome} placeholder="Ex.: Barbearia do Zé" required aria-invalid={erroEm("nome")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug_visivel">Endereço do site</Label>
          <div className="flex items-center overflow-hidden rounded-lg border border-input focus-within:ring-3 focus-within:ring-ring/50">
            <input
              id="slug_visivel"
              value={slugFinal}
              onChange={(e) => {
                setSlugEditado(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              className="h-9 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
              placeholder="sua-barbearia"
              aria-invalid={erroEm("slug")}
            />
            <span className="shrink-0 bg-muted px-3 py-2 text-sm text-muted-foreground">.{dominio}</span>
          </div>
          {statusSlug === "carregando" && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Verificando...
            </p>
          )}
          {statusSlug && statusSlug !== "carregando" && (
            <p className={cn("flex items-center gap-1 text-xs", statusSlug.ok ? "text-emerald-500" : "text-destructive")}>
              {statusSlug.ok ? <Check className="size-3" /> : <X className="size-3" />}
              {statusSlug.ok ? "Disponível!" : statusSlug.motivo}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">WhatsApp da barbearia</Label>
          <Input id="telefone" name="telefone" placeholder="(15) 99999-0000" />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold tracking-wide uppercase">3. Seu acesso</legend>
        <div className="space-y-2">
          <Label htmlFor="responsavel">Seu nome</Label>
          <Input id="responsavel" name="responsavel" required aria-invalid={erroEm("responsavel")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={erroEm("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required aria-invalid={erroEm("password")} />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="aceite" className="mt-0.5 size-4" required />
          Li e aceito os termos de uso e a política de privacidade do BarberControl.
        </label>
      </fieldset>

      {state?.error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || (statusSlug !== null && statusSlug !== "carregando" && !statusSlug.ok)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg font-semibold tracking-wide text-black uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: DOURADO }}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Criando sua barbearia..." : `Criar minha barbearia — ${PLANOS_SAAS[plano].nome}`}
      </button>
    </form>
  );
}
