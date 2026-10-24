import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const hojeFim = new Date();
  hojeFim.setHours(23, 59, 59, 999);

  const [{ count: totalClientes }, { count: agendamentosHoje }, { count: servicosAtivos }, { count: pedidosPendentes }] =
    await Promise.all([
      supabase.from("clientes").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id),
      supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresa.id)
        .gte("data_hora_inicio", hojeInicio.toISOString())
        .lte("data_hora_inicio", hojeFim.toISOString()),
      supabase.from("servicos").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("ativo", true),
      supabase
        .from("pagamentos")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresa.id)
        .eq("tipo", "produto")
        .eq("separado", false),
    ]);

  const cards = [
    { label: "Clientes cadastrados", value: totalClientes ?? 0 },
    { label: "Agendamentos hoje", value: agendamentosHoje ?? 0 },
    { label: "Serviços ativos", value: servicosAtivos ?? 0 },
    { label: "Pedidos pendentes de separar", value: pedidosPendentes ?? 0, destaque: (pedidosPendentes ?? 0) > 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className={c.destaque ? "border-2 border-destructive/50" : undefined}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-semibold ${c.destaque ? "text-destructive" : ""}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
