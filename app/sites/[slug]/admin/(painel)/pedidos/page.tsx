import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toggleSeparado } from "./actions";

type PedidoLinha = {
  id: string;
  valor: number;
  status: string;
  separado: boolean;
  created_at: string;
  clientes: { nome: string } | null;
  pagamento_itens: { quantidade: number; produtos: { nome: string } | null }[];
};

export default async function PedidosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();
  const { data: pedidos } = (await supabase
    .from("pagamentos")
    .select("id, valor, status, separado, created_at, clientes(nome), pagamento_itens(quantidade, produtos(nome))")
    .eq("empresa_id", empresa.id)
    .eq("tipo", "produto")
    .order("created_at", { ascending: false })) as unknown as { data: PedidoLinha[] | null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos de produtos feitos pelos clientes. Marque como separado quando preparar pra entrega/retirada.
        </p>
      </div>

      {(!pedidos || pedidos.length === 0) && (
        <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(pedidos ?? []).map((pedido) => (
          <Card key={pedido.id} className={pedido.separado ? "border-2" : "border-2 border-destructive/40"}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">{pedido.clientes?.nome}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(pedido.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <Badge variant={pedido.status === "pago" ? "default" : "secondary"}>{pedido.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1 text-sm text-muted-foreground">
                {pedido.pagamento_itens.map((item, i) => (
                  <li key={i}>
                    {item.quantidade}x {item.produtos?.nome}
                  </li>
                ))}
              </ul>
              <p className="text-sm font-semibold text-foreground">R$ {Number(pedido.valor).toFixed(2)}</p>
              <form action={toggleSeparado.bind(null, pedido.id, pedido.separado)}>
                <Button type="submit" size="sm" variant={pedido.separado ? "outline" : "default"} className="w-full">
                  {pedido.separado ? "Já separado ✓ (desfazer)" : "Marcar como separado"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
