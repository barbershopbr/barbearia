import Link from "next/link";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { temRecurso } from "@/lib/plano/recursos";
import { gerarRelatorio } from "@/lib/relatorios/dados";
import { periodoPadrao } from "@/lib/relatorios/periodo";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { BotaoImprimir } from "./imprimir";

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dataBR = (d: string) => d.split("-").reverse().join("/");
const ATALHOS = [
  { id: "mes", label: "Este mês" },
  { id: "mes-passado", label: "Mês passado" },
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
];

function Tabela({ cab, linhas }: { cab: string[]; linhas: (string | number)[][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {cab.map((c, i) => (
            <TableHead key={c} className={i > 0 ? "text-right" : ""}>
              {c}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map((l, i) => (
          <TableRow key={i}>
            {l.map((c, j) => (
              <TableCell key={j} className={j > 0 ? "text-right" : ""}>
                {c}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {linhas.length === 0 && (
          <TableRow>
            <TableCell colSpan={cab.length} className="text-center text-sm text-muted-foreground">
              Sem dados no período.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default async function RelatoriosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ p?: string; de?: string; ate?: string }>;
}) {
  const { slug } = await params;
  const q = await searchParams;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "relatorios")) return <RecursoBloqueado recurso="relatorios" />;

  const periodo = periodoPadrao(q.p, q.de, q.ate);
  const r = await gerarRelatorio(empresa.id, periodo.de, periodo.ate);
  const maxDia = Math.max(1, ...r.porDia.map((d) => d.valor));
  const exportar = (tipo: string) => `relatorios/exportar?tipo=${tipo}&de=${periodo.de}&ate=${periodo.ate}`;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            {empresa.nome} · {dataBR(periodo.de)} a {dataBR(periodo.ate)}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button size="sm" variant="outline" render={<a href={exportar("resumo")}>Exportar Excel</a>} />
          <BotaoImprimir />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {ATALHOS.map((a) => (
          <Link
            key={a.id}
            href={`?p=${a.id}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              periodo.atalho === a.id ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40",
            )}
          >
            {a.label}
          </Link>
        ))}
        <form className="flex flex-wrap items-center gap-2">
          <Input type="date" name="de" defaultValue={periodo.de} className="w-36" aria-label="De" />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" name="ate" defaultValue={periodo.ate} className="w-36" aria-label="Até" />
          <Button type="submit" size="sm" variant="outline">
            Aplicar
          </Button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { l: "Faturamento", v: brl(r.totais.faturamento) },
          { l: "Atendimentos", v: String(r.totais.atendimentos) },
          { l: "Ticket médio", v: brl(r.totais.ticketMedio) },
          { l: "Produtos", v: brl(r.totais.vendasProdutos) },
          { l: "Mensalidades", v: brl(r.totais.mensalidades) },
          { l: "Atend. de assinantes", v: String(r.totais.assinantesAtendidos) },
        ].map((c) => (
          <div key={c.l} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{c.l}</p>
            <p className="text-lg font-semibold">{c.v}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faturamento por dia</CardTitle>
        </CardHeader>
        <CardContent>
          {r.porDia.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem faturamento no período.</p>
          ) : (
            <div className="flex h-40 items-end gap-1 overflow-x-auto" role="img" aria-label="Gráfico de faturamento por dia">
              {r.porDia.map((d) => (
                <div
                  key={d.dia}
                  className="flex min-w-3 flex-1 flex-col items-center justify-end"
                  title={`${dataBR(d.dia)}: ${brl(d.valor)}`}
                >
                  <div className="w-full rounded-t bg-foreground/70" style={{ height: `${Math.max(2, (d.valor / maxDia) * 100)}%` }} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Por profissional</CardTitle>
            <a href={exportar("profissionais")} className="text-xs underline print:hidden">
              CSV
            </a>
          </CardHeader>
          <CardContent>
            <Tabela
              cab={["Profissional", "Atendimentos", "Faturado"]}
              linhas={r.porProfissional.map((x) => [x.nome, x.atendimentos, brl(x.valor)])}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Por serviço</CardTitle>
            <a href={exportar("servicos")} className="text-xs underline print:hidden">
              CSV
            </a>
          </CardHeader>
          <CardContent>
            <Tabela cab={["Serviço", "Qtd.", "Faturado"]} linhas={r.porServico.map((x) => [x.nome, x.quantidade, brl(x.valor)])} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Por forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabela cab={["Forma", "Valor"]} linhas={r.porForma.map((x) => [x.forma, brl(x.valor)])} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Produtos mais vendidos</CardTitle>
            <a href={exportar("produtos")} className="text-xs underline print:hidden">
              CSV
            </a>
          </CardHeader>
          <CardContent>
            <Tabela cab={["Produto", "Qtd.", "Vendido"]} linhas={r.produtos.map((x) => [x.nome, x.quantidade, brl(x.valor)])} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Clientes sumidos</CardTitle>
            <p className="text-sm text-muted-foreground">Sem visita há mais de 45 dias — chame de volta com uma promoção.</p>
          </div>
          <a href={exportar("sumidos")} className="text-xs underline print:hidden">
            CSV
          </a>
        </CardHeader>
        <CardContent>
          <Tabela
            cab={["Cliente", "Visitas", "Última visita", "Contato"]}
            linhas={r.clientesSumidos.map((c) => [c.nome, c.visitas, dataBR(c.ultimaVisita), c.telefone ?? c.email ?? "—"])}
          />
        </CardContent>
      </Card>
    </div>
  );
}
