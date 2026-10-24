"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { hojeNoBrasil, brazilDateTimeToUtc } from "@/lib/tenant/timezone";
import type { AssinaturaStatus, PlanoPeriodo } from "@/lib/supabase/types";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";
import type { ActionState } from "../../../area-cliente/actions";

const MESES: Record<PlanoPeriodo, number> = { mensal: 1, trimestral: 3, anual: 12 };
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-01-31" + 1 mês = "2026-02-28" (fim do mês quando o dia não existe). */
function somarMeses(data: string, meses: number): string {
  const [a, m, d] = data.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(a, m - 1 + meses + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m - 1 + meses, Math.min(d, ultimoDia))).toISOString().slice(0, 10);
}

export async function updateAssinaturaStatus(assinaturaId: string, status: AssinaturaStatus) {
  await exigirEdicao("assinaturas");
  const supabase = await createSupabaseServerClient();
  await supabase.from("assinaturas_clientes").update({ status }).eq("id", assinaturaId);
  refresh();
}

/** Assinatura feita no balcão. Nasce pendente; vira ativa ao registrar a primeira mensalidade. */
export async function criarAssinaturaManual(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await exigirEdicao("assinaturas");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  const clienteId = String(formData.get("cliente_id") ?? "");
  const planoId = String(formData.get("plano_id") ?? "");
  if (!clienteId || !planoId) return { error: "Escolha o cliente e o plano." };

  const supabase = await createSupabaseServerClient();
  const { data: jaTem } = await supabase
    .from("assinaturas_clientes")
    .select("id")
    .eq("empresa_id", empresa.id)
    .eq("cliente_id", clienteId)
    .in("status", ["ativa", "pendente", "inadimplente"])
    .limit(1)
    .maybeSingle();
  if (jaTem) return { error: "Esse cliente já tem uma assinatura em andamento." };

  const { error } = await supabase.from("assinaturas_clientes").insert({
    empresa_id: empresa.id,
    cliente_id: clienteId,
    plano_id: planoId,
    status: "pendente",
    data_inicio: hojeNoBrasil(),
  });
  if (error) return { error: "Não foi possível criar a assinatura." };
  refresh();
  return { success: "Assinatura criada. Registre a primeira mensalidade para ativar." };
}

/**
 * Mensalidade paga no balcão (dinheiro, Pix ou cartão na maquininha). Ativa a
 * assinatura e empurra a próxima cobrança em um período do plano. Entra na
 * receita do pote do mês do pagamento.
 */
export async function registrarMensalidade(slug: string, assinaturaId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await exigirEdicao("assinaturas");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const valor = Number(String(formData.get("valor") ?? "").replace(",", "."));
  const metodo = String(formData.get("metodo") ?? "");
  const data = String(formData.get("data") ?? "") || hojeNoBrasil();
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Informe o valor pago." };
  if (!["dinheiro", "pix", "cartao"].includes(metodo)) return { error: "Escolha a forma de pagamento." };
  if (!DATA.test(data)) return { error: "Data inválida." };

  const supabase = await createSupabaseServerClient();
  const { data: assinatura } = (await supabase
    .from("assinaturas_clientes")
    .select("id, cliente_id, data_proxima_cobranca, planos(periodo)")
    .eq("id", assinaturaId)
    .eq("empresa_id", empresa.id)
    .maybeSingle()) as unknown as {
    data: { id: string; cliente_id: string; data_proxima_cobranca: string | null; planos: { periodo: PlanoPeriodo } | null } | null;
  };
  if (!assinatura) return { error: "Assinatura não encontrada." };

  const { error } = await supabase.from("pagamentos").insert({
    empresa_id: empresa.id,
    cliente_id: assinatura.cliente_id,
    tipo: "assinatura",
    referencia_id: assinatura.id,
    valor,
    metodo: metodo as "dinheiro" | "pix" | "cartao",
    status: "pago",
    // Meio-dia no horário do Brasil: cai no dia certo em qualquer fuso.
    pago_em: brazilDateTimeToUtc(data, "12:00").toISOString(),
  });
  if (error) return { error: "Não foi possível registrar o pagamento." };

  // Próxima cobrança: a partir do vencimento atual (se ainda não passou do pagamento) ou da data paga.
  const base = assinatura.data_proxima_cobranca && assinatura.data_proxima_cobranca > data ? assinatura.data_proxima_cobranca : data;
  const proxima = somarMeses(base, MESES[assinatura.planos?.periodo ?? "mensal"]);
  await supabase.from("assinaturas_clientes").update({ status: "ativa", data_proxima_cobranca: proxima }).eq("id", assinatura.id);

  refresh();
  return { success: `Pagamento registrado. Próxima cobrança em ${proxima.split("-").reverse().join("/")}.` };
}
