import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RegraRow } from "./regra-row";
import { marcarComissaoPaga } from "./actions";

type ComissaoLinha = {
  id: string;
  valor: number | null;
  percentual: number | null;
  status: "pendente" | "pago";
  created_at: string;
  funcionarios: { nome: string } | null;
};

export default async function ComissoesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const supabase = await createSupabaseServerClient();

  const [{ data: funcionarios }, { data: regras }, { data: comissoes }] = await Promise.all([
    supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("regras_comissao").select("*").eq("empresa_id", empresa.id),
    supabase
      .from("comissoes")
      .select("id, valor, percentual, status, created_at, funcionarios(nome)")
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: ComissaoLinha[] | null }>,
  ]);

  const regrasPorFuncionario = new Map((regras ?? []).map((r) => [r.funcionario_id, r]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Comissões</h1>
        <p className="text-sm text-muted-foreground">
          Defina a regra de cada funcionário — percentual ou valor fixo por atendimento são lançados automaticamente
          quando você marca um agendamento como &quot;concluído&quot; na Agenda; diária e salário mensal você lança
          manualmente quando quiser, com o botão &quot;Lançar agora&quot;.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Regras por funcionário</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(funcionarios ?? []).map((f) => {
              const regra = regrasPorFuncionario.get(f.id);
              return (
                <RegraRow
                  key={f.id}
                  slug={slug}
                  funcionarioId={f.id}
                  nome={f.nome}
                  regraInicial={regra ? { tipo: regra.tipo, valor: Number(regra.valor) } : null}
                />
              );
            })}
            {(!funcionarios || funcionarios.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Cadastre funcionários primeiro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Comissões lançadas</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(comissoes ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.funcionarios?.nome ?? "—"}</TableCell>
                <TableCell>R$ {Number(c.valor ?? 0).toFixed(2)}</TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "pago" ? "default" : "secondary"}>{c.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {c.status === "pendente" && (
                    <form action={marcarComissaoPaga.bind(null, c.id)}>
                      <Button type="submit" size="sm" variant="outline">Marcar como pago</Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!comissoes || comissoes.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhuma comissão lançada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
