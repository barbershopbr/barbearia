import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RegraEditor, TaxasForm } from "./regra-row";
import { marcarComissaoPaga } from "./actions";
import { temRecurso } from "@/lib/plano/recursos";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";

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
  if (!temRecurso(empresa, "comissoes")) return <RecursoBloqueado recurso="comissoes" />;

  const supabase = await createSupabaseServerClient();

  const [{ data: funcionarios }, { data: regras }, { data: comissoes }, { data: servicos }, { data: excecoes }] = await Promise.all([
    supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("regras_comissao").select("*").eq("empresa_id", empresa.id),
    supabase
      .from("comissoes")
      .select("id, valor, percentual, status, created_at, funcionarios(nome)")
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: ComissaoLinha[] | null }>,
    supabase.from("servicos").select("id, nome, preco").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("regras_comissao_servico").select("funcionario_id, servico_id, tipo, valor").eq("empresa_id", empresa.id),
  ]);

  const regrasPorFuncionario = new Map((regras ?? []).map((r) => [r.funcionario_id, r]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Comissões</h1>
        <p className="text-sm text-muted-foreground">
          A comissão por atendimento é lançada sozinha ao concluir o atendimento na Agenda ou cobrar no Caixa — percentual
          (com ou sem um fixo a mais), valor fixo, ou uma regra diferente por serviço. Produtos vendidos no caixa geram a %
          de produto de quem vendeu. Diária e salário você lança quando quiser.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Regras por profissional</h2>
        <div className="grid gap-3">
          {(funcionarios ?? []).map((f) => {
            const regra = regrasPorFuncionario.get(f.id);
            return (
              <RegraEditor
                key={f.id}
                slug={slug}
                funcionarioId={f.id}
                nome={f.nome}
                servicos={(servicos ?? []).map((sv) => ({ ...sv, preco: Number(sv.preco) }))}
                excecoesIniciais={(excecoes ?? [])
                  .filter((e) => e.funcionario_id === f.id)
                  .map((e) => ({ servicoId: e.servico_id, tipo: e.tipo, valor: Number(e.valor) }))}
                regraInicial={
                  regra
                    ? {
                        tipo: regra.tipo,
                        valor: Number(regra.valor),
                        fixoAdicional: Number(regra.fixo_adicional),
                        percentualProduto: Number(regra.percentual_produto),
                        descontarTaxa: regra.descontar_taxa,
                      }
                    : null
                }
              />
            );
          })}
          {(!funcionarios || funcionarios.length === 0) && <p className="text-sm text-muted-foreground">Cadastre funcionários primeiro.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Taxas da maquininha</h2>
        <p className="text-sm text-muted-foreground">
          Usadas quando a regra do profissional está com &quot;descontar taxa&quot;: a comissão é calculada sobre o valor menos a taxa da forma de pagamento.
        </p>
        <TaxasForm slug={slug} taxas={(empresa.taxas_pagamento ?? {}) as Record<string, number>} />
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
