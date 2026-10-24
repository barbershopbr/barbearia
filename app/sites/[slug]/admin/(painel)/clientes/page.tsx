import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ClientesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Clientes se cadastram diretamente pelo site público (Área do Cliente).
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Cliente desde</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(clientes ?? []).map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.nome}</TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.telefone || "—"}</TableCell>
              <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
            </TableRow>
          ))}
          {(!clientes || clientes.length === 0) && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                Nenhum cliente cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
