import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PagamentosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) return null;

  const supabase = await createSupabaseServerClient();
  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus pagamentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!pagamentos || pagamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum pagamento ainda. Quando os pagamentos online forem ativados por aqui, o histórico aparece nesta tela.
          </p>
        ) : (
          pagamentos.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
              <div>
                <p className="text-sm font-medium">{p.tipo} · {p.metodo}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">R$ {Number(p.valor).toFixed(2)}</p>
                <Badge variant={p.status === "pago" ? "default" : "secondary"}>{p.status}</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
