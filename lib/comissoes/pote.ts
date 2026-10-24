import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { mesNoBrasil } from "@/lib/tenant/timezone";
import { calcularPote, lerConfigPote, type ConfigPote, type ResultadoPote } from "@/lib/comissoes/pote-calculo";

/**
 * Dados do pote de um mês. Usa service role porque a prévia do barbeiro
 * precisa do total de pontos de todos (a RLS só mostra a ele os próprios
 * atendimentos) — quem chama confere a permissão antes.
 */
export async function previaPote(
  empresaId: string,
  competencia: string, // "YYYY-MM"
  configRaw: unknown,
): Promise<{ config: ConfigPote; resultado: ResultadoPote; fechamento: { id: string; created_at: string } | null }> {
  const config = lerConfigPote(configRaw);
  const admin = createSupabaseServiceRoleClient();
  const { inicio, fim, primeiroDia } = mesNoBrasil(`${competencia}-01`);
  const mesAnterior = new Date(`${competencia}-15T12:00:00Z`);
  mesAnterior.setUTCMonth(mesAnterior.getUTCMonth() - 1);
  const competenciaAnterior = `${mesAnterior.toISOString().slice(0, 7)}-01`;

  const [{ data: pagamentos }, { data: atendimentos }, { data: profissionais }, { data: anterior }, { data: fechamento }] = await Promise.all([
    admin
      .from("pagamentos")
      .select("valor, referencia_id")
      .eq("empresa_id", empresaId)
      .eq("tipo", "assinatura")
      .eq("status", "pago")
      .gte("pago_em", inicio.toISOString())
      .lte("pago_em", fim.toISOString()),
    admin
      .from("agendamentos")
      .select("funcionario_id, servico_id, assinatura_id, servicos(preco)")
      .eq("empresa_id", empresaId)
      .eq("status", "concluido")
      .not("assinatura_id", "is", null)
      .gte("data_hora_inicio", inicio.toISOString())
      .lte("data_hora_inicio", fim.toISOString()) as unknown as Promise<{
      data: { funcionario_id: string; servico_id: string; assinatura_id: string; servicos: { preco: number } | null }[] | null;
    }>,
    admin.from("funcionarios").select("id, nome").eq("empresa_id", empresaId).eq("ativo", true).order("nome"),
    admin
      .from("pote_fechamentos")
      .select("sobra, sobra_destino")
      .eq("empresa_id", empresaId)
      .eq("competencia", competenciaAnterior)
      .maybeSingle(),
    admin.from("pote_fechamentos").select("id, created_at").eq("empresa_id", empresaId).eq("competencia", primeiroDia).maybeSingle(),
  ]);

  // Plano de cada assinatura envolvida (para o modo "um pote por plano").
  const assinaturaIds = [...new Set([...(pagamentos ?? []).map((p) => p.referencia_id), ...(atendimentos ?? []).map((a) => a.assinatura_id)].filter(Boolean))] as string[];
  const { data: assinaturas } = assinaturaIds.length
    ? await admin.from("assinaturas_clientes").select("id, plano_id").in("id", assinaturaIds)
    : { data: [] as { id: string; plano_id: string }[] };
  const planoDe = new Map((assinaturas ?? []).map((a) => [a.id, a.plano_id]));

  const resultado = calcularPote(config, {
    receitas: (pagamentos ?? []).map((p) => ({ planoId: planoDe.get(p.referencia_id ?? "") ?? "sem-plano", valor: Number(p.valor) })),
    atendimentos: (atendimentos ?? []).map((a) => ({
      funcionarioId: a.funcionario_id,
      servicoId: a.servico_id,
      preco: Number(a.servicos?.preco ?? 0),
      planoId: planoDe.get(a.assinatura_id) ?? "sem-plano",
    })),
    profissionais: profissionais ?? [],
    acumuladoAnterior: anterior?.sobra_destino === "acumular" ? Number(anterior.sobra) : 0,
  });

  return { config, resultado, fechamento: fechamento ?? null };
}

/** Fecha o mês: grava o fechamento e gera uma comissão "assinatura" por barbeiro. */
export async function fecharPote(empresaId: string, competencia: string, configRaw: unknown, fechadoPor: string): Promise<{ error?: string }> {
  const { config, resultado, fechamento } = await previaPote(empresaId, competencia, configRaw);
  if (fechamento) return { error: "Este mês já foi fechado." };

  const admin = createSupabaseServiceRoleClient();
  const { data: novo, error } = await admin
    .from("pote_fechamentos")
    .insert({
      empresa_id: empresaId,
      competencia: `${competencia}-01`,
      receita: resultado.receita,
      parte_casa: resultado.parteCasa,
      pote: resultado.pote,
      total_pontos: resultado.totalPontos,
      distribuido: resultado.distribuido,
      sobra: resultado.sobra,
      sobra_destino: config.sobra,
      detalhes: { config, linhas: resultado.linhas, acumuladoAnterior: resultado.acumuladoAnterior, valorPonto: resultado.valorPonto },
      fechado_por: fechadoPor,
    })
    .select("id")
    .single();
  if (error || !novo) return { error: error?.code === "23505" ? "Este mês já foi fechado." : "Não foi possível fechar o mês." };

  const comissoes = resultado.linhas
    .filter((l) => l.valor > 0)
    .map((l) => ({
      empresa_id: empresaId,
      funcionario_id: l.funcionarioId,
      tipo: "assinatura" as const,
      valor: l.valor,
      periodo_pagamento: "mensal" as const,
      status: "pendente" as const,
      pote_fechamento_id: novo.id,
    }));
  if (comissoes.length) {
    const { error: erroComissoes } = await admin.from("comissoes").insert(comissoes);
    if (erroComissoes) {
      await admin.from("pote_fechamentos").delete().eq("id", novo.id);
      return { error: "Não foi possível gerar as comissões do pote." };
    }
  }
  return {};
}

/** Reabre um mês fechado (apaga fechamento e comissões geradas), se nenhuma comissão já foi paga. */
export async function reabrirPote(empresaId: string, competencia: string): Promise<{ error?: string }> {
  const admin = createSupabaseServiceRoleClient();
  const { data: f } = await admin
    .from("pote_fechamentos")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("competencia", `${competencia}-01`)
    .maybeSingle();
  if (!f) return { error: "Mês não está fechado." };
  const { count } = await admin.from("comissoes").select("id", { count: "exact", head: true }).eq("pote_fechamento_id", f.id).eq("status", "pago");
  if (count) return { error: "Já há comissões deste pote marcadas como pagas. Desmarque antes de reabrir." };
  await admin.from("pote_fechamentos").delete().eq("id", f.id);
  return {};
}
