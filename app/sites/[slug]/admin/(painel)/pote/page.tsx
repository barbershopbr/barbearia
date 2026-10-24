import Link from "next/link";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { nivelSecao } from "@/lib/auth/papeis";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { temRecurso } from "@/lib/plano/recursos";
import { previaPote } from "@/lib/comissoes/pote";
import { hojeNoBrasil } from "@/lib/tenant/timezone";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfigPoteForm } from "./config-form";
import { FechamentoBotao } from "./fechamento-botao";

const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

function deslocarMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export default async function PotePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ mes?: string }> }) {
  const { slug } = await params;
  const { mes: mesParam } = await searchParams;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "assinaturas")) return <RecursoBloqueado recurso="assinaturas" />;
  const staff = await getCurrentStaff(empresa.id);
  const podeEditar = !!staff && nivelSecao(staff, "pote") === "editar";

  const mesAtual = hojeNoBrasil().slice(0, 7);
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) && mesParam <= mesAtual ? mesParam : mesAtual;
  const nomeMes = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

  const supabase = await createSupabaseServerClient();
  const [{ config, resultado, fechamento }, { data: funcionarios }, { data: servicos }, { data: historico }] = await Promise.all([
    previaPote(empresa.id, mes, empresa.pote_config),
    supabase.from("funcionarios").select("id, nome").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("servicos").select("id, nome, preco").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("pote_fechamentos").select("competencia, pote, distribuido, sobra").eq("empresa_id", empresa.id).order("competencia", { ascending: false }).limit(12),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pote das assinaturas</h1>
        <p className="text-sm text-muted-foreground">
          Mensalidades pagas no mês, menos a parte da casa, divididas pelos pontos dos atendimentos de assinantes.
        </p>
      </div>

      {!config.ativo && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          O pote está desligado: atendimentos de assinantes geram comissão normal. Ative na configuração abaixo.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-3 capitalize">
            <Link href={`?mes=${deslocarMes(mes, -1)}`} aria-label="Mês anterior" className="text-muted-foreground hover:text-foreground">‹</Link>
            {nomeMes}
            {mes < mesAtual && (
              <Link href={`?mes=${deslocarMes(mes, 1)}`} aria-label="Próximo mês" className="text-muted-foreground hover:text-foreground">›</Link>
            )}
            {fechamento && <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-normal text-emerald-700 normal-case dark:text-emerald-300">fechado</span>}
          </CardTitle>
          {podeEditar && <FechamentoBotao slug={slug} competencia={mes} fechado={!!fechamento} podeFechar={mes < mesAtual} />}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { l: "Mensalidades pagas", v: brl(resultado.receita) + (resultado.acumuladoAnterior ? ` + ${brl(resultado.acumuladoAnterior)} acumulado` : "") },
              { l: "Parte da casa", v: brl(resultado.parteCasa) },
              { l: "Pote", v: brl(resultado.pote) },
              { l: "Valor do ponto", v: resultado.totalPontos ? `R$ ${resultado.valorPonto.toFixed(4).replace(".", ",")}` : "—" },
            ].map((c) => (
              <div key={c.l} className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{c.l}</p>
                <p className="text-lg font-semibold">{c.v}</p>
              </div>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barbeiro</TableHead>
                <TableHead className="text-right">Atendimentos</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead className="text-right">Recebe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.linhas.map((l) => (
                <TableRow key={l.funcionarioId}>
                  <TableCell>{l.nome}</TableCell>
                  <TableCell className="text-right">{l.atendimentos}</TableCell>
                  <TableCell className="text-right">{l.pontos.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right font-medium">{brl(l.valor)}</TableCell>
                </TableRow>
              ))}
              {resultado.linhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Nenhum atendimento de assinante concluído neste mês.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {resultado.sobra > 0 && (
            <p className="text-sm text-muted-foreground">
              Sobra de {brl(resultado.sobra)}:{" "}
              {config.sobra === "acumular" ? "passa para o próximo mês." : "fica com a casa."}
            </p>
          )}
          {fechamento && <p className="text-xs text-muted-foreground">As comissões deste mês foram geradas em Comissões (tipo assinatura).</p>}
        </CardContent>
      </Card>

      {podeEditar && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <ConfigPoteForm
              slug={slug}
              config={config}
              funcionarios={funcionarios ?? []}
              servicos={(servicos ?? []).map((s) => ({ ...s, preco: Number(s.preco) }))}
            />
          </CardContent>
        </Card>
      )}

      {(historico ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meses fechados</CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            {(historico ?? []).map((h) => (
              <Link key={h.competencia} href={`?mes=${h.competencia.slice(0, 7)}`} className="flex justify-between py-2 hover:underline">
                <span className="capitalize">
                  {new Date(`${h.competencia}T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}
                </span>
                <span>
                  pote {brl(Number(h.pote))} · distribuído {brl(Number(h.distribuido))}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
