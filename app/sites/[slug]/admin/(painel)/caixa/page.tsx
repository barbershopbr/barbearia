import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { nivelSecao } from "@/lib/auth/papeis";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { temRecurso } from "@/lib/plano/recursos";
import { RecursoBloqueado } from "@/components/recurso-bloqueado";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pdv, type AtendimentoHoje } from "./pdv";
import { brazilDayRangeUtc, hojeNoBrasil } from "@/lib/tenant/timezone";
import { AbrirCaixaForm, FecharCaixaDialog, MovimentoDialog } from "./caixa-forms";

const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const METODO = { dinheiro: "Dinheiro", pix: "Pix", cartao: "Cartão" } as Record<string, string>;

export default async function CaixaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  if (!temRecurso(empresa, "caixa")) return <RecursoBloqueado recurso="caixa" />;
  const staff = await getCurrentStaff(empresa.id);
  const podeEditar = !!staff && nivelSecao(staff, "caixa") === "editar";

  const supabase = await createSupabaseServerClient();
  const { data: caixa } = await supabase.from("caixas").select("*").eq("empresa_id", empresa.id).is("fechado_em", null).maybeSingle();

  if (!caixa) {
    const { data: anteriores } = await supabase
      .from("caixas")
      .select("id, aberto_em, fechado_em, valor_inicial, valor_contado")
      .eq("empresa_id", empresa.id)
      .not("fechado_em", "is", null)
      .order("aberto_em", { ascending: false })
      .limit(10);
    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Caixa</h1>
          <p className="text-sm text-muted-foreground">Abra o caixa para começar a vender no balcão.</p>
        </div>
        {podeEditar && (
          <Card>
            <CardContent className="pt-6">
              <AbrirCaixaForm slug={slug} />
            </CardContent>
          </Card>
        )}
        {(anteriores ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Caixas anteriores</CardTitle>
            </CardHeader>
            <CardContent className="divide-y text-sm">
              {(anteriores ?? []).map((c) => (
                <div key={c.id} className="flex justify-between py-2">
                  <span>
                    {hora(c.aberto_em)} → {c.fechado_em ? hora(c.fechado_em) : "—"}
                  </span>
                  <span className="text-muted-foreground">contado {brl(Number(c.valor_contado ?? 0))}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const [{ data: vendas }, { data: movimentos }, { data: servicos }, { data: produtos }, { data: funcionarios }, { data: clientes }] = await Promise.all([
    supabase
      .from("pagamentos")
      .select("id, valor, metodo, pago_em, clientes(nome), pagamento_itens(descricao, quantidade)")
      .eq("caixa_id", caixa.id)
      .eq("status", "pago")
      .order("pago_em", { ascending: false }) as unknown as Promise<{
      data: { id: string; valor: number; metodo: string; pago_em: string; clientes: { nome: string } | null; pagamento_itens: { descricao: string | null; quantidade: number }[] }[] | null;
    }>,
    supabase.from("caixa_movimentos").select("*").eq("caixa_id", caixa.id).order("created_at", { ascending: false }),
    supabase.from("servicos").select("id, nome, preco").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("produtos").select("id, nome, preco, estoque_atual").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("funcionarios").select("id, nome").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("clientes").select("id, nome").eq("empresa_id", empresa.id).order("nome").limit(500),
  ]);

  // Atendimentos de hoje ainda não cobrados no caixa.
  const dia = brazilDayRangeUtc(hojeNoBrasil());
  const { data: deHoje } = (await supabase
    .from("agendamentos")
    .select("id, data_hora_inicio, servico_id, funcionario_id, cliente_id, clientes(nome), servicos(nome, preco), funcionarios(nome)")
    .eq("empresa_id", empresa.id)
    .in("status", ["agendado", "confirmado", "concluido"])
    .is("assinatura_id", null)
    .gte("data_hora_inicio", dia.inicio.toISOString())
    .lte("data_hora_inicio", dia.fim.toISOString())
    .order("data_hora_inicio")) as unknown as {
    data: {
      id: string;
      data_hora_inicio: string;
      servico_id: string;
      funcionario_id: string;
      cliente_id: string;
      clientes: { nome: string } | null;
      servicos: { nome: string; preco: number } | null;
      funcionarios: { nome: string } | null;
    }[] | null;
  };
  const idsHoje = (deHoje ?? []).map((a) => a.id);
  const { data: jaCobrados } = idsHoje.length
    ? await supabase.from("pagamento_itens").select("agendamento_id").in("agendamento_id", idsHoje)
    : { data: [] as { agendamento_id: string | null }[] };
  const cobrados = new Set((jaCobrados ?? []).map((c) => c.agendamento_id));
  const atendimentos: AtendimentoHoje[] = (deHoje ?? [])
    .filter((a) => !cobrados.has(a.id))
    .map((a) => ({
      id: a.id,
      rotulo: `${new Date(a.data_hora_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })} · ${a.clientes?.nome ?? "Cliente"} · ${a.servicos?.nome ?? ""} · ${a.funcionarios?.nome ?? ""}`,
      servicoId: a.servico_id,
      servicoNome: a.servicos?.nome ?? "Serviço",
      preco: Number(a.servicos?.preco ?? 0),
      funcionarioId: a.funcionario_id,
      clienteId: a.cliente_id,
    }));

  const porMetodo: Record<string, number> = { dinheiro: 0, pix: 0, cartao: 0 };
  for (const v of vendas ?? []) porMetodo[v.metodo] = (porMetodo[v.metodo] ?? 0) + Number(v.valor);
  const suprimentos = (movimentos ?? []).filter((m) => m.tipo === "suprimento").reduce((s, m) => s + Number(m.valor), 0);
  const sangrias = (movimentos ?? []).filter((m) => m.tipo === "sangria").reduce((s, m) => s + Number(m.valor), 0);
  const esperadoDinheiro = Number(caixa.valor_inicial) + porMetodo.dinheiro + suprimentos - sangrias;
  const totalVendas = Object.values(porMetodo).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Caixa</h1>
          <p className="text-sm text-muted-foreground">Aberto em {hora(caixa.aberto_em)} · troco inicial {brl(Number(caixa.valor_inicial))}</p>
        </div>
        {podeEditar && (
          <div className="flex gap-2">
            <MovimentoDialog slug={slug} />
            <FecharCaixaDialog slug={slug} esperadoDinheiro={esperadoDinheiro} />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {[
          { l: "Vendido", v: totalVendas },
          { l: "Dinheiro", v: porMetodo.dinheiro },
          { l: "Pix", v: porMetodo.pix },
          { l: "Cartão", v: porMetodo.cartao },
          { l: "Na gaveta (esperado)", v: esperadoDinheiro },
        ].map((c) => (
          <div key={c.l} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{c.l}</p>
            <p className="text-lg font-semibold">{brl(c.v)}</p>
          </div>
        ))}
      </div>

      {podeEditar && (
        <Pdv
          slug={slug}
          atendimentos={atendimentos}
          servicos={(servicos ?? []).map((s) => ({ id: s.id, nome: s.nome, preco: Number(s.preco) }))}
          produtos={(produtos ?? []).map((p) => ({ id: p.id, nome: p.nome, preco: Number(p.preco), estoque: p.estoque_atual }))}
          funcionarios={funcionarios ?? []}
          clientes={clientes ?? []}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Movimento deste caixa</CardTitle>
        </CardHeader>
        <CardContent className="divide-y text-sm">
          {(vendas ?? []).map((v) => (
            <div key={v.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                {hora(v.pago_em)} · {v.pagamento_itens.map((i) => `${i.quantidade}x ${i.descricao ?? "item"}`).join(", ")}
                {v.clientes?.nome ? ` · ${v.clientes.nome}` : ""}
              </span>
              <span className="font-medium">
                {brl(Number(v.valor))} <span className="font-normal text-muted-foreground">({METODO[v.metodo] ?? v.metodo})</span>
              </span>
            </div>
          ))}
          {(movimentos ?? []).map((m) => (
            <div key={m.id} className="flex justify-between py-2 text-muted-foreground">
              <span>
                {hora(m.created_at)} · {m.tipo === "sangria" ? "Sangria" : "Suprimento"}
                {m.motivo ? ` · ${m.motivo}` : ""}
              </span>
              <span>
                {m.tipo === "sangria" ? "−" : "+"}
                {brl(Number(m.valor))}
              </span>
            </div>
          ))}
          {(vendas ?? []).length === 0 && (movimentos ?? []).length === 0 && <p className="py-2 text-muted-foreground">Nenhum movimento ainda.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
