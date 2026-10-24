import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProdutoDialog } from "./produto-form";
import { CategoriaQuickAdd } from "./categoria-quick-add";
import { EstoqueAdjust } from "./estoque-adjust";
import { EntradaEstoqueDialog } from "./entrada-estoque";
import { toggleProdutoAtivo, deleteProduto } from "./actions";
import { temRecurso } from "@/lib/plano/recursos";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";

export default async function ProdutosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "loja")) return <RecursoBloqueado recurso="loja" />;

  const supabase = await createSupabaseServerClient();
  const [{ data: produtos }, { data: categorias }, { data: fornecedores }] = await Promise.all([
    supabase.from("produtos").select("*, categorias(nome)").eq("empresa_id", empresa.id).order("nome") as unknown as Promise<{
      data: Array<{
        id: string; nome: string; descricao: string | null; categoria_id: string | null; foto_url: string | null; preco: number; custo: number; estoque_atual: number; estoque_minimo: number; ativo: boolean; categorias: { nome: string } | null;
      }> | null;
    }>,
    supabase.from("categorias").select("*").eq("empresa_id", empresa.id).order("nome"),
    supabase.from("fornecedores").select("id, nome").eq("empresa_id", empresa.id).order("nome"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produtos</h1>
        <div className="flex gap-2">
          <EntradaEstoqueDialog
            slug={slug}
            produtos={(produtos ?? []).map((p) => ({ id: p.id, nome: p.nome }))}
            fornecedores={fornecedores ?? []}
          />
          <ProdutoDialog slug={slug} empresaId={empresa.id} categorias={categorias ?? []} />
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-md border p-3">
        <span className="text-sm font-medium">Categorias:</span>
        <div className="flex flex-wrap gap-1">
          {(categorias ?? []).map((c) => (
            <Badge key={c.id} variant="secondary">{c.nome}</Badge>
          ))}
          {(!categorias || categorias.length === 0) && (
            <span className="text-sm text-muted-foreground">Nenhuma ainda.</span>
          )}
        </div>
        <div className="ml-auto">
          <CategoriaQuickAdd slug={slug} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Custo</TableHead>
            <TableHead>Estoque</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(produtos ?? []).map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {p.foto_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto_url} alt="" className="size-8 rounded object-cover" />
                  )}
                  {p.nome}
                </div>
              </TableCell>
              <TableCell>{p.categorias?.nome ?? "—"}</TableCell>
              <TableCell>R$ {Number(p.preco).toFixed(2)}</TableCell>
              <TableCell>R$ {Number(p.custo).toFixed(2)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <EstoqueAdjust produtoId={p.id} empresaId={empresa.id} estoqueAtual={p.estoque_atual} />
                  {p.estoque_atual <= p.estoque_minimo && (
                    <Badge variant="destructive">Estoque baixo</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <ProdutoDialog slug={slug} empresaId={empresa.id} categorias={categorias ?? []} produto={p} />
                <form action={toggleProdutoAtivo.bind(null, p.id, p.ativo)}>
                  <Button type="submit" size="sm" variant="outline">
                    {p.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </form>
                <form action={deleteProduto.bind(null, p.id)}>
                  <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {(!produtos || produtos.length === 0) && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                Nenhum produto cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
