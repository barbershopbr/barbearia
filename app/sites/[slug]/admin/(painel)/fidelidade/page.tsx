import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FidelidadeConfig } from "@/lib/supabase/types";
import { ConfigFidelidadeForm } from "./config-form";
import { AjustePontosDialog } from "./ajuste-pontos";
import { temRecurso } from "@/lib/plano/recursos";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";

type PontoLinha = { cliente_id: string; pontos: number; tipo: "credito" | "debito" };

export default async function FidelidadePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "fidelidade")) return <RecursoBloqueado recurso="fidelidade" />;

  const supabase = await createSupabaseServerClient();
  const [{ data: config }, { data: clientes }, { data: pontos }] = await Promise.all([
    supabase.from("fidelidade_config").select("*").eq("empresa_id", empresa.id).maybeSingle() as unknown as Promise<{
      data: FidelidadeConfig | null;
    }>,
    supabase.from("clientes").select("id, nome").eq("empresa_id", empresa.id).order("nome"),
    supabase.from("fidelidade_pontos").select("cliente_id, pontos, tipo").eq("empresa_id", empresa.id) as unknown as Promise<{
      data: PontoLinha[] | null;
    }>,
  ]);

  const saldoPorCliente = new Map<string, number>();
  for (const p of pontos ?? []) {
    const delta = p.tipo === "credito" ? p.pontos : -p.pontos;
    saldoPorCliente.set(p.cliente_id, (saldoPorCliente.get(p.cliente_id) ?? 0) + delta);
  }

  const reaisPorPonto = Number(config?.reais_por_ponto ?? 0);

  const linhas = (clientes ?? [])
    .map((c) => ({ ...c, saldo: saldoPorCliente.get(c.id) ?? 0 }))
    .sort((a, b) => b.saldo - a.saldo);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Fidelidade</h1>
          <p className="text-sm text-muted-foreground">
            Pontos que o cliente acumula por atendimento e por compra de produtos.
          </p>
        </div>
        <AjustePontosDialog slug={slug} clientes={clientes ?? []} />
      </div>

      <ConfigFidelidadeForm slug={slug} config={config} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Saldo dos clientes</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Pontos</TableHead>
              {reaisPorPonto > 0 && <TableHead>Equivale a</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.nome}</TableCell>
                <TableCell className="tabular-nums">{c.saldo}</TableCell>
                {reaisPorPonto > 0 && (
                  <TableCell className="tabular-nums">R$ {(c.saldo * reaisPorPonto).toFixed(2)}</TableCell>
                )}
              </TableRow>
            ))}
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={reaisPorPonto > 0 ? 3 : 2} className="text-center text-sm text-muted-foreground">
                  Nenhum cliente cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
