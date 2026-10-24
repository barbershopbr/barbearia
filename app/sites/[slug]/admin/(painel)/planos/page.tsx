import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovoPlanoDialog } from "./plano-form";
import { togglePlanoAtivo, deletePlano } from "./actions";
import { temRecurso } from "@/lib/plano/recursos";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";

export default async function PlanosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "assinaturas")) return <RecursoBloqueado recurso="assinaturas" />;

  const supabase = await createSupabaseServerClient();
  const { data: planos } = await supabase
    .from("planos")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("valor");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Planos</h1>
        <NovoPlanoDialog slug={slug} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Cortes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(planos ?? []).map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.nome}</TableCell>
              <TableCell>R$ {Number(p.valor).toFixed(2)}</TableCell>
              <TableCell>{p.periodo}</TableCell>
              <TableCell>{p.quantidade_cortes ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <form action={togglePlanoAtivo.bind(null, p.id, p.ativo)}>
                  <Button type="submit" size="sm" variant="outline">
                    {p.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </form>
                <form action={deletePlano.bind(null, p.id)}>
                  <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {(!planos || planos.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Nenhum plano cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
