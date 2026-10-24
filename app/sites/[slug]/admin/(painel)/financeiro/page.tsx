import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovaDespesaDialog } from "./despesa-form";
import { deleteDespesa } from "./actions";

export default async function FinanceiroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
  const inicioMesStr = inicioMes.toISOString().slice(0, 10);
  const fimMesStr = fimMes.toISOString().slice(0, 10);

  const [{ data: agendamentosConcluidos }, { data: assinaturasAtivas }, { data: despesas }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("id, desconto, servicos(preco)")
      .eq("empresa_id", empresa.id)
      .eq("status", "concluido")
      .gte("data_hora_inicio", inicioMes.toISOString())
      .lte("data_hora_inicio", fimMes.toISOString()) as unknown as Promise<{
      data: { id: string; desconto: number; servicos: { preco: number } | null }[] | null;
    }>,
    supabase
      .from("assinaturas_clientes")
      .select("id, planos(valor)")
      .eq("empresa_id", empresa.id)
      .eq("status", "ativa") as unknown as Promise<{ data: { id: string; planos: { valor: number } | null }[] | null }>,
    supabase
      .from("despesas")
      .select("*")
      .eq("empresa_id", empresa.id)
      .gte("data", inicioMesStr)
      .lte("data", fimMesStr)
      .order("data", { ascending: false }),
  ]);

  const receitaServicos = (agendamentosConcluidos ?? []).reduce(
    (s, a) => s + Number(a.servicos?.preco ?? 0) - Number(a.desconto ?? 0),
    0,
  );
  const receitaAssinaturas = (assinaturasAtivas ?? []).reduce((s, a) => s + Number(a.planos?.valor ?? 0), 0);
  const totalDespesas = (despesas ?? []).reduce((s, d) => s + Number(d.valor), 0);
  const receitaTotal = receitaServicos + receitaAssinaturas;
  const saldo = receitaTotal - totalDespesas;

  const cards = [
    { label: "Receita de serviços (mês)", value: receitaServicos },
    { label: "Receita de assinaturas ativas", value: receitaAssinaturas },
    { label: "Despesas (mês)", value: -totalDespesas },
    { label: "Saldo do mês", value: saldo, destaque: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            {inicioMes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <NovaDespesaDialog slug={slug} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
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
