import Link from "next/link";
import { Scissors } from "lucide-react";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SolicitarPlanoButton } from "./solicitar-plano-button";
import { CartWidget } from "./cart-widget";
import { AddToCartButton } from "./add-to-cart-button";
import { temRecurso } from "@/lib/plano/recursos";

const DIAS_SEMANA: Record<string, string> = {
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
  domingo: "Domingo",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading flex items-center justify-center gap-3 text-2xl font-bold tracking-[0.1em] uppercase sm:justify-start">
      <span className="h-px w-8 bg-foreground/30 sm:hidden" />
      {children}
      <span className="h-px flex-1 bg-foreground/20" />
    </h2>
  );
}

export default async function TenantHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null; // layout já chama notFound()

  const cliente = await getCurrentCliente(empresa.id);
  const supabase = await createSupabaseServerClient();
  const base = await tenantBasePath(slug);

  const [{ data: servicos }, { data: funcionarios }, { data: planosTodos }, { data: produtosTodos }] = await Promise.all([
    supabase.from("servicos").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("planos").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("valor"),
    supabase.from("produtos").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
  ]);

  // Seções que dependem do plano do SaaS somem do site quando o recurso não está liberado.
  const planos = temRecurso(empresa, "assinaturas") ? planosTodos : null;
  const produtos = temRecurso(empresa, "loja") ? produtosTodos : null;

  const horarios = (empresa.horarios ?? {}) as Record<string, { abre?: string; fecha?: string; fechado?: boolean }>;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header
        className="grain relative flex flex-col items-center justify-center gap-4 overflow-hidden px-4 py-24 text-center text-white"
        style={{ backgroundColor: "var(--tenant-primary)" }}
      >
        {empresa.banner_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35"
            style={{ backgroundImage: `url(${empresa.banner_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />

        <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-8">
          <span className="font-heading text-sm font-semibold tracking-[0.2em] uppercase">{empresa.nome}</span>
          <div className="flex items-center gap-2">
            {produtos && produtos.length > 0 && (
              <CartWidget slug={slug} loggedIn={!!cliente} entrarHref={`${base}/area-cliente/login`} />
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              render={<Link href={cliente ? `${base}/area-cliente` : `${base}/entrar`}>{cliente ? cliente.nome.split(" ")[0] : "Entrar"}</Link>}
            />
          </div>
        </nav>

        <div className="relative z-10 flex flex-col items-center gap-4">
          {empresa.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={empresa.logo_url} alt={empresa.nome} className="h-24 w-24 rounded-full border-2 border-white bg-white object-cover" />
          ) : (
            <div className="badge-emblem h-20 w-20 border-white text-white">
              <Scissors className="size-8" strokeWidth={1.5} />
            </div>
          )}
          <h1 className="font-heading text-4xl font-bold tracking-[0.08em] uppercase">{empresa.nome}</h1>
          {empresa.descricao && <p className="max-w-xl text-sm text-white/80">{empresa.descricao}</p>}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-4 py-16">
        {/* Serviços */}
        <section id="servicos" className="space-y-6">
          <SectionTitle>Serviços</SectionTitle>
          {!servicos || servicos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado ainda.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servicos.map((s) => (
                <Card key={s.id} className="border-2">
                  <CardHeader>
                    <CardTitle className="font-heading text-base tracking-wide uppercase">{s.nome}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {s.descricao && <p>{s.descricao}</p>}
                    <p className="font-medium text-foreground">
                      R$ {Number(s.preco).toFixed(2)} · {s.duracao_minutos} min
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {servicos && servicos.length > 0 && (
            <div className="text-center">
              <Button size="lg" render={<Link href={`${base}/agendar`}>Agendar horário</Link>} />
            </div>
          )}
        </section>

        {/* Produtos */}
        {produtos && produtos.length > 0 && (
          <section id="produtos" className="space-y-6">
            <SectionTitle>Produtos</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {produtos.map((p) => (
                <Card key={p.id} className="border-2">
                  <CardHeader>
                    <CardTitle className="font-heading text-base tracking-wide uppercase">{p.nome}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {p.descricao && <p>{p.descricao}</p>}
                    <p className="font-medium text-foreground">R$ {Number(p.preco).toFixed(2)}</p>
                    <AddToCartButton produtoId={p.id} nome={p.nome} preco={Number(p.preco)} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Equipe */}
        <section id="equipe" className="space-y-6">
          <SectionTitle>Equipe</SectionTitle>
          {!funcionarios || funcionarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Equipe ainda não cadastrada.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {funcionarios.map((f) => (
                <Card key={f.id} className="border-2">
                  <CardContent className="space-y-2 pt-6 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.foto_url || "/avatar-placeholder.svg"}
                      alt={f.nome}
                      className="mx-auto h-16 w-16 rounded-full border-2 border-border object-cover"
                    />
                    <p className="font-heading text-sm font-semibold tracking-wide uppercase">{f.nome}</p>
                    {f.especialidades?.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1">
                        {f.especialidades.map((e) => (
                          <Badge key={e} variant="secondary">{e}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Planos */}
        {planos && planos.length > 0 && (
          <section id="planos" className="space-y-6">
            <SectionTitle>Planos</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {planos.map((p) => (
                <Card key={p.id} className="border-2">
                  <CardHeader>
                    <CardTitle className="font-heading text-base tracking-wide uppercase">{p.nome}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p className="text-lg font-semibold text-foreground">
                      R$ {Number(p.valor).toFixed(2)}
                      <span className="text-sm font-normal text-muted-foreground">/{p.periodo}</span>
                    </p>
                    {cliente ? (
                      <SolicitarPlanoButton slug={slug} planoId={p.id} />
                    ) : (
                      <Button size="sm" variant="destructive" className="w-full" render={<Link href={`${base}/area-cliente/login`}>Entrar para assinar</Link>} />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Horários e contato */}
        <section id="contato" className="grid gap-8 sm:grid-cols-2">
          <div>
            <SectionTitle>Horários</SectionTitle>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {Object.entries(DIAS_SEMANA).map(([key, label]) => {
                const h = horarios[key];
                return (
                  <li key={key} className="flex justify-between border-b border-border/50 py-1">
                    <span>{label}</span>
                    <span>{h?.fechado || !h ? "Fechado" : `${h.abre} - ${h.fecha}`}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="space-y-2">
            <SectionTitle>Contato</SectionTitle>
            <div className="mt-4 space-y-2">
              {empresa.endereco && <p className="text-sm text-muted-foreground">{empresa.endereco}</p>}
              {empresa.telefone && <p className="text-sm text-muted-foreground">{empresa.telefone}</p>}
              <div className="flex gap-3 pt-2">
                {empresa.whatsapp && (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<a href={`https://wa.me/${empresa.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                  />
                )}
                {empresa.instagram && (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<a href={`https://instagram.com/${empresa.instagram}`} target="_blank" rel="noreferrer">Instagram</a>}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-6 text-center">
        <Link href={`${base}/admin/login`} className="text-xs tracking-wide text-muted-foreground uppercase hover:underline">
          Painel administrativo
        </Link>
      </footer>
    </div>
  );
}
