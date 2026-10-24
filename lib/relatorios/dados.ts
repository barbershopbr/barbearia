import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { brazilDayRangeUtc } from "@/lib/tenant/timezone";
import { SEM_EMAIL_SUFIXO } from "@/lib/auth/cliente-identity";

/**
 * Números dos relatórios de um período (datas locais do Brasil, inclusivas).
 * Lê com a sessão de quem está no painel — a página exige a seção
 * "relatorios" e a RLS limita à barbearia dele.
 */
export type Relatorio = {
  totais: { faturamento: number; atendimentos: number; ticketMedio: number; assinantesAtendidos: number; vendasProdutos: number; mensalidades: number };
  porDia: { dia: string; valor: number }[];
  porProfissional: { nome: string; atendimentos: number; valor: number }[];
  porServico: { nome: string; quantidade: number; valor: number }[];
  porForma: { forma: string; valor: number }[];
  produtos: { nome: string; quantidade: number; valor: number }[];
  clientesSumidos: { nome: string; telefone: string | null; email: string | null; ultimaVisita: string; visitas: number }[];
};

const FORMA: Record<string, string> = { dinheiro: "Dinheiro", pix: "Pix", cartao: "Cartão", na_retirada: "Na retirada", cartao_recorrente: "Cartão recorrente" };
const diaLocal = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 10);

