import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  Check,
  CreditCard,
  Globe,
  Palette,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Skull,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";
import { PLANOS_SAAS } from "@/lib/plano/recursos";
import { masterOrigin, tenantOrigin } from "@/lib/tenant/domain";
import type { PlanoSaas } from "@/lib/supabase/types";

// Links (site de exemplo, Master) dependem de APP_ORIGIN, que só existe em
// runtime no Worker — gerar estático no build fixaria os links errados.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BarberControl — sistema completo para barbearias",
  description:
    "Agenda online, site próprio, loja, assinaturas, comissões e financeiro para a sua barbearia. Comece hoje, acesso imediato.",
};

const DOURADO = "#c8a24a";

const BENEFICIOS = [
  { icon: CalendarCheck, titulo: "Agenda online 24h", texto: "O cliente escolhe serviço, barbeiro e horário pelo celular. Sem ligação, sem conflito de horário." },
  { icon: Globe, titulo: "Site próprio da barbearia", texto: "Endereço sua-barbearia.usebrcontrol.com.br com a sua cara: logo, fotos, cores e promoções." },
  { icon: Users, titulo: "Equipe com permissões", texto: "Cada barbeiro com seu login. Você decide o que cada um vê e edita." },
  { icon: Wallet, titulo: "Comissões e financeiro", texto: "Comissão por percentual, valor fixo, diária ou mensal. Despesas e receitas no mesmo lugar." },
  { icon: ShoppingBag, titulo: "Loja de produtos", texto: "Venda pomadas, óleos e cosméticos pelo site com retirada na barbearia e controle de estoque." },
  { icon: CreditCard, titulo: "Planos de assinatura", texto: "Crie o seu clube de assinatura e tenha receita recorrente todo mês." },
];

const PASSOS = [
  { n: "1", titulo: "Escolha o plano", texto: "Básico, Pro ou Premium. Muda quando quiser." },
  { n: "2", titulo: "Crie a sua conta", texto: "Nome da barbearia, endereço do site e o seu login." },
  { n: "3", titulo: "Personalize e divulgue", texto: "Cadastre serviços e equipe, escolha o tema e mande o link para os clientes." },
];

const RECURSOS_PLANO: Record<PlanoSaas, string[]> = {
  basico: ["Agenda online", "Site próprio com temas", "Clientes e histórico", "Serviços e equipe", "Logins para a equipe com permissões"],
  pro: ["Tudo do Básico", "Loja de produtos e estoque", "Planos de assinatura para clientes", "Comissões", "Financeiro", "Cupons de desconto", "Programa de fidelidade"],
  premium: ["Tudo do Pro", "Domínio próprio (suabarbearia.com.br)", "Suporte prioritário"],
};

const FAQ = [
  {
    p: "Preciso instalar alguma coisa?",
    r: "Não. Tudo funciona pelo navegador, no computador ou no celular. Seus clientes também não precisam baixar aplicativo.",
  },
  {
    p: "Quanto tempo leva para começar?",
    r: "Minutos. Depois do cadastro o painel já está liberado: é só cadastrar serviços e equipe e divulgar o link do seu site.",
  },
  {
    p: "Tem fidelidade ou multa?",
    r: "Não. A assinatura é mensal e você pode trocar de plano ou cancelar quando quiser.",
  },
  {
    p: "Meus barbeiros veem o faturamento?",
    r: "Só se você permitir. Para cada pessoa da equipe você escolhe o que ela pode ver e o que pode editar.",
  },
  {
    p: "Os clientes pagam pelo site?",
    r: "Sim. Você conecta a sua conta de recebimento com um passo a passo, e o dinheiro cai direto na sua conta.",
  },
];

