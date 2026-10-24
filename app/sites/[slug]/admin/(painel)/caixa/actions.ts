"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";
import { exigirRecurso } from "@/lib/plano/recursos";
import { baixarEstoque } from "@/lib/estoque/baixar";
import { gerarComissaoProduto, gerarComissaoServico } from "@/lib/comissoes/avulsa";
import { processarConclusao } from "@/lib/agenda/concluir";
import { creditarPontosPedido } from "@/lib/fidelidade/creditar";
import type { ActionState } from "../../../area-cliente/actions";

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", "."));

async function contexto(slug: string) {
  await exigirEdicao("caixa");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) throw new Error("Empresa não encontrada.");
  exigirRecurso(empresa, "caixa");
  const staff = await getCurrentStaff(empresa.id);
  if (!staff) throw new Error("Sessão expirada.");
  const supabase = await createSupabaseServerClient();
  const { data: caixa } = await supabase.from("caixas").select("*").eq("empresa_id", empresa.id).is("fechado_em", null).maybeSingle();
  return { empresa, staff, supabase, caixa };
}

export async function abrirCaixa(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { empresa, staff, supabase, caixa } = await contexto(slug);
  if (caixa) return { error: "Já existe um caixa aberto." };
  const valorInicial = num(formData.get("valor_inicial"));
  if (!Number.isFinite(valorInicial) || valorInicial < 0) return { error: "Informe o troco inicial (pode ser 0)." };
  const { error } = await supabase.from("caixas").insert({ empresa_id: empresa.id, aberto_por: staff.id, valor_inicial: valorInicial });
  if (error) return { error: error.code === "23505" ? "Já existe um caixa aberto." : "Não foi possível abrir o caixa." };
  refresh();
  return { success: "Caixa aberto." };
}

export async function registrarMovimento(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { empresa, staff, supabase, caixa } = await contexto(slug);
  if (!caixa) return { error: "Abra o caixa primeiro." };
  const tipo = String(formData.get("tipo") ?? "");
  const valor = num(formData.get("valor"));
  if (tipo !== "sangria" && tipo !== "suprimento") return { error: "Tipo inválido." };
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Informe o valor." };
  const { error } = await supabase.from("caixa_movimentos").insert({
    caixa_id: caixa.id,
    empresa_id: empresa.id,
    tipo,
    valor,
    motivo: String(formData.get("motivo") ?? "").trim() || null,
    criado_por: staff.id,
  });
  if (error) return { error: "Não foi possível registrar." };
  refresh();
  return { success: tipo === "sangria" ? "Retirada registrada." : "Entrada registrada." };
}

type ItemVenda = { tipo: "servico" | "produto"; id: string; quantidade: number; funcionarioId?: string | null; agendamentoId?: string | null };

/**
 * Venda no balcão: serviços e/ou produtos, com ou sem cliente cadastrado.
 * Preços sempre do banco (nunca do navegador). Baixa estoque, gera comissão
 * dos serviços pela regra do profissional e credita pontos de fidelidade.
 */
