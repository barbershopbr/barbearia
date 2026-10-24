import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServicoDialog } from "./servico-form";
import { toggleServicoAtivo, deleteServico } from "./actions";

export default async function ServicosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();
  const { data: servicos } = await supabase
    .from("servicos")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("nome");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Serviços</h1>
        <ServicoDialog slug={slug} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Duração</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(servicos ?? []).map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.nome}</TableCell>
              <TableCell>R$ {Number(s.preco).toFixed(2)}</TableCell>
              <TableCell>{s.duracao_minutos} min</TableCell>
              <TableCell>
                <Badge variant={s.ativo ? "default" : "secondary"}>{s.ativo ? "Ativo" : "Inativo"}</Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <ServicoDialog slug={slug} servico={s} />
                <form action={toggleServicoAtivo.bind(null, s.id, s.ativo)}>
                  <Button type="submit" size="sm" variant="outline">
                    {s.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </form>
                <form action={deleteServico.bind(null, s.id)}>
                  <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {(!servicos || servicos.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Nenhum serviço cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
