import type { Metadata } from "next";
import Link from "next/link";
import { Scissors } from "lucide-react";
import { PLANOS_SAAS } from "@/lib/plano/recursos";
import { rootDomain } from "@/lib/tenant/domain";
import type { PlanoSaas } from "@/lib/supabase/types";
import { CadastroForm } from "./cadastro-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Criar minha barbearia — BarberControl",
};

export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const { plano } = await searchParams;
  const planoInicial: PlanoSaas = plano && plano in PLANOS_SAAS ? (plano as PlanoSaas) : "pro";

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="badge-emblem size-9 text-[#c8a24a]">
            <Scissors className="size-4" />
          </div>
          <span className="font-heading text-lg font-bold tracking-[0.15em] uppercase">BarberControl</span>
        </Link>
      </nav>
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-20">
        <h1 className="font-heading text-3xl font-bold uppercase sm:text-4xl">Crie a sua barbearia</h1>
        <p className="mt-2 mb-8 text-muted-foreground">Leva 2 minutos. O painel e o site ficam prontos na hora.</p>
        <CadastroForm planoInicial={planoInicial} dominio={rootDomain().split(":")[0]} />
      </main>
    </div>
  );
}