export async function registrarVenda(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { empresa, supabase, caixa } = await contexto(slug);
  if (!caixa) return { error: "Abra o caixa antes de vender." };

  let itens: ItemVenda[];
  try {
    itens = (JSON.parse(String(formData.get("itens") ?? "[]")) as ItemVenda[]).filter(
      (i) => (i.tipo === "servico" || i.tipo === "produto") && typeof i.id === "string" && Number.isInteger(i.quantidade) && i.quantidade > 0,
    );
  } catch {
    return { error: "Itens inválidos." };
  }
  if (itens.length === 0) return { error: "Adicione pelo menos um item." };

  // Atendimentos da agenda cobrados aqui: serviço, profissional e cliente vêm do atendimento.
  const agendamentoIds = itens.map((i) => i.agendamentoId).filter((x): x is string => !!x);
  const { data: atendimentos } = agendamentoIds.length
    ? await supabase
        .from("agendamentos")
        .select("id, empresa_id, cliente_id, funcionario_id, servico_id, status")
        .eq("empresa_id", empresa.id)
        .in("id", agendamentoIds)
    : { data: [] };
  const atendimentoPor = new Map((atendimentos ?? []).map((a) => [a.id, a]));
  if (agendamentoIds.length) {
    if (atendimentoPor.size !== new Set(agendamentoIds).size) return { error: "Atendimento não encontrado. Atualize a página." };
    const { count } = await supabase.from("pagamento_itens").select("id", { count: "exact", head: true }).in("agendamento_id", agendamentoIds);
    if (count) return { error: "Um desses atendimentos já foi cobrado." };
    itens = itens.map((i) => {
      const a = i.agendamentoId ? atendimentoPor.get(i.agendamentoId) : null;
      return a ? { tipo: "servico", id: a.servico_id, quantidade: 1, funcionarioId: a.funcionario_id, agendamentoId: a.id } : i;
    });
  }

  const metodo = String(formData.get("metodo") ?? "");
  if (!["dinheiro", "pix", "cartao"].includes(metodo)) return { error: "Escolha a forma de pagamento." };
  const clienteId =
    String(formData.get("cliente_id") ?? "").trim() || (atendimentos ?? []).find((a) => a.cliente_id)?.cliente_id || null;
  const descontoInformado = num(formData.get("desconto")) || 0;

  const servicoIds = itens.filter((i) => i.tipo === "servico").map((i) => i.id);
  const produtoIds = itens.filter((i) => i.tipo === "produto").map((i) => i.id);
  const [{ data: servicos }, { data: produtos }] = await Promise.all([
    servicoIds.length ? supabase.from("servicos").select("id, nome, preco").eq("empresa_id", empresa.id).in("id", servicoIds) : Promise.resolve({ data: [] }),
    produtoIds.length ? supabase.from("produtos").select("id, nome, preco, estoque_atual").eq("empresa_id", empresa.id).in("id", produtoIds) : Promise.resolve({ data: [] }),
  ]);
  const servicoPor = new Map((servicos ?? []).map((s) => [s.id, s]));
  const produtoPor = new Map((produtos ?? []).map((p) => [p.id, p as { id: string; nome: string; preco: number; estoque_atual: number }]));

  const linhas = [];
  for (const i of itens) {
    const ref = i.tipo === "servico" ? servicoPor.get(i.id) : produtoPor.get(i.id);
    if (!ref) return { error: "Um dos itens não existe mais. Atualize a página." };
    const estoque = i.tipo === "produto" ? produtoPor.get(i.id)?.estoque_atual ?? 0 : Infinity;
    if (estoque < i.quantidade) return { error: `Estoque insuficiente de ${ref.nome}.` };
    linhas.push({ ...i, nome: ref.nome, preco: Number(ref.preco) });
  }
  const subtotal = linhas.reduce((s, l) => s + l.preco * l.quantidade, 0);
  const desconto = Math.min(Math.max(descontoInformado, 0), subtotal);
  const total = Math.round((subtotal - desconto) * 100) / 100;

  const agora = new Date().toISOString();
  const { data: venda, error } = await supabase
    .from("pagamentos")
    .insert({
      empresa_id: empresa.id,
      cliente_id: clienteId,
      tipo: "balcao",
      valor: total,
      desconto,
      metodo: metodo as "dinheiro" | "pix" | "cartao",
      status: "pago",
      pago_em: agora,
      caixa_id: caixa.id,
      separado: true,
      retirado_em: agora,
    })
    .select("id")
    .single();
  if (error || !venda) return { error: "Não foi possível registrar a venda." };

  const { error: erroItens } = await supabase.from("pagamento_itens").insert(
    linhas.map((l) => ({
      pagamento_id: venda.id,
      produto_id: l.tipo === "produto" ? l.id : null,
      servico_id: l.tipo === "servico" ? l.id : null,
      funcionario_id: l.funcionarioId ?? null,
      agendamento_id: l.agendamentoId ?? null,
      descricao: l.nome,
      quantidade: l.quantidade,
      preco_unitario: l.preco,
    })),
  );
  if (erroItens) {
    await supabase.from("pagamentos").delete().eq("id", venda.id);
    return {
      error: erroItens.code === "23505" ? "Um desses atendimentos já foi cobrado." : "Não foi possível registrar os itens da venda.",
    };
  }

  // Efeitos com service role (estoque, regras de comissão, fidelidade não são
  // necessariamente visíveis para quem opera o caixa).
  const admin = createSupabaseServiceRoleClient();
  await baixarEstoque(
    admin,
    empresa.id,
    linhas.filter((l) => l.tipo === "produto").map((l) => ({ produto_id: l.id, quantidade: l.quantidade })),
    "Venda no balcão",
  );
  const fator = subtotal > 0 ? total / subtotal : 1; // comissão sobre o valor com desconto
  for (const l of linhas.filter((x) => x.tipo === "servico")) {
    const atendimento = l.agendamentoId ? atendimentoPor.get(l.agendamentoId) : null;
    if (atendimento) {
      // Cobrou um atendimento da agenda: conclui (se ainda não estava) e a
      // comissão/pote/pontos saem pela regra do atendimento, uma única vez.
      if (atendimento.status !== "concluido") {
        await admin.from("agendamentos").update({ status: "concluido" }).eq("id", atendimento.id);
      }
      await processarConclusao(admin, atendimento, { valorServico: l.preco * fator, metodo });
      continue;
    }
    if (!l.funcionarioId) continue;
    for (let q = 0; q < l.quantidade; q++) {
      await gerarComissaoServico(admin, { empresaId: empresa.id, funcionarioId: l.funcionarioId, valorServico: l.preco * fator, servicoId: l.id, metodo });
    }
  }
  // Produto com vendedor: comissão sobre a venda (% de produto da regra dele).
  for (const l of linhas.filter((x) => x.tipo === "produto" && x.funcionarioId)) {
    await gerarComissaoProduto(admin, { empresaId: empresa.id, funcionarioId: l.funcionarioId!, valorVenda: l.preco * l.quantidade * fator, metodo });
  }
  // Pontos da compra (o atendimento cobrado já pontuou pela agenda).
  if (clienteId && linhas.some((l) => !l.agendamentoId)) {
    await creditarPontosPedido(admin, { empresaId: empresa.id, clienteId, pedidoId: venda.id, valor: total });
  }

  refresh();
  return { success: `Venda registrada: R$ ${total.toFixed(2).replace(".", ",")}.` };
}

export async function fecharCaixa(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { staff, supabase, caixa } = await contexto(slug);
  if (!caixa) return { error: "Não há caixa aberto." };
  const contado = num(formData.get("valor_contado"));
  if (!Number.isFinite(contado) || contado < 0) return { error: "Informe quanto há em dinheiro na gaveta." };
  const { error } = await supabase
    .from("caixas")
    .update({
      fechado_em: new Date().toISOString(),
      fechado_por: staff.id,
      valor_contado: contado,
      observacao: String(formData.get("observacao") ?? "").trim() || null,
    })
    .eq("id", caixa.id);
  if (error) return { error: "Não foi possível fechar o caixa." };
  refresh();
  return { success: "Caixa fechado." };
}
