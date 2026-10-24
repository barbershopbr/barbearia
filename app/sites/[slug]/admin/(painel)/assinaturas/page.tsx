import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hojeNoBrasil, mesNoBrasil } from "@/lib/tenant/timezone";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssinaturaStatusSelect } from "./status-select";
import { NovaAssinaturaDialog, RegistrarMensalidadeDialog } from "./assinatura-forms";
import type { AssinaturaStatus } from "@/lib/supabase/types";
import { temRecurso } from "@/lib/plano/recursos";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";

type AssinaturaLinha = {
  id: string;
  status: AssinaturaStatus;
  data_inicio: string;
  data_proxima_cobranca: string | null;
  clientes: { nome: string; telefone: string | null } | null;
  planos: { nome: string; valor: number; periodo: string } | null;
};

const dataBR = (d: string) => d.split("-").reverse().join("/");
const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export default async function AssinaturasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "assinaturas")) return <RecursoBloqueado recurso="assinaturas" />;

  const hoje = hojeNoBrasil();
  const mes = mesNoBrasil(hoje);
  const supabase = await createSupabaseServerClient();
  const [{ data: assinaturas }, { data: pagosMes }, { data: clientes }, { data: planos }] = await Promise.all([
    supabase
      .from("assinaturas_clientes")
      .select("id, status, data_inicio, data_proxima_cobranca, clientes(nome, telefone), planos(nome, valor, periodo)")
      .eq("empresa_id", empresa.id)
      .order("data_inicio", { ascending: false }) as unknown as Promise<{ data: AssinaturaLinha[] | null }>,
    supabase
      .from("pagamentos")
      .select("valor")
      .eq("empresa_id", empresa.id)
      .eq("tipo", "assinatura")
      .eq("status", "pago")
      .gte("pago_em", mes.inicio.toISOString())
      .lte("pago_em", mes.fim.toISOString()),
    supabase.from("clientes").select("id, nome").eq("empresa_id", empresa.id).order("nome"),
    supabase.from("planos").select("id, nome, valor").eq("empresa_id", empresa.id).eq("ativo", true).order("valor"),
  ]);

  const lista = assinaturas ?? [];
  const ativas = lista.filter((a) => a.status === "ativa");
  const vencidas = ativas.filter((a) => a.data_proxima_cobranca && a.data_proxima_cobranca < hoje);
  const recebidoMes = (pagosMes ?? []).reduce((s, p) => s + Number(p.valor), 0);
  const previstoMes = ativas.reduce((s, a) => s + Number(a.planos?.valor ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Assinaturas</h1>
          <p className="text-sm text-muted-foreground">
            Clientes assinantes, mensalidades e vencimentos. Pagamento no balcão: use &quot;Registrar pagamento&quot;.
          </p>
        </div>
        <NovaAssinaturaDialog slug={slug} clientes={clientes ?? []} planos={planos ?? []} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Assinantes ativos", valor: String(ativas.length) },
          { label: "Recebido no mês", valor: brl(recebidoMes) },
          { label: "Previsto por mês", valor: brl(previstoMes) },
          { label: "Mensalidades vencidas", valor: String(vencidas.length), alerta: vencidas.length > 0 },
        ].map((c) => (
          <Card key={c.label} className={c.alerta ? "border-2 border-destructive/50" : undefined}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-semibold ${c.alerta ? "text-destructive" : ""}`}>{c.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Próxima cobrança</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((a) => {
            const vencida = a.status === "ativa" && !!a.data_proxima_cobranca && a.data_proxima_cobranca < hoje;
            return (
              <TableRow key={a.id}>
                <TableCell>
                  {a.clientes?.nome}
                  {a.clientes?.telefone && <span className="block text-xs text-muted-foreground">{a.clientes.telefone}</span>}
                </TableCell>
                <TableCell>
                  {a.planos?.nome}
                  <span className="block text-xs text-muted-foreground">
                    {brl(Number(a.planos?.valor ?? 0))}/{a.planos?.periodo}
                  </span>
                </TableCell>
                <TableCell>
                  {a.data_proxima_cobranca ? (
                    <span className={vencida ? "font-medium text-destructive" : ""}>
                      {dataBR(a.data_proxima_cobranca)}
                      {vencida && <Badge variant="destructive" className="ml-2">vencida</Badge>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <AssinaturaStatusSelect assinaturaId={a.id} status={a.status} />
                </TableCell>
                <TableCell className="text-right">
                  {a.status !== "cancelada" && (
                    <RegistrarMensalidadeDialog slug={slug} assinaturaId={a.id} valorPlano={Number(a.planos?.valor ?? 0)} hoje={hoje} />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {lista.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Nenhuma assinatura ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
