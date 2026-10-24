import Link from "next/link";
import { Scissors } from "lucide-react";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { temRecurso } from "@/lib/plano/recursos";
import { lerSiteConfig, corTextoSobre, type SecaoSite, type TemaSite } from "@/lib/site/config";
import type { Empresa } from "@/lib/supabase/types";
import type { Horario } from "@/lib/agenda/available-slots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SolicitarPlanoButton } from "./solicitar-plano-button";
import { CartWidget } from "./cart-widget";
import { AddToCartButton } from "./add-to-cart-button";

const DIAS_SEMANA: Record<string, string> = {
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
  domingo: "Domingo",
};

const brl = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

function SectionTitle({ children, tema }: { children: React.ReactNode; tema: TemaSite }) {
  if (tema === "minimal") {
    return <h2 className="text-center text-2xl font-semibold tracking-tight">{children}</h2>;
  }
  return (
    <h2 className="font-heading flex items-center justify-center gap-3 text-2xl font-bold tracking-[0.1em] uppercase sm:justify-start">
      <span className="h-px w-8 bg-foreground/30 sm:hidden" />
      {children}
      <span className="h-px flex-1 bg-foreground/20" />
    </h2>
  );
}

/** Link com a cor de destaque escolhida pelo dono. */
function BotaoDestaque({ href, cor, children, className }: { href: string; cor: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold tracking-wide uppercase shadow-sm transition-opacity hover:opacity-90",
        className,
      )}
      style={{ backgroundColor: cor, color: corTextoSobre(cor) }}
    >
      {children}
    </Link>
  );
}

function Logo({ empresa, className }: { empresa: Empresa; className?: string }) {
  return empresa.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={empresa.logo_url} alt={empresa.nome} className={cn("rounded-full bg-white object-cover", className)} />
  ) : (
    <div className={cn("badge-emblem border-current", className)}>
      <Scissors className="size-8" strokeWidth={1.5} />
    </div>
  );
}

