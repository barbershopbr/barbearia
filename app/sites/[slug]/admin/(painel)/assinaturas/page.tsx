import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssinaturaStatusSelect } from "./status-select";
import type { AssinaturaStatus } from "@/lib/supabase/types";

type AssinaturaLinha = {
  id: string;
  status: AssinaturaStatus;
  data_inicio: string;
  clientes: { nome: string } | null;
  planos: { nome: string; valor: number } | null;
};

export default async function AssinaturasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();
  const { data: assinaturas } = (await supabase
    .from("assinaturas_clientes")
    .select("id, status, data_inicio, clientes(nome), planos(nome, valor)")
    .eq("empresa_id", empresa.id)
    .order("data_inicio", { ascending: false })) as unknown as { data: AssinaturaLinha[] | null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Assinaturas</h1>
        <p className="text-sm text-muted-foreground">
          Solicitações de plano feitas pelos clientes. Ative depois de confirmar o pagamento.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Solicitado em</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(assinaturas ?? []).map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.clientes?.nome}</TableCell>
              <TableCell>{a.planos?.nome}</TableCell>
              <TableCell>R$ {Number(a.planos?.valor ?? 0).toFixed(2)}</TableCell>
              <TableCell>{new Date(a.data_inicio).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell className="text-right">
                <AssinaturaStatusSelect assinaturaId={a.id} status={a.status} />
              </TableCell>
            </TableRow>
          ))}
          {(!assinaturas || assinaturas.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Nenhuma solicitação de plano ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
