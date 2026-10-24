import Link from "next/link";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { hojeNoBrasil, mesNoBrasil } from "@/lib/tenant/timezone";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovaDespesaDialog } from "./despesa-form";
import { deleteDespesa } from "./actions";
import { temRecurso } from "@/lib/plano/recursos";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";

function deslocarMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function FinanceiroPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { slug } = await params;
  const { mes: mesParam } = await searchParams;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "financeiro")) return <RecursoBloqueado recurso="financeiro" />;

  const supabase = await createSupabaseServerClient();

  // Mês no horário do Brasil (o Worker roda em UTC).
  const mesAtual = hojeNoBrasil().slice(0, 7);
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : mesAtual;
  const { primeiroDia: inicioMesStr, ultimoDia: fimMesStr, inicio: inicioMes, fim: fimMes } = mesNoBrasil(`${mes}-01`);
  const nomeMes = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

  const [{ data: agendamentosConcluidos }, { data: mensalidadesPagas }, { data: despesas }, { data: vendasProdutos }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("id, desconto, servicos(preco)")
      .eq("empresa_id", empresa.id)
      .eq("status", "concluido")
      .is("assinatura_id", null) // atendimento de assinante já entrou pela mensalidade
      .gte("data_hora_inicio", inicioMes.toISOString())
      .lte("data_hora_inicio", fimMes.toISOString()) as unknown as Promise<{
      data: { id: string; desconto: number; servicos: { preco: number } | null }[] | null;
    }>,
    // Mensalidades efetivamente pagas no mês (balcão ou online).
    supabase
      .from("pagamentos")
      .select("valor")
      .eq("empresa_id", empresa.id)
      .eq("tipo", "assinatura")
      .eq("status", "pago")
      .gte("pago_em", inicioMes.toISOString())
      .lte("pago_em", fimMes.toISOString()),
    supabase
      .from("despesas")
      .select("*")
      .eq("empresa_id", empresa.id)
      .gte("data", inicioMesStr)
      .lte("data", fimMesStr)
      .order("data", { ascending: false }),
    // Pedido da loja entra como venda quando foi pago (retirado na barbearia).
    supabase
      .from("pagamentos")
      .select("valor, status, separado")
      .eq("empresa_id", empresa.id)
      .eq("tipo", "produto")
      .gte("created_at", inicioMes.toISOString())
      .lte("created_at", fimMes.toISOString()),
  ]);

  // Vendas do caixa (balcão) no mês, com os atendimentos da agenda cobrados lá.
  const { data: vendasBalcao } = (await supabase
    .from("pagamentos")
    .select("valor, pagamento_itens(agendamento_id)")
    .eq("empresa_id", empresa.id)
    .eq("tipo", "balcao")
    .eq("status", "pago")
    .gte("pago_em", inicioMes.toISOString())
    .lte("pago_em", fimMes.toISOString())) as unknown as { data: { valor: number; pagamento_itens: { agendamento_id: string | null }[] }[] | null };
  const receitaBalcao = (vendasBalcao ?? []).reduce((s, v) => s + Number(v.valor), 0);
  const cobradosNoCaixa = new Set((vendasBalcao ?? []).flatMap((v) => v.pagamento_itens.map((i) => i.agendamento_id)).filter(Boolean));

  // Atendimento cobrado no caixa já está em receitaBalcao (com o valor realmente recebido).
  const receitaServicos = (agendamentosConcluidos ?? [])
    .filter((a) => !cobradosNoCaixa.has(a.id))
    .reduce((s, a) => s + Number(a.servicos?.preco ?? 0) - Number(a.desconto ?? 0), 0);
  const receitaAssinaturas = (mensalidadesPagas ?? []).reduce((s, p) => s + Number(p.valor), 0);
  const totalDespesas = (despesas ?? []).reduce((s, d) => s + Number(d.valor), 0);
  const receitaProdutos = (vendasProdutos ?? [])
    .filter((p) => p.status === "pago")
    .reduce((s, p) => s + Number(p.valor), 0);
  const receitaTotal = receitaServicos + receitaAssinaturas + receitaProdutos + receitaBalcao;
  const saldo = receitaTotal - totalDespesas;

  const cards = [
    { label: "Atendimentos (agenda)", value: receitaServicos },
    { label: "Mensalidades recebidas (mês)", value: receitaAssinaturas },
    { label: "Vendas da loja (mês)", value: receitaProdutos },
    { label: "Vendas no caixa (mês)", value: receitaBalcao },
    { label: "Despesas (mês)", value: -totalDespesas },
    { label: "Saldo do mês", value: saldo, destaque: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Financeiro</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`?mes=${deslocarMes(mes, -1)}`} className="hover:text-foreground" aria-label="Mês anterior">‹</Link>
            <span className="capitalize">{nomeMes}</span>
            {mes < mesAtual && (
              <Link href={`?mes=${deslocarMes(mes, 1)}`} className="hover:text-foreground" aria-label="Próximo mês">›</Link>
            )}
          </div>
        </div>
        <NovaDespesaDialog slug={slug} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-semibold ${c.destaque && c.value < 0 ? "text-destructive" : ""}`}>
                R$ {c.value.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Despesas do mês</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(despesas ?? []).map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.descricao}</TableCell>
                <TableCell>{d.categoria ?? "—"}</TableCell>
                <TableCell>{new Date(d.data).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>R$ {Number(d.valor).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <form action={deleteDespesa.bind(null, d.id)}>
                    <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
            {(!despesas || despesas.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhuma despesa lançada neste mês.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