export default async function TenantHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null; // layout já chama notFound()

  const config = lerSiteConfig(empresa.site_config);
  const { tema, corDestaque } = config;
  const cliente = await getCurrentCliente(empresa.id);
  const supabase = await createSupabaseServerClient();
  const base = await tenantBasePath(slug);

  const [
    { data: servicos },
    { data: funcionarios },
    { data: planosTodos },
    { data: produtosTodos },
    { data: fotos },
    { data: promocoes },
  ] = await Promise.all([
    supabase.from("servicos").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("planos").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("valor"),
    supabase.from("produtos_publicos").select("*").eq("empresa_id", empresa.id).order("nome"),
    supabase.from("galeria_fotos").select("*").eq("empresa_id", empresa.id).order("ordem").order("created_at"),
    // A policy pública já filtra ativas e dentro da validade.
    supabase.from("promocoes").select("*").eq("empresa_id", empresa.id).order("ordem").order("created_at"),
  ]);

  // Seções que dependem do plano do SaaS somem do site quando o recurso não está liberado.
  const planos = temRecurso(empresa, "assinaturas") ? (planosTodos ?? []) : [];
  const produtos = temRecurso(empresa, "loja") ? (produtosTodos ?? []) : [];
  const horarios = (empresa.horarios ?? {}) as Record<string, Horario>;

  const titulo = config.hero.titulo || empresa.nome;
  const subtitulo = config.hero.subtitulo || empresa.descricao;
  const cta = (servicos ?? []).length > 0 ? `${base}/agendar` : null;
  const card = tema === "minimal" ? "border shadow-none" : "border-2";

  const nav = (
    <nav
      className={cn(
        "z-20 flex items-center justify-between px-4 py-4 sm:px-8",
        tema === "minimal" ? "relative border-b" : "absolute inset-x-0 top-0 text-white",
      )}
    >
      <span className={cn("text-sm font-semibold", tema === "minimal" ? "tracking-tight" : "font-heading tracking-[0.2em] uppercase")}>
        {empresa.nome}
      </span>
      <div className="flex items-center gap-2">
        {produtos.length > 0 && <CartWidget slug={slug} loggedIn={!!cliente} entrarHref={`${base}/area-cliente/login`} />}
        <Button
          variant="outline"
          size="sm"
          className={tema === "minimal" ? "" : "border-white/40 bg-white/10 text-white hover:bg-white/20"}
          render={
            <Link href={cliente ? `${base}/area-cliente` : `${base}/entrar`}>{cliente ? cliente.nome.split(" ")[0] : "Entrar"}</Link>
          }
        />
      </div>
    </nav>
  );

  const secoes: Record<SecaoSite, React.ReactNode> = {
    promocoes:
      (promocoes ?? []).length > 0 ? (
        <section id="promocoes" className="space-y-6">
          <SectionTitle tema={tema}>Promoções</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {(promocoes ?? []).map((p) => (
              <Card key={p.id} className={cn(card, "overflow-hidden pt-0")}>
                {p.imagem_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagem_url} alt={p.titulo} className="aspect-[3/1] w-full object-cover" />
                )}
                <CardHeader className={p.imagem_url ? "" : "pt-6"}>
                  <CardTitle className="text-lg">{p.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {p.descricao && <p>{p.descricao}</p>}
                  {p.preco_por != null && (
                    <p className="text-foreground">
                      {p.preco_de != null && <span className="mr-2 text-muted-foreground line-through">{brl(p.preco_de)}</span>}
                      <span className="text-xl font-bold" style={{ color: corDestaque }}>
                        {brl(p.preco_por)}
                      </span>
                    </p>
                  )}
                  {p.validade && <p className="text-xs">Válida até {p.validade.split("-").reverse().join("/")}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null,

    servicos:
      (servicos ?? []).length > 0 ? (
        <section id="servicos" className="space-y-6">
          <SectionTitle tema={tema}>Serviços</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(servicos ?? []).map((s) => (
              <Card key={s.id} className={card}>
                <CardHeader>
                  <CardTitle className={tema === "minimal" ? "text-base" : "font-heading text-base tracking-wide uppercase"}>{s.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  {s.descricao && <p>{s.descricao}</p>}
                  <p className="font-medium text-foreground">
                    {brl(s.preco)} · {s.duracao_minutos} min
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {cta && (
            <div className="text-center">
              <BotaoDestaque href={cta} cor={corDestaque}>
                {config.hero.botao}
              </BotaoDestaque>
            </div>
          )}
        </section>
      ) : null,

    produtos:
      produtos.length > 0 ? (
        <section id="produtos" className="space-y-6">
          <SectionTitle tema={tema}>Produtos</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {produtos.map((p) => (
              <Card key={p.id} className={cn(card, p.foto_url && "overflow-hidden pt-0")}>
                {p.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.foto_url} alt={p.nome} className="aspect-square w-full object-cover" />
                )}
                <CardHeader>
                  <CardTitle className={tema === "minimal" ? "text-base" : "font-heading text-base tracking-wide uppercase"}>{p.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {p.descricao && <p>{p.descricao}</p>}
                  <p className="font-medium text-foreground">{brl(p.preco)}</p>
                  <AddToCartButton produtoId={p.id} nome={p.nome} preco={Number(p.preco)} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null,

    equipe:
      (funcionarios ?? []).length > 0 ? (
        <section id="equipe" className="space-y-6">
          <SectionTitle tema={tema}>Equipe</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(funcionarios ?? []).map((f) => (
              <Card key={f.id} className={card}>
                <CardContent className="space-y-2 pt-6 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.foto_url || "/avatar-placeholder.svg"}
                    alt={f.nome}
                    className="mx-auto size-24 rounded-full border-2 border-border object-cover"
                  />
                  <p className={tema === "minimal" ? "font-semibold" : "font-heading text-sm font-semibold tracking-wide uppercase"}>{f.nome}</p>
                  {f.bio && <p className="text-xs text-muted-foreground">{f.bio}</p>}
                  {cta && (
                    <Link
                      href={`${base}/agendar?barbeiro=${f.id}`}
                      className="inline-block pt-1 text-xs font-semibold tracking-wide uppercase underline-offset-4 hover:underline"
                      style={{ color: corDestaque }}
                    >
                      Agendar com {f.nome.split(" ")[0]}
                    </Link>
                  )}
                  {f.especialidades?.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1">
                      {f.especialidades.map((e) => (
                        <Badge key={e} variant="secondary">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null,

    galeria:
      (fotos ?? []).length > 0 ? (
        <section id="galeria" className="space-y-6">
          <SectionTitle tema={tema}>Galeria</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {(fotos ?? []).map((f) => (
              <figure key={f.id} className="group relative overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt={f.legenda ?? `Foto de ${empresa.nome}`}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {f.legenda && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs text-white">{f.legenda}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      ) : null,

    planos:
      planos.length > 0 ? (
        <section id="planos" className="space-y-6">
          <SectionTitle tema={tema}>Planos</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {planos.map((p) => (
              <Card key={p.id} className={card}>
                <CardHeader>
                  <CardTitle className={tema === "minimal" ? "text-base" : "font-heading text-base tracking-wide uppercase"}>{p.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="text-lg font-semibold text-foreground">
                    {brl(p.valor)}
                    <span className="text-sm font-normal text-muted-foreground">/{p.periodo}</span>
                  </p>
                  {Array.isArray(p.beneficios) && p.beneficios.length > 0 && (
                    <ul className="list-inside list-disc space-y-0.5">
                      {p.beneficios.map((b, i) => (
                        <li key={i}>{String(b)}</li>
                      ))}
                    </ul>
                  )}
                  {cliente ? (
                    <SolicitarPlanoButton slug={slug} planoId={p.id} />
                  ) : (
                    <BotaoDestaque href={`${base}/area-cliente/login`} cor={corDestaque} className="h-9 w-full text-xs">
                      Entrar para assinar
                    </BotaoDestaque>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null,

    contato: (
      <section id="contato" className="grid gap-8 sm:grid-cols-2">
        <div>
          <SectionTitle tema={tema}>Horários</SectionTitle>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            {Object.entries(DIAS_SEMANA).map(([key, label]) => {
              const h = horarios[key];
              return (
                <li key={key} className="flex justify-between border-b border-border/50 py-1">
                  <span>{label}</span>
                  <span>
                    {h?.fechado || !h
                      ? "Fechado"
                      : h.pausa_inicio && h.pausa_fim
                        ? `${h.abre} - ${h.pausa_inicio} · ${h.pausa_fim} - ${h.fecha}`
                        : `${h.abre} - ${h.fecha}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="space-y-2">
          <SectionTitle tema={tema}>Contato</SectionTitle>
          <div className="mt-4 space-y-2">
            {empresa.endereco && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(empresa.endereco)}`}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                {empresa.endereco}
              </a>
            )}
            {empresa.telefone && <p className="text-sm text-muted-foreground">{empresa.telefone}</p>}
            <div className="flex gap-3 pt-2">
              {empresa.whatsapp && (
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a href={`https://wa.me/${empresa.whatsapp}`} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  }
                />
              )}
              {empresa.instagram && (
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a href={`https://instagram.com/${empresa.instagram}`} target="_blank" rel="noreferrer">
                      Instagram
                    </a>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </section>
    ),
  };

  return (
    // Clássico usa o esquema escuro em todo o site; os outros, o claro.
    <div className={cn("min-h-screen bg-background text-foreground", tema === "classico" && "dark")}>
      {tema === "classico" && (
        <header
          className="grain relative flex min-h-[70vh] flex-col items-center justify-center gap-4 overflow-hidden px-4 py-24 text-center text-white"
          style={{ backgroundColor: "var(--tenant-primary)" }}
        >
          {empresa.banner_url && (
            <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url(${empresa.banner_url})` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90" />
          {nav}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <Logo empresa={empresa} className="size-28 border-2 border-white text-white" />
            <h1 className="font-heading text-4xl font-bold tracking-[0.08em] uppercase sm:text-5xl">{titulo}</h1>
            {subtitulo && <p className="max-w-xl text-sm text-white/80 sm:text-base">{subtitulo}</p>}
            {cta && (
              <BotaoDestaque href={cta} cor={corDestaque} className="mt-2">
                {config.hero.botao}
              </BotaoDestaque>
            )}
          </div>
        </header>
      )}

      {tema === "moderno" && (
        <header className="relative grid min-h-[70vh] text-white md:grid-cols-2" style={{ backgroundColor: "var(--tenant-primary)" }}>
          {nav}
          <div className="flex flex-col justify-center gap-5 px-6 pt-24 pb-12 sm:px-12">
            <Logo empresa={empresa} className="size-16 border border-white/60 text-white" />
            <h1 className="font-heading text-4xl leading-tight font-bold uppercase sm:text-6xl">{titulo}</h1>
            <div className="h-1 w-16 rounded" style={{ backgroundColor: corDestaque }} />
            {subtitulo && <p className="max-w-md text-white/80">{subtitulo}</p>}
            {cta && (
              <div>
                <BotaoDestaque href={cta} cor={corDestaque}>
                  {config.hero.botao}
                </BotaoDestaque>
              </div>
            )}
          </div>
          <div
            className="min-h-64 bg-cover bg-center"
            style={{
              backgroundImage: empresa.banner_url ? `url(${empresa.banner_url})` : undefined,
              backgroundColor: "var(--tenant-secondary)",
            }}
          />
        </header>
      )}

      {tema === "minimal" && (
        <header className="bg-background">
          {nav}
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-20 text-center">
            <Logo empresa={empresa} className="size-20 border" />
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{titulo}</h1>
            {subtitulo && <p className="max-w-xl text-muted-foreground">{subtitulo}</p>}
            {cta && (
              <BotaoDestaque href={cta} cor={corDestaque} className="rounded-full normal-case tracking-normal">
                {config.hero.botao}
              </BotaoDestaque>
            )}
          </div>
          {empresa.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={empresa.banner_url} alt="" className="mx-auto aspect-[3/1] w-full max-w-5xl rounded-none object-cover sm:rounded-2xl" />
          )}
        </header>
      )}

      <main className="mx-auto max-w-5xl space-y-16 px-4 py-16">
        {config.secoes
          .filter((s) => s.visivel && secoes[s.id])
          .map((s) => (
            <div key={s.id}>{secoes[s.id]}</div>
          ))}
      </main>

      <footer className="border-t border-border/50 py-6 text-center">
        <Link href={`${base}/admin/login`} className="text-xs tracking-wide text-muted-foreground uppercase hover:underline">
          Painel administrativo
        </Link>
      </footer>
    </div>
  );
}
