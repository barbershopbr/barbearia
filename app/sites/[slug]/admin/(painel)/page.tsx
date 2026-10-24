import Link from "next/link";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { nivelSecao } from "@/lib/auth/papeis";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { brazilDayRangeUtc, hojeNoBrasil, mesNoBrasil } from "@/lib/tenant/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AgendamentoStatus } from "@/lib/supabase/types";

type Atendimento = {
  id: string;
  data_hora_inicio: string;
  status: AgendamentoStatus;
  desconto: number;
  funcionario_id: string;
  clientes: { nome: string } | null;
  servicos: { nome: string; preco: number } | null;
  funcionarios: { nome: string } | null;
};

const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const valorLiquido = (a: Atendimento) => Number(a.servicos?.preco ?? 0) - Number(a.desconto ?? 0);

export default async function AdminDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  const staff = await getCurrentStaff(empresa.id);
  if (!staff) return null;

  // Valores em dinheiro só para quem o dono liberou o financeiro.
  const veValores = nivelSecao(staff, "financeiro") !== null;
  const base = await tenantBasePath(slug);
  const hoje = hojeNoBrasil();
  const dia = brazilDayRangeUtc(hoje);
  const mes = mesNoBrasil(hoje);

  const supabase = await createSupabaseServerClient();
  const selectAtendimento = "id, data_hora_inicio, status, desconto, funcionario_id, clientes(nome), servicos(nome, preco), funcionarios(nome)";
  const [{ data: doMes }, { count: clientesNovos }, { count: totalClientes }, { count: pedidosPendentes }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(selectAtendimento)
      .eq("empresa_id", empresa.id)
      .gte("data_hora_inicio", mes.inicio.toISOString())
      .lte("data_hora_inicio", mes.fim.toISOString())
      .order("data_hora_inicio") as unknown as Promise<{ data: Atendimento[] | null }>,
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresa.id)
      .gte("created_at", mes.inicio.toISOString()),
    supabase.from("clientes").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id),
    supabase
      .from("pagamentos")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresa.id)
      .eq("tipo", "produto")
      .eq("status", "pendente")
      .eq("separado", false),
  ]);

  const atendimentos = doMes ?? [];
  const deHoje = atendimentos.filter((a) => a.data_hora_inicio >= dia.inicio.toISOString() && a.data_hora_inicio <= dia.fim.toISOString());
  const concluidosHoje = deHoje.filter((a) => a.status === "concluido");
  const concluidosMes = atendimentos.filter((a) => a.status === "concluido");
  const faturamentoHoje = concluidosHoje.reduce((s, a) => s + valorLiquido(a), 0);
  const faturamentoMes = concluidosMes.reduce((s, a) => s + valorLiquido(a), 0);
  const ticketMedio = concluidosMes.length ? faturamentoMes / concluidosMes.length : 0;
  const faltasMes = atendimentos.filter((a) => a.status === "falta").length;

  const agora = new Date().toISOString();
  const proximos = deHoje.filter((a) => a.data_hora_inicio >= agora && (a.status === "agendado" || a.status === "confirmado")).slice(0, 8);

  const porProfissional = new Map<string, { nome: string; qtd: number; valor: number }>();
  for (const a of concluidosMes) {
    const p = porProfissional.get(a.funcionario_id) ?? { nome: a.funcionarios?.nome ?? "—", qtd: 0, valor: 0 };
    p.qtd += 1;
    p.valor += valorLiquido(a);
    porProfissional.set(a.funcionario_id, p);
  }
  const ranking = [...porProfissional.values()].sort((x, y) => y.valor - x.valor);

  const cards: { label: string; value: string; sub?: string; destaque?: boolean; href?: string }[] = [
    { label: "Atendimentos hoje", value: String(deHoje.length), sub: `${concluidosHoje.length} concluído(s)`, href: `${base}/admin/agenda` },
    ...(veValores
      ? [
          { label: "Faturamento hoje", value: brl(faturamentoHoje) },
          { label: "Faturamento do mês", value: brl(faturamentoMes), sub: `${concluidosMes.length} atendimento(s)` },
          { label: "Ticket médio (mês)", value: brl(ticketMedio) },
        ]
      : [{ label: "Concluídos no mês", value: String(concluidosMes.length) }]),
    { label: "Clientes", value: String(totalClientes ?? 0), sub: `${clientesNovos ?? 0} novo(s) no mês`, href: `${base}/admin/clientes` },
    { label: "Faltas no mês", value: String(faltasMes) },
    {
      label: "Pedidos para separar",
      value: String(pedidosPendentes ?? 0),
      destaque: (pedidosPendentes ?? 0) > 0,
      href: `${base}/admin/pedidos`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Olá, {staff.nome.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(`${hoje}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const conteudo = (
            <Card className={c.destaque ? "h-full border-2 border-destructive/50" : "h-full"}>
              <CardHeader>
                <CardTitle className="text-sm font-normal text-muted-foreground">{c.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-semibold ${c.destaque ? "text-destructive" : ""}`}>{c.value}</p>
                {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
              </CardContent>
            </Card>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="block transition-opacity hover:opacity-80">
              {conteudo}
            </Link>
          ) : (
            <div key={c.label}>{conteudo}</div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximos de hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {proximos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum atendimento pendente para hoje.</p>
            ) : (
              <Table>
                <TableBody>
                  {proximos.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{hora(a.data_hora_inicio)}</TableCell>
                      <TableCell>{a.clientes?.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{a.servicos?.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{a.funcionarios?.nome}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profissionais no mês</CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum atendimento concluído neste mês ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-right">Atendimentos</TableHead>
                    {veValores && <TableHead className="text-right">Faturado</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((p) => (
                    <TableRow key={p.nome}>
                      <TableCell>{p.nome}</TableCell>
                      <TableCell className="text-right">{p.qtd}</TableCell>
                      {veValores && <TableCell className="text-right">{brl(p.valor)}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