export default function MarketingHomePage() {
  const demo = tenantOrigin("barbearia-teste");

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Topo */}
      <header className="grain relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{ background: `radial-gradient(ellipse at 70% 0%, ${DOURADO}33, transparent 60%)` }}
        />
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="badge-emblem size-9" style={{ color: DOURADO }}>
              <Scissors className="size-4" />
            </div>
            <span className="font-heading text-lg font-bold tracking-[0.15em] uppercase">BarberControl</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a href="#planos" className="hidden px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
              Planos
            </a>
            <a href="#duvidas" className="hidden px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
              Dúvidas
            </a>
            <Link
              href="/cadastro"
              className="rounded-lg px-4 py-2 font-semibold text-black transition-opacity hover:opacity-90"
              style={{ backgroundColor: DOURADO }}
            >
              Começar agora
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-24 md:grid-cols-2 md:pt-20">
          <div className="space-y-6">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: DOURADO }}>
              Sistema para barbearias
            </p>
            <h1 className="font-heading text-4xl leading-[1.05] font-bold uppercase sm:text-6xl">
              Sua barbearia organizada, cheia e no controle.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Agenda online, site próprio, loja, assinaturas, comissões e financeiro em um só lugar. Cadastre hoje e comece a
              usar na hora.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/cadastro"
                className="inline-flex h-12 items-center rounded-lg px-6 font-semibold tracking-wide text-black uppercase transition-opacity hover:opacity-90"
                style={{ backgroundColor: DOURADO }}
              >
                Quero meu sistema
              </Link>
              <a
                href={demo}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center rounded-lg border border-border px-6 font-semibold tracking-wide uppercase hover:bg-muted"
              >
                Ver site de exemplo
              </a>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4" style={{ color: DOURADO }} /> Sem fidelidade. Cancele quando quiser.
            </p>
          </div>

          {/* Mockup do celular com a agenda */}
          <div className="relative mx-auto w-full max-w-xs">
            <div className="rounded-[2.5rem] border-8 border-neutral-800 bg-neutral-950 p-4 shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="badge-emblem size-8 text-white">
                  <Scissors className="size-3.5" />
                </div>
                <div>
                  <p className="font-heading text-sm font-bold tracking-wider text-white uppercase">Sua Barbearia</p>
                  <p className="text-[10px] text-neutral-400">Agendar horário</p>
                </div>
              </div>
              <p className="mb-2 text-[11px] font-semibold text-neutral-300">Barbeiro</p>
              <div className="mb-4 flex gap-2">
                {["Diego", "Ibson", "Rafa"].map((n, i) => (
                  <div
                    key={n}
                    className="flex-1 rounded-lg border px-2 py-2 text-center text-[11px] text-white"
                    style={i === 0 ? { borderColor: DOURADO, backgroundColor: `${DOURADO}22` } : { borderColor: "#333" }}
                  >
                    {n}
                  </div>
                ))}
              </div>
              <p className="mb-2 text-[11px] font-semibold text-neutral-300">Horários de hoje</p>
              <div className="grid grid-cols-3 gap-2">
                {["09:00", "09:30", "10:30", "11:00", "14:00", "15:30"].map((h, i) => (
                  <div
                    key={h}
                    className="rounded-md border py-1.5 text-center text-[11px] text-white"
                    style={i === 2 ? { backgroundColor: DOURADO, borderColor: DOURADO, color: "#000" } : { borderColor: "#333" }}
                  >
                    {h}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg py-2.5 text-center text-xs font-bold tracking-wide text-black uppercase" style={{ backgroundColor: DOURADO }}>
                Confirmar · Corte R$ 45
              </div>
            </div>
            <div className="absolute -bottom-4 -left-6 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-xl sm:flex">
              <Smartphone className="size-4" style={{ color: DOURADO }} /> Novo agendamento: 10:30 com Diego
            </div>
          </div>
        </div>
      </header>

      {/* Benefícios */}
      <section className="mx-auto max-w-6xl space-y-10 px-4 py-20">
        <div className="max-w-2xl space-y-3">
          <h2 className="font-heading text-3xl font-bold uppercase sm:text-4xl">Tudo que a barbearia precisa</h2>
          <p className="text-muted-foreground">Feito para o dia a dia da barbearia, do agendamento ao fechamento do mês.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICIOS.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="rounded-xl border border-border bg-card p-6">
              <Icon className="mb-4 size-6" style={{ color: DOURADO }} />
              <h3 className="mb-2 text-lg font-semibold">{titulo}</h3>
              <p className="text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
          {PASSOS.map((p) => (
            <div key={p.n} className="flex gap-4">
              <span className="font-heading text-5xl font-bold" style={{ color: DOURADO }}>
                {p.n}
              </span>
              <div>
                <h3 className="text-lg font-semibold">{p.titulo}</h3>
                <p className="text-sm text-muted-foreground">{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="mx-auto max-w-6xl scroll-mt-8 space-y-10 px-4 py-20">
        <div className="space-y-3 text-center">
          <h2 className="font-heading text-3xl font-bold uppercase sm:text-4xl">Planos</h2>
          <p className="text-muted-foreground">Mensal, sem fidelidade. Comece no plano certo e mude quando quiser.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {(Object.keys(PLANOS_SAAS) as PlanoSaas[]).map((id) => {
            const plano = PLANOS_SAAS[id];
            const destaque = id === "pro";
            return (
              <div
                key={id}
                className="relative flex flex-col rounded-2xl border bg-card p-7"
                style={destaque ? { borderColor: DOURADO, boxShadow: `0 0 0 1px ${DOURADO}` } : undefined}
              >
                {destaque && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold tracking-wide text-black uppercase"
                    style={{ backgroundColor: DOURADO }}
                  >
                    Mais escolhido
                  </span>
                )}
                <h3 className="font-heading text-xl font-bold tracking-wide uppercase">{plano.nome}</h3>
                <p className="mt-4 mb-6">
                  <span className="text-4xl font-bold">R$ {plano.preco}</span>
                  <span className="text-muted-foreground">/mês</span>
                </p>
                <ul className="mb-8 flex-1 space-y-2 text-sm">
                  {RECURSOS_PLANO[id].map((r) => (
                    <li key={r} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0" style={{ color: DOURADO }} />
                      {r}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/cadastro?plano=${id}`}
                  className="inline-flex h-11 items-center justify-center rounded-lg font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
                  style={destaque ? { backgroundColor: DOURADO, color: "#000" } : { border: "1px solid var(--border)" }}
                >
                  Começar com o {plano.nome}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Personalização */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid items-center gap-8 rounded-2xl border border-border bg-card p-8 md:grid-cols-[auto_1fr]">
          <Palette className="size-10" style={{ color: DOURADO }} />
          <div>
            <h3 className="text-xl font-semibold">O site é da sua barbearia, com a sua cara</h3>
            <p className="text-sm text-muted-foreground">
              Escolha entre temas prontos, envie logo e fotos, defina as cores e as seções. Os clientes agendam, compram e
              assinam sem sair do seu site.
            </p>
          </div>
        </div>
      </section>

      {/* Dúvidas */}
      <section id="duvidas" className="mx-auto max-w-3xl scroll-mt-8 space-y-6 px-4 pb-24">
        <h2 className="font-heading text-center text-3xl font-bold uppercase">Dúvidas frequentes</h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {FAQ.map((f) => (
            <details key={f.p} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {f.p}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.r}</p>
            </details>
          ))}
        </div>
        <div className="text-center">
          <Link
            href="/cadastro"
            className="inline-flex h-12 items-center rounded-lg px-8 font-semibold tracking-wide text-black uppercase transition-opacity hover:opacity-90"
            style={{ backgroundColor: DOURADO }}
          >
            Começar agora
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} BarberControl</span>
          {/* Acesso discreto ao painel Master (pedido do produto: sem botão visível). */}
          <a href={`${masterOrigin()}/login`} aria-label="Acesso administrativo" className="opacity-30 transition-opacity hover:opacity-80">
            <Skull className="size-4" />
          </a>
        </div>
      </footer>
    </div>
  );
}
