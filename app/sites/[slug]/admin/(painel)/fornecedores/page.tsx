import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovoFornecedorDialog } from "./fornecedor-form";
import { deleteFornecedor } from "./actions";

export default async function FornecedoresPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();
  const { data: fornecedores } = await supabase
    .from("fornecedores")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("nome");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre fornecedores para vincular às entradas de estoque de produtos.
          </p>
        </div>
        <NovoFornecedorDialog slug={slug} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(fornecedores ?? []).map((f) => (
            <TableRow key={f.id}>
              <TableCell>{f.nome}</TableCell>
              <TableCell>{f.telefone ?? "—"}</TableCell>
              <TableCell>{f.email ?? "—"}</TableCell>
              <TableCell>{f.cnpj ?? "—"}</TableCell>
              <TableCell className="text-right">
                <form action={deleteFornecedor.bind(null, f.id)}>
                  <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {(!fornecedores || fornecedores.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Nenhum fornecedor cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
