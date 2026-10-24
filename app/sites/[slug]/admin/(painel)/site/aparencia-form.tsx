"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/image-upload";
import { SECOES_LABEL, TEMAS, type SiteConfig, type TemaSite } from "@/lib/site/config";
import type { Empresa } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { salvarAparencia } from "./actions";

function CampoCor({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 rounded border border-input bg-transparent"
          aria-label={label}
        />
        <Input id={id} name={id} value={value} onValueChange={onChange} />
      </div>
    </div>
  );
}

export function AparenciaForm({ empresa, config }: { empresa: Empresa; config: SiteConfig }) {
  const [state, formAction, pending] = useActionState(salvarAparencia.bind(null, empresa.slug), null);
  const cores = (empresa.cores ?? {}) as { primaria?: string; secundaria?: string };

  const [primaria, setPrimaria] = useState(cores.primaria || "#171717");
  const [secundaria, setSecundaria] = useState(cores.secundaria || "#404040");
  const [destaque, setDestaque] = useState(config.corDestaque);
  const [tema, setTema] = useState<TemaSite>(config.tema);
  const [secoes, setSecoes] = useState(config.secoes);

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= secoes.length) return;
    const nova = [...secoes];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setSecoes(nova);
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="tema" value={tema} />
      <input type="hidden" name="secoes" value={JSON.stringify(secoes)} />

      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(TEMAS) as TemaSite[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTema(t)}
              className={cn(
                "rounded-lg border-2 p-3 text-left transition-colors",
                tema === t ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30",
              )}
            >
              <MiniaturaTema tema={t} primaria={primaria} destaque={destaque} />
              <p className="mt-2 text-sm font-semibold">{TEMAS[t].nome}</p>
              <p className="text-xs text-muted-foreground">{TEMAS[t].descricao}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo e imagens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Logo</Label>
              <ImageUpload name="logo_url" empresaId={empresa.id} pasta="logo" defaultValue={empresa.logo_url} formato="redondo" />
              <p className="text-xs text-muted-foreground">Imagem quadrada, de preferência PNG com fundo transparente.</p>
            </div>
            <div className="space-y-2">
              <Label>Ícone da aba (favicon)</Label>
              <ImageUpload name="favicon_url" empresaId={empresa.id} pasta="favicon" defaultValue={empresa.favicon_url} />
              <p className="text-xs text-muted-foreground">Quadrada e pequena (ex.: 512×512). Se vazio, usa o logo.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Foto de capa (topo do site)</Label>
            <ImageUpload name="banner_url" empresaId={empresa.id} pasta="banner" defaultValue={empresa.banner_url} formato="largo" />
            <p className="text-xs text-muted-foreground">Foto larga (ex.: 1600×600) do ambiente ou de um corte.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoCor id="cor_primaria" label="Principal (topo e fundos)" value={primaria} onChange={setPrimaria} />
            <CampoCor id="cor_secundaria" label="Secundária" value={secundaria} onChange={setSecundaria} />
            <CampoCor id="cor_destaque" label="Destaque (botões)" value={destaque} onChange={setDestaque} />
          </div>
          <div className="flex overflow-hidden rounded-md border text-sm font-medium text-white">
            <div className="flex-1 p-4 text-center" style={{ backgroundColor: primaria }}>Principal</div>
            <div className="flex-1 p-4 text-center" style={{ backgroundColor: secundaria }}>Secundária</div>
            <div className="flex-1 p-4 text-center" style={{ backgroundColor: destaque }}>Destaque</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Textos do topo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero_titulo">Título</Label>
            <Input id="hero_titulo" name="hero_titulo" defaultValue={config.hero.titulo} placeholder={empresa.nome} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero_subtitulo">Subtítulo</Label>
            <Input
              id="hero_subtitulo"
              name="hero_subtitulo"
              defaultValue={config.hero.subtitulo}
              placeholder={empresa.descricao ?? "Ex.: Tradição e estilo desde 2015"}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero_botao">Texto do botão</Label>
            <Input id="hero_botao" name="hero_botao" defaultValue={config.hero.botao} maxLength={40} />
          </div>
          <p className="text-xs text-muted-foreground">Deixe título e subtítulo vazios para usar o nome e a descrição da barbearia.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seções da página</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Escolha o que aparece e em que ordem. Seções sem conteúdo não aparecem no site.</p>
          {secoes.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
              <label className="flex flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={s.visivel}
                  onChange={(e) => setSecoes(secoes.map((x) => (x.id === s.id ? { ...x, visivel: e.target.checked } : x)))}
                  className="size-4"
                />
                {SECOES_LABEL[s.id]}
              </label>
              <Button type="button" size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">
                <ArrowUp className="size-4" />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" disabled={i === secoes.length - 1} onClick={() => mover(i, 1)} aria-label="Descer">
                <ArrowDown className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar aparência"}
        </Button>
      </div>
    </form>
  );
}

/** Desenho esquemático de cada tema, para escolher sem precisar salvar. */
function MiniaturaTema({ tema, primaria, destaque }: { tema: TemaSite; primaria: string; destaque: string }) {
  const barra = <div className="h-1.5 w-8 rounded" style={{ backgroundColor: destaque }} />;
  if (tema === "moderno") {
    return (
      <div className="flex h-20 overflow-hidden rounded border">
        <div className="flex flex-1 flex-col justify-center gap-1 p-2" style={{ backgroundColor: primaria }}>
          <div className="h-2 w-14 rounded bg-white/80" />
          <div className="h-1 w-10 rounded bg-white/40" />
          {barra}
        </div>
        <div className="flex-1 bg-gradient-to-br from-neutral-400 to-neutral-600" />
      </div>
    );
  }
  if (tema === "minimal") {
    return (
      <div className="flex h-20 flex-col items-center justify-center gap-1 rounded border bg-white">
        <div className="h-2 w-16 rounded bg-neutral-800" />
        <div className="h-1 w-12 rounded bg-neutral-300" />
        {barra}
      </div>
    );
  }
  return (
    <div className="relative flex h-20 flex-col items-center justify-center gap-1 overflow-hidden rounded border" style={{ backgroundColor: primaria }}>
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-500/40 to-black/60" />
      <div className="relative size-5 rounded-full border border-white/80" />
      <div className="relative h-2 w-14 rounded bg-white/80" />
      <div className="relative">{barra}</div>
    </div>
  );
}
