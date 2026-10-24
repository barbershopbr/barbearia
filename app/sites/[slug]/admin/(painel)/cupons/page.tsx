import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovoCupomDialog } from "./cupom-form";
import { toggleCupomAtivo, deleteCupom } from "./actions";
import { temRecurso } from "@/lib/plano/recursos";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";

export default async function CuponsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "cupons")) return <RecursoBloqueado recurso="cupons" />;

  const supabase = await createSupabaseServerClient();
  const [{ data: cupons }, { data: usos }] = await Promise.all([
    supabase.from("cupons").select("*").eq("empresa_id", empresa.id).order("created_at", { ascending: false }),
    supabase.from("cupom_usos").select("cupom_id").eq("empresa_id", empresa.id),
  ]);

  const usosPorCupom = new Map<string, number>();
  for (const u of usos ?? []) {
    usosPorCupom.set(u.cupom_id, (usosPorCupom.get(u.cupom_id) ?? 0) + 1);
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cupons</h1>
          <p className="text-sm text-muted-foreground">
            Cupons de desconto que o cliente aplica no agendamento ou no carrinho de produtos.
          </p>
        </div>
        <NovoCupomDialog slug={slug} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Desconto</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Usos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(cupons ?? []).map((c) => {
            const usados = usosPorCupom.get(c.id) ?? 0;
            const expirado = c.validade != null && c.validade < hoje;
            const esgotado = c.usos_maximos != null && usados >= c.usos_maximos;
            return (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.codigo}</TableCell>
                <TableCell>
                  {c.tipo_desconto === "percentual"
                    ? `${Number(c.valor)}%`
                    : `R$ ${Number(c.valor).toFixed(2)}`}
                </TableCell>
                <TableCell>
                  {c.validade ? new Date(c.validade + "T12:00:00").toLocaleDateString("pt-BR") : "Sem prazo"}
                </TableCell>
                <TableCell>
                  {usados}
                  {c.usos_maximos != null ? ` / ${c.usos_maximos}` : ""}
                </TableCell>
                <TableCell>
                  {!c.ativo ? (
                    <Badge variant="secondary">Inativo</Badge>
                  ) : expirado ? (
                    <Badge variant="destructive">Expirado</Badge>
                  ) : esgotado ? (
                    <Badge variant="destructive">Esgotado</Badge>
                  ) : (
                    <Badge variant="default">Ativo</Badge>
                  )}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <form action={toggleCupomAtivo.bind(null, c.id, c.ativo)}>
                    <Button type="submit" size="sm" variant="outline">
                      {c.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </form>
                  <form action={deleteCupom.bind(null, c.id)}>
                    <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                  </form>
                </TableCell>
              </TableRow>
            );
          })}
          {(!cupons || cupons.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Nenhum cupom cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
