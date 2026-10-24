import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovoAgendamentoDialog } from "./agendamento-form";
import { StatusSelect } from "./status-select";
import type { AgendamentoStatus } from "@/lib/supabase/types";

type AgendamentoLinha = {
  id: string;
  data_hora_inicio: string;
  status: AgendamentoStatus;
  clientes: { nome: string } | null;
  servicos: { nome: string } | null;
  funcionarios: { nome: string } | null;
};

export default async function AgendaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();

  const [{ data: agendamentos }, { data: clientes }, { data: servicos }, { data: funcionarios }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("id, data_hora_inicio, status, clientes(nome), servicos(nome), funcionarios(nome)")
      .eq("empresa_id", empresa.id)
      .order("data_hora_inicio", { ascending: false }) as unknown as Promise<{ data: AgendamentoLinha[] | null }>,
    supabase.from("clientes").select("*").eq("empresa_id", empresa.id).order("nome"),
    supabase.from("servicos").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Agenda</h1>
        <NovoAgendamentoDialog
          slug={slug}
          clientes={clientes ?? []}
          servicos={servicos ?? []}
          funcionarios={funcionarios ?? []}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/hora</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Serviço</TableHead>
            <TableHead>Profissional</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(agendamentos ?? []).map((a) => (
            <TableRow key={a.id}>
              <TableCell>{new Date(a.data_hora_inicio).toLocaleString("pt-BR")}</TableCell>
              <TableCell>{a.clientes?.nome}</TableCell>
              <TableCell>{a.servicos?.nome}</TableCell>
              <TableCell>{a.funcionarios?.nome}</TableCell>
              <TableCell className="text-right">
                <StatusSelect agendamentoId={a.id} status={a.status} />
              </TableCell>
            </TableRow>
          ))}
          {(!agendamentos || agendamentos.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Nenhum agendamento ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
