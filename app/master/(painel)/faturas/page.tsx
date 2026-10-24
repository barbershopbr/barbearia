import Link from "next/link";
import { requireMaster } from "@/lib/auth/current-master";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { masterBasePath } from "@/lib/tenant/master-base-path";
import { hojeNoBrasil } from "@/lib/tenant/timezone";
import { DIAS_TOLERANCIA_ATRASO } from "@/lib/plataforma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { cancelarFatura, marcarFaturaPaga } from "./actions";
import { RotinaBotao } from "./rotina-botao";

const ABAS = [
  { id: "abertas", label: "Em aberto" },
  { id: "vencidas", label: "Vencidas" },
  { id: "pagas", label: "Pagas" },
] as const;

const brl = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
const dataBR = (d: string) => d.slice(0, 10).split("-").reverse().join("/");

export default async function MasterFaturasPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  await requireMaster();
  const { aba: abaParam } = await searchParams;
  const aba = ABAS.some((a) => a.id === abaParam) ? abaParam : "abertas";
  const base = await masterBasePath();
  const hoje = hojeNoBrasil();

  const admin = createSupabaseServiceRoleClient();
  let query = admin
    .from("faturas_saas")
    .select("id, competencia, plano, valor, vencimento, status, pago_em, metodo, empresa_id, empresas(nome, slug, status)")
    .order("vencimento", { ascending: aba !== "pagas" })
    .limit(200);
  query = aba === "pagas" ? query.eq("status", "paga") : query.eq("status", "aberta");
  if (aba === "vencidas") query = query.lt("vencimento", hoje);
  const { data: faturas } = (await query) as unknown as {
    data: {
      id: string;
      competencia: string;
      plano: string;
      valor: number;
      vencimento: string;
      status: string;
      pago_em: string | null;
      metodo: string | null;
      empresa_id: string;
      empresas: { nome: string; slug: string; status: string } | null;
    }[] | null;
  };

  const lista = faturas ?? [];
  const total = lista.reduce((s, f) => s + Number(f.valor), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Faturas das barbearias</h1>
          <p className="text-sm text-muted-foreground">
            Geradas todo dia às 6h (rotina automática). Atraso de mais de {DIAS_TOLERANCIA_ATRASO} dias bloqueia a barbearia; pagar desbloqueia.
          </p>
        </div>
        <RotinaBotao />
      </div>

      <div className="flex gap-1 border-b">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={`?aba=${a.id}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm",
              aba === a.id ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {a.label}
          </Link>
        ))}
        <span className="ml-auto self-center text-sm text-muted-foreground">
          {lista.length} fatura(s) · {brl(total)}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Barbearia</TableHead>
            <TableHead>Mês</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((f) => {
            const vencida = f.status === "aberta" && f.vencimento < hoje;
            return (
              <TableRow key={f.id}>
                <TableCell>
                  <Link href={`${base}/empresas/${f.empresa_id}`} className="font-medium hover:underline">
                    {f.empresas?.nome}
                  </Link>
                  {f.empresas?.status === "bloqueado" && <Badge variant="destructive" className="ml-2">bloqueada</Badge>}
                </TableCell>
                <TableCell className="capitalize">
                  {new Date(`${f.competencia}T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" })} · {f.plano}
                </TableCell>
                <TableCell>{brl(f.valor)}</TableCell>
                <TableCell className={vencida ? "font-medium text-destructive" : ""}>{dataBR(f.vencimento)}</TableCell>
                <TableCell>
                  {f.status === "paga" ? (
                    <Badge>Paga {f.pago_em ? dataBR(f.pago_em) : ""}</Badge>
                  ) : vencida ? (
                    <Badge variant="destructive">Vencida</Badge>
                  ) : (
                    <Badge variant="secondary">Aberta</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {f.status === "aberta" && (
                    <div className="flex flex-wrap justify-end gap-2">
                      <form action={marcarFaturaPaga.bind(null, f.id)} className="flex gap-1">
                        <select name="metodo" defaultValue="pix" className="h-7 rounded border border-input bg-transparent px-1 text-xs" aria-label="Forma">
                          <option value="pix">Pix</option>
                          <option value="transferencia">Transferência</option>
                          <option value="dinheiro">Dinheiro</option>
                        </select>
                        <Button type="submit" size="sm">
                          Recebida
                        </Button>
                      </form>
                      <form action={cancelarFatura.bind(null, f.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          Cancelar
                        </Button>
                      </form>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {lista.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Nenhuma fatura aqui.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
