import { NextResponse, type NextRequest } from "next/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { nivelSecao } from "@/lib/auth/papeis";
import { temRecurso } from "@/lib/plano/recursos";
import { gerarRelatorio } from "@/lib/relatorios/dados";
import { periodoPadrao } from "@/lib/relatorios/periodo";

/** Excel brasileiro abre CSV com ";" e vírgula decimal; o BOM garante os acentos. */
function csv(linhas: (string | number)[][]): string {
  const celula = (v: string | number) => {
    const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : v;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await getEmpresaBySlug(slug);
  const staff = empresa ? await getCurrentStaff(empresa.id) : null;
  if (!empresa || !staff || !nivelSecao(staff, "relatorios") || !temRecurso(empresa, "relatorios")) {
    return new NextResponse("Sem acesso.", { status: 403 });
  }

  const q = request.nextUrl.searchParams;
  const periodo = periodoPadrao(undefined, q.get("de") ?? undefined, q.get("ate") ?? undefined);
  const r = await gerarRelatorio(empresa.id, periodo.de, periodo.ate);
  const tipo = q.get("tipo") ?? "resumo";

  let linhas: (string | number)[][];
  switch (tipo) {
    case "profissionais":
      linhas = [["Profissional", "Atendimentos", "Faturado (R$)"], ...r.porProfissional.map((x) => [x.nome, String(x.atendimentos), x.valor])];
      break;
    case "servicos":
      linhas = [["Serviço", "Quantidade", "Faturado (R$)"], ...r.porServico.map((x) => [x.nome, String(x.quantidade), x.valor])];
      break;
    case "produtos":
      linhas = [["Produto", "Quantidade", "Vendido (R$)"], ...r.produtos.map((x) => [x.nome, String(x.quantidade), x.valor])];
      break;
    case "sumidos":
      linhas = [["Cliente", "Visitas", "Última visita", "Telefone", "E-mail"], ...r.clientesSumidos.map((c) => [c.nome, String(c.visitas), c.ultimaVisita.split("-").reverse().join("/"), c.telefone ?? "", c.email ?? ""])];
      break;
    default:
      linhas = [
        ["Relatório", `${empresa.nome} — ${periodo.de} a ${periodo.ate}`],
        [],
        ["Faturamento (R$)", r.totais.faturamento],
        ["Atendimentos", String(r.totais.atendimentos)],
        ["Ticket médio (R$)", r.totais.ticketMedio],
        ["Produtos (R$)", r.totais.vendasProdutos],
        ["Mensalidades (R$)", r.totais.mensalidades],
        [],
        ["Dia", "Faturado (R$)"],
        ...r.porDia.map((d) => [d.dia.split("-").reverse().join("/"), d.valor]),
        [],
        ["Forma de pagamento", "Valor (R$)"],
        ...r.porForma.map((f) => [f.forma, f.valor]),
      ];
  }

  return new NextResponse(csv(linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${tipo}-${periodo.de}_a_${periodo.ate}.csv"`,
    },
  });
}
