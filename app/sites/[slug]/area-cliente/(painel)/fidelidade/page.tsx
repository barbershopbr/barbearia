import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FidelidadeConfig } from "@/lib/supabase/types";
import { calcularSaldo } from "@/lib/fidelidade/creditar";

type Lancamento = {
  id: string;
  pontos: number;
  tipo: "credito" | "debito";
  motivo: string | null;
  created_at: string;
};

export default async function AreaClienteFidelidade({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;

  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) return null;

  const supabase = await createSupabaseServerClient();
  const [{ data: config }, { data: lancamentos }] = await Promise.all([
    supabase.from("fidelidade_config").select("*").eq("empresa_id", empresa.id).maybeSingle() as unknown as Promise<{
      data: FidelidadeConfig | null;
    }>,
    supabase
      .from("fidelidade_pontos")
      .select("id, pontos, tipo, motivo, created_at")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: Lancamento[] | null }>,
  ]);

  if (!config?.ativo) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta barbearia ainda não tem um programa de fidelidade ativo.
      </p>
    );
  }

  const saldo = calcularSaldo(lancamentos ?? []);
  const reaisPorPonto = Number(config.reais_por_ponto ?? 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meus pontos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-semibold tabular-nums">{saldo}</p>
          {reaisPorPonto > 0 && (
            <p className="text-sm text-muted-foreground">
              Equivale a R$ {(saldo * reaisPorPonto).toFixed(2)} em desconto.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!lancamentos || lancamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não tem lançamentos de pontos.</p>
          ) : (
            lancamentos.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{l.motivo ?? (l.tipo === "credito" ? "Crédito" : "Débito")}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant={l.tipo === "credito" ? "default" : "secondary"}>
                  {l.tipo === "credito" ? "+" : "−"}
                  {l.pontos}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
