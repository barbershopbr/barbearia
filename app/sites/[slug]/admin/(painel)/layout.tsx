import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { COOKIE_SUPORTE } from "@/lib/plataforma";
import { Scissors } from "lucide-react";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { marcarTutorialVisto, signOutStaff } from "../actions";
import { TourPainel, BotaoVerTutorial } from "@/components/tour-painel";
import { PainelShell } from "@/components/painel-shell";
import { ICONES_GRUPO, MenuPainel } from "@/components/menu-painel";
import { BotaoNotificacoes } from "@/components/botao-notificacoes";
import { AvisoMensalidade, TelaBloqueio } from "@/components/aviso-mensalidade";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/tenant/timezone";
import { passosTutorial } from "@/lib/painel/tutorial";
import { tenantOrigin } from "@/lib/tenant/domain";
import { Button } from "@/components/ui/button";
import { PLANOS_SAAS, temRecurso, type Recurso } from "@/lib/plano/recursos";
import { PAPEL_LABEL, nivelSecao, podeAcessarSecao, secaoDoCaminho, secaoInicial } from "@/lib/auth/papeis";

type Item = { href: string; label: string; recurso?: Recurso };

// Menu por categoria. Toda página nova do admin entra aqui (e em SECOES de lib/auth/papeis.ts).
const INICIO: Item = { href: "/admin", label: "Início" };
const GRUPOS: { titulo: string; icone: keyof typeof ICONES_GRUPO; itens: Item[] }[] = [
  {
    titulo: "Atendimento",
    icone: "CalendarDays",
    itens: [
      { href: "/admin/agenda", label: "Agenda" },
      { href: "/admin/clientes", label: "Clientes" },
      { href: "/admin/caixa", label: "Caixa", recurso: "caixa" },
      { href: "/admin/avaliacoes", label: "Avaliações" },
    ],
  },
  {
    titulo: "Serviços e loja",
    icone: "ShoppingBag",
    itens: [
      { href: "/admin/servicos", label: "Serviços" },
      { href: "/admin/produtos", label: "Produtos", recurso: "loja" },
      { href: "/admin/pedidos", label: "Pedidos da loja", recurso: "loja" },
      { href: "/admin/fornecedores", label: "Fornecedores", recurso: "loja" },
    ],
  },
  {
    titulo: "Equipe",
    icone: "Users",
    itens: [
      { href: "/admin/funcionarios", label: "Funcionários" },
      { href: "/admin/comissoes", label: "Comissões", recurso: "comissoes" },
      { href: "/admin/pote", label: "Pote das assinaturas", recurso: "assinaturas" },
      { href: "/admin/meu-historico", label: "Meu histórico" },
    ],
  },
  {
    titulo: "Fidelização",
    icone: "BadgePercent",
    itens: [
      { href: "/admin/planos", label: "Planos de assinatura", recurso: "assinaturas" },
      { href: "/admin/assinaturas", label: "Assinantes", recurso: "assinaturas" },
      { href: "/admin/cupons", label: "Cupons", recurso: "cupons" },
      { href: "/admin/fidelidade", label: "Fidelidade", recurso: "fidelidade" },
    ],
  },
  {
    titulo: "Financeiro",
    icone: "Wallet",
    itens: [
      { href: "/admin/financeiro", label: "Resumo financeiro", recurso: "financeiro" },
      { href: "/admin/relatorios", label: "Relatórios", recurso: "relatorios" },
      { href: "/admin/pagamentos", label: "Recebimentos" },
      { href: "/admin/notas-fiscais", label: "Notas fiscais" },
    ],
  },
  {
    titulo: "Minha barbearia",
    icone: "Settings",
    itens: [
      { href: "/admin/site", label: "Aparência do site" },
      { href: "/admin/configuracoes", label: "Configurações" },
      { href: "/admin/dominio", label: "Domínio", recurso: "dominio_proprio" },
    ],
  },
];

