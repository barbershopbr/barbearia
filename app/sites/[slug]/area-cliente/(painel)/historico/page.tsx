import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AgendamentoRealizado = {
  id: string;
  data_hora_inicio: string;
  servicos: { nome: string; preco: number } | null;
  funcionarios: { nome: string } | null;
};

export default async function HistoricoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) return null;

  const supabase = await createSupabaseServerClient();
  const { data: realizados } = (await supabase
    .from("agendamentos")
    .select("id, data_hora_inicio, servicos(nome, preco), funcionarios(nome)")
    .eq("cliente_id", cliente.id)
    .eq("status", "concluido")
    .order("data_hora_inicio", { ascending: false })) as unknown as { data: AgendamentoRealizado[] | null };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Serviços realizados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!realizados || realizados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum serviço concluído ainda.</p>
        ) : (
          realizados.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b pb-2 last:border-0">
              <div>
                <p className="text-sm font-medium">{r.servicos?.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.data_hora_inicio).toLocaleDateString("pt-BR")} · {r.funcionarios?.nome}
                </p>
              </div>
              <p className="text-sm font-medium">R$ {Number(r.servicos?.preco ?? 0).toFixed(2)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
