"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { brazilDateTimeToUtc } from "@/lib/tenant/timezone";
import { hasConflict } from "@/lib/agenda/available-slots";
import { creditarPontosAgendamento } from "@/lib/fidelidade/creditar";
import type { ActionState } from "../../../area-cliente/actions";
import type { AgendamentoStatus } from "@/lib/supabase/types";

export async function createAgendamentoAdmin(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const clienteId = String(formData.get("cliente_id") ?? "");
  const servicoId = String(formData.get("servico_id") ?? "");
  const funcionarioId = String(formData.get("funcionario_id") ?? "");
  const data = String(formData.get("data") ?? "");
  const hora = String(formData.get("hora") ?? "");

  if (!clienteId || !servicoId || !funcionarioId || !data || !hora) {
    return { error: "Preencha todos os campos." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: servico } = await supabase
    .from("servicos")
    .select("duracao_minutos")
    .eq("id", servicoId)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!servico) return { error: "Serviço inválido." };

  const inicio = brazilDateTimeToUtc(data, hora);
  if (Number.isNaN(inicio.getTime())) return { error: "Data/horário inválidos." };
  const fim = new Date(inicio.getTime() + servico.duracao_minutos * 60_000);

  if (await hasConflict(supabase, { empresaId: empresa.id, funcionarioId, inicioUtc: inicio, fimUtc: fim })) {
    return { error: "Esse profissional já tem um agendamento nesse horário." };
  }

  const { error } = await supabase.from("agendamentos").insert({
    empresa_id: empresa.id,
    cliente_id: clienteId,
    funcionario_id: funcionarioId,
    servico_id: servicoId,
    data_hora_inicio: inicio.toISOString(),
    data_hora_fim: fim.toISOString(),
  });

  if (error) return { error: "Não foi possível criar o agendamento." };

  return { success: "Agendamento criado." };
}

export async function updateAgendamentoStatus(agendamentoId: string, status: AgendamentoStatus) {
  const supabase = await createSupabaseServerClient();
  const { data: agendamento } = await supabase
    .from("agendamentos")
    .update({ status })
    .eq("id", agendamentoId)
    .select("empresa_id, cliente_id, funcionario_id, servico_id")
    .maybeSingle();

  if (!agendamento || status !== "concluido") return;

  await creditarPontosAgendamento(supabase, {
    empresaId: agendamento.empresa_id,
    clienteId: agendamento.cliente_id,
    agendamentoId,
  });

  // Gera a comissão automaticamente, se o funcionário tiver uma regra ativa e
  // ainda não existir comissão lançada para este agendamento (evita duplicar
  // caso o status seja alternado entre concluído/outro mais de uma vez).
  const { data: jaExiste } = await supabase
    .from("comissoes")
    .select("id")
    .eq("agendamento_id", agendamentoId)
    .maybeSingle();
  if (jaExiste) return;

  const [{ data: regra }, { data: servico }] = await Promise.all([
    supabase
      .from("regras_comissao")
      .select("tipo, valor")
      .eq("funcionario_id", agendamento.funcionario_id)
      .eq("ativo", true)
      .maybeSingle(),
    supabase.from("servicos").select("preco").eq("id", agendamento.servico_id).maybeSingle(),
  ]);

  // Diária e salário mensal não são gerados por atendimento — o dono lança
  // manualmente na tela de Comissões quando quiser.
  if (!regra || !servico || (regra.tipo !== "percentual" && regra.tipo !== "fixo_por_servico")) return;

  const valorComissao = regra.tipo === "percentual" ? (Number(servico.preco) * regra.valor) / 100 : regra.valor;

  await supabase.from("comissoes").insert({
    empresa_id: agendamento.empresa_id,
    funcionario_id: agendamento.funcionario_id,
    agendamento_id: agendamentoId,
    tipo: "servico",
    valor: valorComissao,
    percentual: regra.tipo === "percentual" ? regra.valor : null,
    periodo_pagamento: "mensal",
    status: "pendente",
  });
}
