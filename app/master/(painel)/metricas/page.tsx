import Link from "next/link";
import { requireMaster } from "@/lib/auth/current-master";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { masterBasePath } from "@/lib/tenant/master-base-path";
import { hojeNoBrasil, mesNoBrasil } from "@/lib/tenant/timezone";
import { PLANOS_SAAS } from "@/lib/plano/recursos";
import type { PlanoSaas } from "@/lib/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function MasterMetricasPage() {
  await requireMaster();
  const base = await masterBasePath();
  const hoje = hojeNoBrasil();
  const mes = mesNoBrasil(hoje);
  const ha30dias = new Date(Date.parse(`${hoje}T03:00:00Z`) - 30 * 86_400_000).toISOString();

  const admin = createSupabaseServiceRoleClient();
  const [{ data: empresas }, { data: pagasMes }, { data: vencidas }, { data: agendamentos30 }] = await Promise.all([
    admin.from("empresas").select("id, nome, status, plano_saas, created_at, saas_isento_ate"),
    admin.from("faturas_saas").select("valor").eq("status", "paga").gte("pago_em", mes.inicio.toISOString()).lte("pago_em", mes.fim.toISOString()),
    admin.from("faturas_saas").select("valor, empresa_id").eq("status", "aberta").lt("vencimento", hoje),
    admin.from("agendamentos").select("empresa_id").gte("data_hora_inicio", ha30dias).neq("status", "cancelado"),
  ]);

  const todas = empresas ?? [];
  const ativas = todas.filter((e) => e.status === "ativo");
  const emCortesia = ativas.filter((e) => e.saas_isento_ate && e.saas_isento_ate >= hoje);
  const pagantes = ativas.filter((e) => !emCortesia.includes(e));
  const mrr = pagantes.reduce((s, e) => s + PLANOS_SAAS[e.plano_saas].preco, 0);
  const mrrPotencial = ativas.reduce((s, e) => s + PLANOS_SAAS[e.plano_saas].preco, 0);
  const novasMes = todas.filter((e) => e.created_at >= mes.inicio.toISOString()).length;
  const bloqueadas = todas.filter((e) => e.status === "bloqueado").length;
  const canceladas = todas.filter((e) => e.status === "inativo" || e.status === "excluida").length;
  const recebidoMes = (pagasMes ?? []).reduce((s, f) => s + Number(f.valor), 0);
  const inadimplente = (vencidas ?? []).reduce((s, f) => s + Number(f.valor), 0);

  const porPlano = (Object.keys(PLANOS_SAAS) as PlanoSaas[]).map((p) => ({ plano: PLANOS_SAAS[p].nome, qtd: ativas.filter((e) => e.plano_saas === p).length }));

  const usoPor = new Map<string, number>();
  for (const a of agendamentos30 ?? []) usoPor.set(a.empresa_id, (usoPor.get(a.empresa_id) ?? 0) + 1);
  const uso = todas
    .filter((e) => e.status !== "excluida")
    .map((e) => ({ id: e.id, nome: e.nome, plano: PLANOS_SAAS[e.plano_saas].nome, atendimentos: usoPor.get(e.id) ?? 0 }))
    .sort((a, b) => b.atendimentos - a.atendimentos);

  const cards = [
    { l: "MRR (pagantes)", v: brl(mrr), sub: `${brl(mrrPotencial)} com as em cortesia` },
    { l: "Barbearias ativas", v: String(ativas.length), sub: `${pagantes.length} pagantes · ${emCortesia.length} em cortesia` },
    { l: "Novas no mês", v: String(novasMes) },
    { l: "Recebido no mês", v: brl(recebidoMes) },
    { l: "Em atraso", v: brl(inadimplente), sub: `${(vencidas ?? []).length} fatura(s) vencida(s)`, alerta: inadimplente > 0 },
    { l: "Bloqueadas / canceladas", v: `${bloqueadas} / ${canceladas}` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Métricas do BarberControl</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.l} className={c.alerta ? "border-2 border-destructive/50" : undefined}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">{c.l}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-semibold ${c.alerta ? "text-destructive" : ""}`}>{c.v}</p>
              {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ativas por plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {porPlano.map((p) => (
              <div key={p.plano} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{p.plano}</span>
                  <span className="font-medium">{p.qtd}</span>
                </div>
                <div className="h-2 rounded bg-muted">
                  <div className="h-2 rounded bg-foreground/70" style={{ width: `${ativas.length ? (p.qtd / ativas.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso nos últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barbearia</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Atendimentos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uso.slice(0, 15).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link href={`${base}/empresas/${u.id}`} className="hover:underline">
                        {u.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{u.plano}</TableCell>
                    <TableCell className="text-right">{u.atendimentos}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">Barbearias com 0 atendimento podem precisar de ajuda para começar.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
