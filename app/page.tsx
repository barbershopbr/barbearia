import Link from "next/link";
import { Scissors, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Sem isso, o Next trata a página como estática (não chama nenhuma API
// dinâmica) e a Cloudflare cacheia a resposta na borda por muito tempo —
// uma barbearia nova cadastrada não apareceria aqui até o cache expirar.
export const dynamic = "force-dynamic";

export default async function MarketingHomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: empresas } = await supabase
    .from("empresas")
    .select("slug, nome")
    .eq("status", "ativo")
    .order("nome");

  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-black p-4 text-center text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url(/images/barber-beard.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="badge-emblem h-24 w-24 border-white text-white">
          <Skull className="size-10" strokeWidth={1.5} />
        </div>

        <div className="space-y-3">
          <h1 className="font-heading text-5xl font-bold tracking-[0.15em] uppercase sm:text-6xl">
            Barber<span className="text-primary">Control</span>
          </h1>
          <p className="mx-auto flex max-w-md items-center justify-center gap-2 text-xs tracking-[0.3em] text-white/60 uppercase">
            <span className="h-px w-8 bg-white/40" />
            Tradição · Estilo · Ofício
            <span className="h-px w-8 bg-white/40" />
          </p>
        </div>

        <p className="max-w-md text-white/70">
          A plataforma completa para gestão de barbearias: agenda, clientes, assinaturas,
          comissões e muito mais — cada barbearia com seu próprio site e painel.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="destructive" render={<Link href="/master/login">Painel Master</Link>} />
        </div>

        {empresas && empresas.length > 0 && (
          <div className="w-full max-w-sm space-y-3 border-t border-white/15 pt-6">
            <p className="text-xs tracking-[0.3em] text-white/50 uppercase">Barbearias cadastradas</p>
            <div className="flex flex-col gap-2">
              {empresas.map((e) => (
                <Button
                  key={e.slug}
                  variant="outline"
                  className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10"
                  render={<Link href={`/sites/${e.slug}`}>{e.nome}</Link>}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-4 text-white/30">
          <Scissors className="size-4" />
          <span className="text-xs tracking-[0.2em] uppercase">Est. 2026</span>
          <Scissors className="size-4 -scale-x-100" />
        </div>
      </div>
    </div>
  );
}
