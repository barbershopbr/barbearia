import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PagamentoLinha = {
  id: string;
  tipo: "agendamento" | "assinatura" | "produto";
  metodo: string;
  valor: number;
  status: string;
  separado: boolean;
  created_at: string;
  pagamento_itens: { quantidade: number; produtos: { nome: string } | null }[];
};

const TIPO_LABEL = { produto: "Pedido da loja", agendamento: "Agendamento", assinatura: "Assinatura" } as const;

/** Etapa que o cliente entende, a partir do status + "separado" (pronto). */
function etapa(p: PagamentoLinha): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (p.status === "cancelado") return { label: "Cancelado", variant: "secondary" };
  if (p.status === "pago") return { label: p.tipo === "produto" ? "Retirado" : "Pago", variant: "default" };
  if (p.status === "estornado") return { label: "Estornado", variant: "secondary" };
  if (p.status === "falhou") return { label: "Pagamento não aprovado", variant: "destructive" };
  if (p.tipo === "produto") return p.separado ? { label: "Pronto para retirada", variant: "default" } : { label: "Em preparo", variant: "outline" };
  return { label: "Pendente", variant: "outline" };
}

export default async function PagamentosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) return null;

  const supabase = await createSupabaseServerClient();
  const { data: pagamentos } = (await supabase
    .from("pagamentos")
    .select("id, tipo, metodo, valor, status, separado, created_at, pagamento_itens(quantidade, produtos(nome))")
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: false })
    .limit(50)) as unknown as { data: PagamentoLinha[] | null };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus pedidos e pagamentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!pagamentos || pagamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não fez pedidos.</p>
        ) : (
          pagamentos.map((p) => {
            const e = etapa(p);
            return (
              <div key={p.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{TIPO_LABEL[p.tipo] ?? p.tipo}</p>
                  {p.pagamento_itens.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {p.pagamento_itens.map((i) => `${i.quantidade}x ${i.produtos?.nome ?? "item"}`).join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    {p.metodo === "na_retirada" && p.status === "pendente" ? " · pagamento na retirada" : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium">R$ {Number(p.valor).toFixed(2).replace(".", ",")}</p>
                  <Badge variant={e.variant}>{e.label}</Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
