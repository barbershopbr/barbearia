import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FuncionarioDialog } from "./funcionario-form";
import { toggleFuncionarioAtivo, deleteFuncionario } from "./actions";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { PAPEL_LABEL } from "@/lib/auth/papeis";
import { AcessoAcoes, NovoAcessoDialog } from "./acesso-ui";

export default async function FuncionariosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();
  const [{ data: funcionarios }, { data: acessos }, staff] = await Promise.all([
    supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).order("nome"),
    supabase.from("usuarios_empresa").select("*").eq("empresa_id", empresa.id).order("nome"),
    getCurrentStaff(empresa.id),
  ]);
  const gestor = staff?.role === "owner" || staff?.role === "admin";
  const funcionarioDoAcesso = new Map((funcionarios ?? []).filter((f) => f.usuario_empresa_id).map((f) => [f.usuario_empresa_id, f.nome]));

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

      <div className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Acessos ao painel</h2>
            <p className="text-sm text-muted-foreground">Quem da equipe entra no painel e o que cada um pode ver.</p>
          </div>
          {gestor && (
            <NovoAcessoDialog
              slug={slug}
              funcionarios={(funcionarios ?? []).filter((f) => !f.usuario_empresa_id).map((f) => ({ id: f.id, nome: f.nome }))}
            />
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(acessos ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  {a.nome}
                  {funcionarioDoAcesso.has(a.id) && (
                    <span className="block text-xs text-muted-foreground">Perfil: {funcionarioDoAcesso.get(a.id)}</span>
                  )}
                </TableCell>
                <TableCell>{a.email}</TableCell>
                <TableCell>{PAPEL_LABEL[a.role]}</TableCell>
                <TableCell>
                  <Badge variant={a.ativo ? "default" : "secondary"}>{a.ativo ? "Ativo" : "Bloqueado"}</Badge>
                </TableCell>
                <TableCell>
                  {gestor && a.role !== "owner" && a.id !== staff?.id ? (
                    <AcessoAcoes slug={slug} usuarioEmpresaId={a.id} papel={a.role} ativo={a.ativo} />
                  ) : (
                    <span className="block text-right text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
