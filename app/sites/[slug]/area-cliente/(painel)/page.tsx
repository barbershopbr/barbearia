import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AgendamentoComRelacoes = {
  id: string;
  data_hora_inicio: string;
  status: string;
  servicos: { nome: string } | null;
  funcionarios: { nome: string } | null;
};

type AssinaturaComRelacoes = {
  id: string;
  status: string;
  planos: { nome: string; valor: number } | null;
};

export default async function AreaClienteDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) return null; // layout já redireciona

  const supabase = await createSupabaseServerClient();
  const [{ data: agendamentos }, { data: assinaturas }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("id, data_hora_inicio, status, servicos(nome), funcionarios(nome)")
      .eq("cliente_id", cliente.id)
      .order("data_hora_inicio", { ascending: false })
      .limit(10) as unknown as Promise<{ data: AgendamentoComRelacoes[] | null }>,
    supabase
      .from("assinaturas_clientes")
      .select("id, status, planos(nome, valor)")
      .eq("cliente_id", cliente.id)
      .order("data_inicio", { ascending: false }) as unknown as Promise<{ data: AssinaturaComRelacoes[] | null }>,
  ]);

  return (
    <div className="space-y-6">
      {assinaturas && assinaturas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meu plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assinaturas.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.planos?.nome}</p>
                  <p className="text-xs text-muted-foreground">R$ {Number(a.planos?.valor ?? 0).toFixed(2)}</p>
                </div>
                <Badge variant={a.status === "ativa" ? "default" : "secondary"}>{a.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meus agendamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!agendamentos || agendamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não tem agendamentos.</p>
          ) : (
            agendamentos.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.servicos?.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.data_hora_inicio).toLocaleString("pt-BR")} · {a.funcionarios?.nome}
                  </p>
                </div>
                <Badge variant="outline">{a.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
