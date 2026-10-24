import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ProdutosClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();
  const { data: produtos } = await supabase
    .from("produtos_publicos")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("nome");

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-bold tracking-wide uppercase">Produtos</h2>
      {!produtos || produtos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum produto disponível no momento.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {produtos.map((p) => (
            <Card key={p.id} className="border-2">
              <CardHeader>
                <CardTitle className="text-base">{p.nome}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
                <p className="text-lg font-semibold">R$ {Number(p.preco).toFixed(2)}</p>
                <Button className="w-full" disabled title="Pagamento online chega em breve">
                  Comprar (em breve)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
