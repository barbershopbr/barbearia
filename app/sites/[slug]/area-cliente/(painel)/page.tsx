import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { ANTECEDENCIA_MINIMA_HORAS, clientePodeAlterar } from "@/lib/agenda/regras-cliente";
import { CancelarAgendamentoButton } from "./cancelar-button";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

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
      .limit(30) as unknown as Promise<{ data: AgendamentoComRelacoes[] | null }>,
    supabase
      .from("assinaturas_clientes")
      .select("id, status, planos(nome, valor)")
      .eq("cliente_id", cliente.id)
      .order("data_inicio", { ascending: false }) as unknown as Promise<{ data: AssinaturaComRelacoes[] | null }>,
  ]);

  const agora = new Date().toISOString();
  const lista = agendamentos ?? [];
  const proximos = lista
    .filter((a) => a.data_hora_inicio >= agora && (a.status === "agendado" || a.status === "confirmado"))
    .reverse();
  const anteriores = lista.filter((a) => !proximos.includes(a)).slice(0, 10);
  const base = await tenantBasePath(slug);

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Próximos horários</CardTitle>
          <Button size="sm" render={<Link href={`${base}/agendar`}>Agendar</Link>} />
        </CardHeader>
        <CardContent className="space-y-3">
          {proximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum horário marcado.</p>
          ) : (
            proximos.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.servicos?.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {quando(a.data_hora_inicio)} · {a.funcionarios?.nome}
                  </p>
                </div>
                {clientePodeAlterar(a) ? (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" render={<Link href={`${base}/agendar?remarcar=${a.id}`}>Remarcar</Link>} />
                    <CancelarAgendamentoButton slug={slug} agendamentoId={a.id} />
                  </div>
                ) : (
                  <Badge variant="outline">{a.status}</Badge>
                )}
              </div>
            ))
          )}
          {proximos.length > 0 && (
            <p className="text-xs text-muted-foreground">Remarcar ou cancelar pelo site até {ANTECEDENCIA_MINIMA_HORAS}h antes do horário.</p>
          )}
        </CardContent>
      </Card>

      {anteriores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anteriores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {anteriores.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.servicos?.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {quando(a.data_hora_inicio)} · {a.funcionarios?.nome}
                  </p>
                </div>
                <Badge variant="outline">{a.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
