import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AgendamentoLinha = {
  id: string;
  data_hora_inicio: string;
  status: string;
  clientes: { nome: string } | null;
  servicos: { nome: string; preco: number } | null;
};

type ComissaoLinha = {
  id: string;
  valor: number | null;
  tipo: string;
  status: "pendente" | "pago";
  created_at: string;
};

export default async function MeuHistoricoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const staff = await getCurrentStaff(empresa.id);
  if (!staff) return null;

  const supabase = await createSupabaseServerClient();
  const { data: funcionario } = await supabase
    .from("funcionarios")
    .select("id, nome")
    .eq("usuario_empresa_id", staff.id)
    .maybeSingle();

  if (!funcionario) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Meu Histórico</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta não está vinculada a um perfil de funcionário (equipe). Peça pro dono da barbearia vincular seu
          usuário ao cadastro em Funcionários.
        </p>
      </div>
    );
  }

  const [{ data: agendamentos }, { data: comissoes }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("id, data_hora_inicio, status, clientes(nome), servicos(nome, preco)")
      .eq("funcionario_id", funcionario.id)
      .order("data_hora_inicio", { ascending: false })
      .limit(50) as unknown as Promise<{ data: AgendamentoLinha[] | null }>,
    supabase
      .from("comissoes")
      .select("id, valor, tipo, status, created_at")
      .eq("funcionario_id", funcionario.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: ComissaoLinha[] | null }>,
  ]);

  const totalPendente = (comissoes ?? []).filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.valor ?? 0), 0);
  const totalPago = (comissoes ?? []).filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Meu Histórico</h1>
        <p className="text-sm text-muted-foreground">{funcionario.nome}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-normal text-muted-foreground">Comissão a receber</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">R$ {totalPendente.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-normal text-muted-foreground">Já recebido</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">R$ {totalPago.toFixed(2)}</p></CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Meus atendimentos</h2>
        <Card>
          <CardContent className="space-y-3 pt-6">
            {!agendamentos || agendamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum atendimento ainda.</p>
            ) : (
              agendamentos.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{a.servicos?.nome} · {a.clientes?.nome}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.data_hora_inicio).toLocaleString("pt-BR")}</p>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Minhas comissões</h2>
        <Card>
          <CardContent className="space-y-3 pt-6">
            {!comissoes || comissoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma comissão lançada ainda.</p>
            ) : (
              comissoes.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.tipo}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">R$ {Number(c.valor ?? 0).toFixed(2)}</span>
                    <Badge variant={c.status === "pago" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
