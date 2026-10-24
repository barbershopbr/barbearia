import Link from "next/link";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelarPedido, marcarPedidoPronto, marcarPedidoRetirado } from "./actions";
import { temRecurso } from "@/lib/plano/recursos";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";
import { cn } from "@/lib/utils";

type PedidoLinha = {
  id: string;
  valor: number;
  status: string;
  separado: boolean;
  created_at: string;
  retirado_em: string | null;
  clientes: { nome: string; telefone: string | null } | null;
  pagamento_itens: { quantidade: number; produtos: { nome: string } | null }[];
};

const ABAS = [
  { id: "abertos", label: "Em aberto" },
  { id: "retirados", label: "Retirados" },
  { id: "cancelados", label: "Cancelados" },
] as const;

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function PedidosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { slug } = await params;
  const { aba: abaParam } = await searchParams;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "loja")) return <RecursoBloqueado recurso="loja" />;

  const aba = ABAS.some((a) => a.id === abaParam) ? abaParam : "abertos";
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("pagamentos")
    .select("id, valor, status, separado, created_at, retirado_em, clientes(nome, telefone), pagamento_itens(quantidade, produtos(nome))")
    .eq("empresa_id", empresa.id)
    .eq("tipo", "produto")
    .order("created_at", { ascending: aba === "abertos" })
    .limit(100);
  query = aba === "abertos" ? query.eq("status", "pendente") : aba === "retirados" ? query.eq("status", "pago") : query.eq("status", "cancelado");
  const { data: pedidos } = (await query) as unknown as { data: PedidoLinha[] | null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pedidos da loja</h1>
        <p className="text-sm text-muted-foreground">
          Retirada na barbearia com pagamento na hora. Marque como pronto (o cliente recebe aviso por e-mail) e depois como
          retirado — o estoque baixa nesse momento.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={`?aba=${a.id}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm",
              aba === a.id ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {a.label}
          </Link>
        ))}
      </div>

      {(!pedidos || pedidos.length === 0) && <p className="text-sm text-muted-foreground">Nenhum pedido aqui.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {(pedidos ?? []).map((pedido) => {
          const etapa =
            pedido.status === "pago"
              ? { label: "Retirado", variant: "default" as const }
              : pedido.status === "cancelado"
                ? { label: "Cancelado", variant: "secondary" as const }
                : pedido.separado
                  ? { label: "Pronto para retirada", variant: "default" as const }
                  : { label: "A preparar", variant: "destructive" as const };
          return (
            <Card key={pedido.id} className={cn("border-2", pedido.status === "pendente" && !pedido.separado && "border-destructive/40")}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{pedido.clientes?.nome}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {dataHora(pedido.created_at)}
                    {pedido.clientes?.telefone ? ` · ${pedido.clientes.telefone}` : ""}
                  </p>
                </div>
                <Badge variant={etapa.variant}>{etapa.label}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {pedido.pagamento_itens.map((item, i) => (
                    <li key={i}>
                      {item.quantidade}x {item.produtos?.nome}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-semibold text-foreground">
                  R$ {Number(pedido.valor).toFixed(2).replace(".", ",")}
                  <span className="font-normal text-muted-foreground"> · pagamento na retirada</span>
                </p>
                {pedido.retirado_em && <p className="text-xs text-muted-foreground">Retirado em {dataHora(pedido.retirado_em)}</p>}

                {pedido.status === "pendente" && (
                  <div className="flex flex-wrap gap-2">
                    {!pedido.separado ? (
                      <form action={marcarPedidoPronto.bind(null, pedido.id, true)} className="flex-1">
                        <Button type="submit" size="sm" className="w-full">
                          Marcar como pronto
                        </Button>
                      </form>
                    ) : (
                      <form action={marcarPedidoPronto.bind(null, pedido.id, false)}>
                        <Button type="submit" size="sm" variant="ghost">
                          Voltar para preparo
                        </Button>
                      </form>
                    )}
                    <form action={marcarPedidoRetirado.bind(null, pedido.id)} className="flex-1">
                      <Button type="submit" size="sm" variant={pedido.separado ? "default" : "outline"} className="w-full">
                        Retirado e pago
                      </Button>
                    </form>
                    <form action={cancelarPedido.bind(null, pedido.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                        Cancelar
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
