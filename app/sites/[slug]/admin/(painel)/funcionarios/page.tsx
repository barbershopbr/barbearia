import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FuncionarioDialog } from "./funcionario-form";
import { toggleFuncionarioAtivo, deleteFuncionario } from "./actions";

export default async function FuncionariosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();
  const { data: funcionarios } = await supabase
    .from("funcionarios")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("nome");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Funcionários</h1>
        <FuncionarioDialog slug={slug} empresaId={empresa.id} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Especialidades</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(funcionarios ?? []).map((f) => (
            <TableRow key={f.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.foto_url || "/avatar-placeholder.svg"} alt="" className="size-8 rounded-full object-cover" />
                  {f.nome}
                </div>
              </TableCell>
              <TableCell>{f.especialidades?.join(", ") || "—"}</TableCell>
              <TableCell>
                <Badge variant={f.ativo ? "default" : "secondary"}>{f.ativo ? "Ativo" : "Inativo"}</Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <FuncionarioDialog slug={slug} empresaId={empresa.id} funcionario={f} />
                <form action={toggleFuncionarioAtivo.bind(null, f.id, f.ativo)}>
                  <Button type="submit" size="sm" variant="outline">
                    {f.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </form>
                <form action={deleteFuncionario.bind(null, f.id)}>
                  <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {(!funcionarios || funcionarios.length === 0) && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                Nenhum funcionário cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
