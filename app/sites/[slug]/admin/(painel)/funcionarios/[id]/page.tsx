import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { nivelSecao, podeAcessarSecao } from "@/lib/auth/papeis";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { hojeNoBrasil, mesNoBrasil } from "@/lib/tenant/timezone";
import { temRecurso } from "@/lib/plano/recursos";
import { comissaoServico, type RegraBase } from "@/lib/comissoes/calculo";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RegraEditor } from "../../comissoes/regra-row";
import { DadosFuncionarioForm } from "./dados-form";
import { CONTRATO_LABEL } from "@/lib/funcionarios/contrato";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const REGRA_LABEL: Record<RegraBase["tipo"], string> = {
  percentual: "Percentual por atendimento",
  fixo_por_servico: "Valor fixo por atendimento",
  diaria: "Diária (lançada manualmente)",
  mensal: "Mensal (lançada manualmente)",
};

export default async function FuncionarioDetalhePage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ mes?: string }> }) {
  const { slug, id } = await params;
  const { mes: mesParam } = await searchParams;
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return null;
  const staff = await getCurrentStaff(empresa.id);
  if (!staff) return null;

  const mesRef = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? `${mesParam}-01` : hojeNoBrasil();
  const mes = mesNoBrasil(mesRef);
  const verComissoes = temRecurso(empresa, "comissoes") && podeAcessarSecao(staff, "comissoes");

  const supabase = await createSupabaseServerClient();
  const { data: funcionario } = await supabase.from("funcionarios").select("*").eq("id", id).eq("empresa_id", empresa.id).maybeSingle();
  if (!funcionario) notFound();

  const [{ data: dados }, { data: regra }, { data: excecoes }, { data: servicos }, { data: atendimentos }, { data: comissoes }, { data: avaliacoes }] = await Promise.all([
    supabase.from("funcionarios_dados").select("*").eq("funcionario_id", id).maybeSingle(),
    supabase.from("regras_comissao").select("*").eq("funcionario_id", id).eq("empresa_id", empresa.id).maybeSingle(),
    supabase.from("regras_comissao_servico").select("servico_id, tipo, valor").eq("funcionario_id", id),
    supabase.from("servicos").select("id, nome, preco").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase
      .from("agendamentos")
      .select("desconto, assinatura_id, servicos(preco)")
      .eq("funcionario_id", id)
      .eq("status", "concluido")
      .gte("data_hora_inicio", mes.inicio.toISOString())
      .lt("data_hora_inicio", mes.fim.toISOString()) as unknown as Promise<{ data: { desconto: number; assinatura_id: string | null; servicos: { preco: number } | null }[] | null }>,
    supabase
      .from("comissoes")
      .select("valor, status")
      .eq("funcionario_id", id)
      .gte("created_at", mes.inicio.toISOString())
      .lt("created_at", mes.fim.toISOString()),
    supabase.from("avaliacoes").select("nota").eq("funcionario_id", id),
  ]);

  const base = await tenantBasePath(slug);
  const podeEditar = nivelSecao(staff, "funcionarios") === "editar";
  const excecaoDe = new Map((excecoes ?? []).map((e) => [e.servico_id, { tipo: e.tipo, valor: Number(e.valor) }]));
  const regraBase: RegraBase | null = regra?.ativo
    ? { tipo: regra.tipo, valor: Number(regra.valor), fixo_adicional: Number(regra.fixo_adicional), percentual_produto: Number(regra.percentual_produto), descontar_taxa: regra.descontar_taxa }
    : null;

  const qtdAtendimentos = atendimentos?.length ?? 0;
  const assinantes = (atendimentos ?? []).filter((a) => a.assinatura_id).length;
  const faturado = (atendimentos ?? []).filter((a) => !a.assinatura_id).reduce((s, a) => s + Number(a.servicos?.preco ?? 0) - Number(a.desconto ?? 0), 0);
  const comissaoPaga = (comissoes ?? []).filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor ?? 0), 0);
  const comissaoPendente = (comissoes ?? []).filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.valor ?? 0), 0);
  const salario = Number(dados?.salario_fixo ?? 0);
  const notas = (avaliacoes ?? []).map((a) => Number(a.nota));
  const media = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null;

  const [ano, numMes] = mes.primeiroDia.split("-").map(Number);
  const mesAnterior = `${numMes === 1 ? ano - 1 : ano}-${String(numMes === 1 ? 12 : numMes - 1).padStart(2, "0")}`;
  const mesSeguinte = `${numMes === 12 ? ano + 1 : ano}-${String(numMes === 12 ? 1 : numMes + 1).padStart(2, "0")}`;
  const nomeMes = new Date(Date.UTC(ano, numMes - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const linkMes = (m: string) => `${base}/admin/funcionarios/${id}?mes=${m}`;

  const cards: { titulo: string; valor: string; detalhe?: string }[] = [
    { titulo: "Atendimentos concluídos", valor: String(qtdAtendimentos), detalhe: assinantes ? `${assinantes} de assinantes (pote)` : undefined },
    { titulo: "Faturado (avulsos)", valor: brl(faturado) },
    ...(verComissoes
      ? [
          { titulo: "Comissões a pagar", valor: brl(comissaoPendente), detalhe: `${brl(comissaoPaga)} já pagas` },
          { titulo: "Total do mês", valor: brl(salario + comissaoPaga + comissaoPendente), detalhe: salario ? `inclui salário de ${brl(salario)}` : "só comissões" },
        ]
      : []),
    { titulo: "Avaliação média", valor: media === null ? "—" : `${media.toFixed(1)} ★`, detalhe: `${notas.length} avaliação(ões)` },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href={`${base}/admin/funcionarios`} className="text-sm text-muted-foreground hover:underline">
          ← Funcionários
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={funcionario.foto_url || "/avatar-placeholder.svg"} alt="" className="size-14 rounded-full object-cover" />
          <div>
            <h1 className="text-xl font-semibold">{funcionario.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {[dados?.cargo, dados?.tipo_contrato && CONTRATO_LABEL[dados.tipo_contrato], dados?.data_admissao && `desde ${dados.data_admissao.split("-").reverse().join("/")}`]
                .filter(Boolean)
                .join(" · ") || "Complete os dados abaixo"}
            </p>
          </div>
          <Badge variant={funcionario.ativo ? "default" : "secondary"}>{funcionario.ativo ? "Ativo" : "Inativo"}</Badge>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Resumo de {nomeMes}</h2>
          <div className="flex gap-3 text-sm">
            <Link href={linkMes(mesAnterior)} className="hover:underline">
              ← Mês anterior
            </Link>
            <Link href={linkMes(mesSeguinte)} className="hover:underline">
              Próximo mês →
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c) => (
            <div key={c.titulo} className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{c.titulo}</p>
              <p className="text-lg font-semibold">{c.valor}</p>
              {c.detalhe && <p className="text-xs text-muted-foreground">{c.detalhe}</p>}
            </div>
          ))}
        </div>
        {verComissoes && (dados?.dia_pagamento || dados?.chave_pix) && (
          <p className="text-sm text-muted-foreground">
            {dados?.dia_pagamento ? `Pagamento todo dia ${dados.dia_pagamento}.` : ""} {dados?.chave_pix ? `Pix: ${dados.chave_pix}` : ""}
          </p>
        )}
      </section>

      {verComissoes && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase">Quanto recebe por serviço</h2>
            <p className="text-sm text-muted-foreground">
              Regra atual: {regraBase ? REGRA_LABEL[regraBase.tipo] : "nenhuma (não gera comissão automática)"}
              {regraBase?.percentual_produto ? ` · ${regraBase.percentual_produto}% sobre produtos vendidos` : ""}. Valores sobre o preço cheio, antes de taxa e cupom.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Profissional recebe</TableHead>
                <TableHead>Fica para a casa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(servicos ?? []).map((sv) => {
                const preco = Number(sv.preco);
                const excecao = excecaoDe.get(sv.id) ?? null;
                const c = comissaoServico({ regra: regraBase, excecao, valorServico: preco });
                return (
                  <TableRow key={sv.id}>
                    <TableCell>
                      {sv.nome}
                      {excecao && <span className="ml-2 text-xs text-muted-foreground">(regra própria)</span>}
                    </TableCell>
                    <TableCell>{brl(preco)}</TableCell>
                    <TableCell className="font-medium">{c ? `${brl(c.valor)}${c.percentual !== null ? ` (${c.percentual}%)` : ""}` : "—"}</TableCell>
                    <TableCell>{c ? brl(preco - c.valor) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {nivelSecao(staff, "comissoes") === "editar" && (
            <RegraEditor
              slug={slug}
              funcionarioId={id}
              nome={`Alterar regra de ${funcionario.nome}`}
              servicos={(servicos ?? []).map((sv) => ({ ...sv, preco: Number(sv.preco) }))}
              excecoesIniciais={(excecoes ?? []).map((e) => ({ servicoId: e.servico_id, tipo: e.tipo, valor: Number(e.valor) }))}
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
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Dados do funcionário</h2>
        <p className="text-sm text-muted-foreground">Informações internas — não aparecem no site da barbearia.</p>
        <DadosFuncionarioForm slug={slug} funcionarioId={id} dados={dados} podeEditar={podeEditar} />
      </section>
    </div>
  );
}