export async function gerarRelatorio(empresaId: string, de: string, ate: string, diasSumido = 45): Promise<Relatorio> {
  const inicio = brazilDayRangeUtc(de).inicio.toISOString();
  const fim = brazilDayRangeUtc(ate).fim.toISOString();
  const supabase = await createSupabaseServerClient();

  const [{ data: atend }, { data: pagos }, { data: todosConcluidos }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("id, data_hora_inicio, desconto, assinatura_id, servicos(nome, preco), funcionarios(nome)")
      .eq("empresa_id", empresaId)
      .eq("status", "concluido")
      .gte("data_hora_inicio", inicio)
      .lte("data_hora_inicio", fim) as unknown as Promise<{
      data: { id: string; data_hora_inicio: string; desconto: number; assinatura_id: string | null; servicos: { nome: string; preco: number } | null; funcionarios: { nome: string } | null }[] | null;
    }>,
    supabase
      .from("pagamentos")
      .select("tipo, valor, metodo, pago_em, pagamento_itens(descricao, quantidade, preco_unitario, produto_id, agendamento_id, produtos(nome), funcionarios(nome))")
      .eq("empresa_id", empresaId)
      .eq("status", "pago")
      .gte("pago_em", inicio)
      .lte("pago_em", fim) as unknown as Promise<{
      data: {
        tipo: string;
        valor: number;
        metodo: string;
        pago_em: string;
        pagamento_itens: {
          descricao: string | null;
          quantidade: number;
          preco_unitario: number;
          produto_id: string | null;
          agendamento_id: string | null;
          produtos: { nome: string } | null;
          funcionarios: { nome: string } | null;
        }[];
      }[] | null;
    }>,
    // Para "clientes sumidos": última visita de cada cliente (todo o histórico).
    supabase
      .from("agendamentos")
      .select("data_hora_inicio, clientes(id, nome, telefone, email)")
      .eq("empresa_id", empresaId)
      .eq("status", "concluido") as unknown as Promise<{
      data: { data_hora_inicio: string; clientes: { id: string; nome: string; telefone: string | null; email: string } | null }[] | null;
    }>,
  ]);

  const cobradosNoCaixa = new Set((pagos ?? []).flatMap((p) => p.pagamento_itens.map((i) => i.agendamento_id)).filter(Boolean));
  const avulsos = (atend ?? []).filter((a) => !a.assinatura_id);
  const somaMap = <T extends string>(m: Map<T, { q: number; v: number }>, k: T, v: number, q = 1) => {
    const x = m.get(k) ?? { q: 0, v: 0 };
    x.q += q;
    x.v += v;
    m.set(k, x);
  };

  // Faturamento = atendimentos da agenda (não cobrados no caixa) + tudo que foi pago (caixa, loja, mensalidades).
  const porDia = new Map<string, { q: number; v: number }>();
  const porProf = new Map<string, { q: number; v: number }>();
  const porServ = new Map<string, { q: number; v: number }>();
  const porForma = new Map<string, { q: number; v: number }>();
  const produtos = new Map<string, { q: number; v: number }>();
  let faturamento = 0;

  for (const a of avulsos) {
    // Cobrado no caixa: entra pelo item da venda (valor realmente recebido), não aqui.
    if (cobradosNoCaixa.has(a.id)) continue;
    const valor = Number(a.servicos?.preco ?? 0) - Number(a.desconto ?? 0);
    somaMap(porProf, a.funcionarios?.nome ?? "—", valor);
    somaMap(porServ, a.servicos?.nome ?? "—", valor);
    faturamento += valor;
    somaMap(porDia, diaLocal(a.data_hora_inicio), valor);
    somaMap(porForma, "Na barbearia (agenda)", valor);
  }
  let vendasProdutos = 0;
  let mensalidades = 0;
  for (const p of pagos ?? []) {
    const valor = Number(p.valor);
    faturamento += valor;
    somaMap(porDia, diaLocal(p.pago_em), valor);
    somaMap(porForma, FORMA[p.metodo] ?? p.metodo, valor);
    if (p.tipo === "assinatura") mensalidades += valor;
    for (const i of p.pagamento_itens) {
      const total = Number(i.preco_unitario) * i.quantidade;
      if (i.produto_id) {
        vendasProdutos += total;
        somaMap(produtos, i.produtos?.nome ?? i.descricao ?? "Produto", total, i.quantidade);
      } else if (i.descricao) {
        somaMap(porServ, i.descricao, total, i.quantidade);
        somaMap(porProf, i.funcionarios?.nome ?? "Sem profissional", total, i.quantidade);
      }
    }
  }

  // Clientes sumidos: última visita há mais de N dias (em relação ao fim do período).
  const ultima = new Map<string, { nome: string; telefone: string | null; email: string | null; ultima: string; visitas: number }>();
  for (const a of todosConcluidos ?? []) {
    if (!a.clientes) continue;
    const u = ultima.get(a.clientes.id) ?? {
      nome: a.clientes.nome,
      telefone: a.clientes.telefone,
      email: a.clientes.email.endsWith(SEM_EMAIL_SUFIXO) ? null : a.clientes.email,
      ultima: "",
      visitas: 0,
    };
    u.visitas += 1;
    if (a.data_hora_inicio > u.ultima) u.ultima = a.data_hora_inicio;
    ultima.set(a.clientes.id, u);
  }
  const limite = new Date(Date.parse(fim) - diasSumido * 86_400_000).toISOString();
  const clientesSumidos = [...ultima.values()]
    .filter((c) => c.ultima < limite)
    .sort((a, b) => b.visitas - a.visitas)
    .slice(0, 100)
    .map((c) => ({ nome: c.nome, telefone: c.telefone, email: c.email, ultimaVisita: diaLocal(c.ultima), visitas: c.visitas }));

  const ordenar = (m: Map<string, { q: number; v: number }>) => [...m.entries()].sort((a, b) => b[1].v - a[1].v);
  const atendimentos = avulsos.length;
  return {
    totais: {
      faturamento,
      atendimentos,
      ticketMedio: atendimentos ? (faturamento - mensalidades - vendasProdutos) / atendimentos : 0,
      assinantesAtendidos: (atend ?? []).length - avulsos.length,
      vendasProdutos,
      mensalidades,
    },
    porDia: [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([dia, x]) => ({ dia, valor: x.v })),
    porProfissional: ordenar(porProf).map(([nome, x]) => ({ nome, atendimentos: x.q, valor: x.v })),
    porServico: ordenar(porServ).map(([nome, x]) => ({ nome, quantidade: x.q, valor: x.v })),
    porForma: ordenar(porForma).map(([forma, x]) => ({ forma, valor: x.v })),
    produtos: ordenar(produtos).map(([nome, x]) => ({ nome, quantidade: x.q, valor: x.v })),
    clientesSumidos,
  };
}