export default async function AdminPainelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const base = await tenantBasePath(slug);
  const staff = await getCurrentStaff(empresa.id);
  if (!staff) redirect(`${base}/admin/login`);

  // Página fora do papel (ex.: barbeiro abrindo /admin/financeiro pela URL):
  // manda para a primeira seção liberada. O menu abaixo já esconde o resto.
  const secao = secaoDoCaminho((await headers()).get("x-pathname") ?? "");
  const modoSuporte = (await cookies()).get(COOKIE_SUPORTE)?.value === "1";
  if (secao !== null && !podeAcessarSecao(staff, secao)) {
    const destino = secaoInicial(staff);
    redirect(`${base}/admin${destino ? `/${destino}` : ""}`);
  }

  const visivel = (item: Item) => (!item.recurso || temRecurso(empresa, item.recurso)) && podeAcessarSecao(staff, item.href.replace(/^\/admin\/?/, ""));
  const grupos = GRUPOS.map((g) => ({ titulo: g.titulo, icone: ICONES_GRUPO[g.icone], itens: g.itens.filter(visivel) })).filter((g) => g.itens.length > 0);

  // Mensalidade do BarberControl: aviso para o responsável/admin e bloqueio.
  const gestor = staff.role === "owner" || staff.role === "admin";
  const supabaseFatura = await createSupabaseServerClient();
  const { data: faturaAberta } = gestor
    ? await supabaseFatura
        .from("faturas_saas")
        .select("valor, vencimento")
        .eq("empresa_id", empresa.id)
        .eq("status", "aberta")
        .order("vencimento")
        .limit(1)
        .maybeSingle()
    : { data: null };
  if (empresa.status === "bloqueado") {
    return (
      <div className="min-h-screen bg-background p-4">
        <TelaBloqueio motivo={empresa.bloqueio_motivo} fatura={faturaAberta} />
        <form action={signOutStaff.bind(null, slug)} className="text-center">
          <Button type="submit" variant="outline" size="sm">
            Sair
          </Button>
        </form>
      </div>
    );
  }

  return (
    <PainelShell
      titulo={empresa.nome}
      menu={
        <>
          <div className="mb-6 flex items-center gap-2">
            <Scissors className="size-4 shrink-0" />
            <p className="font-heading truncate text-sm font-semibold tracking-wide uppercase">{empresa.nome}</p>
          </div>
          <MenuPainel base={base} inicio={visivel(INICIO) ? INICIO : null} grupos={grupos} atual={secao} />
          <div className="mt-6 space-y-1 border-t border-sidebar-border pt-4">
            <a
              href={tenantOrigin(slug)}
              target="_blank"
              rel="noreferrer"
              data-tour="ver-site"
              className="block rounded px-2 py-1.5 text-sm tracking-wide uppercase hover:bg-sidebar-accent"
            >
              Ver meu site ↗
            </a>
            <BotaoVerTutorial className="block w-full rounded px-2 py-1.5 text-left text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent" />
            <BotaoNotificacoes slug={slug} quem="equipe" chavePublica={process.env.VAPID_PUBLIC_KEY ?? ""} className="px-2 py-1.5" />
          </div>
          <div className="mt-4 border-t border-sidebar-border pt-4">
            <p className="mb-1 text-xs text-sidebar-foreground/60">Plano {PLANOS_SAAS[empresa.plano_saas].nome}</p>
            <p className="mb-2 text-xs text-sidebar-foreground/60">
              {staff.nome} · {PAPEL_LABEL[staff.role]}
            </p>
            <form action={signOutStaff.bind(null, slug)}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
              >
                Sair
              </Button>
            </form>
          </div>
        </>
      }
    >
      {modoSuporte && (
        <p className="mb-4 rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm text-violet-800 dark:text-violet-200">
          Modo suporte do BarberControl: você está no painel como o responsável. Use &quot;Sair&quot; ao terminar.
        </p>
      )}
      <AvisoMensalidade fatura={faturaAberta} hoje={hojeNoBrasil()} />
      {secao !== null && nivelSecao(staff, secao) === "ver" && (
        <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Você pode ver esta seção, mas não alterar. Fale com o responsável se precisar editar.
        </p>
      )}
      {children}
      <TourPainel
        passos={passosTutorial(empresa.nome)}
        iniciarAberto={!staff.tutorial_visto_em}
        aoConcluir={marcarTutorialVisto.bind(null, slug)}
      />
    </PainelShell>
  );
}
