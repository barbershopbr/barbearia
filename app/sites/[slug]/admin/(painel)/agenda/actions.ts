"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { brazilDateTimeToUtc } from "@/lib/tenant/timezone";
import { ERRO_HORARIO_OCUPADO, hasConflict } from "@/lib/agenda/available-slots";
import type { ActionState } from "../../../area-cliente/actions";
import type { AgendamentoStatus } from "@/lib/supabase/types";
import { processarConclusao } from "@/lib/agenda/concluir";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { escopoAgenda, podeMexerNoProfissional } from "@/lib/auth/agenda-escopo";

export async function createAgendamentoAdmin(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await exigirEdicao("agenda");
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

  const staff = await getCurrentStaff(empresa.id);
  if (!staff || !podeMexerNoProfissional(await escopoAgenda(staff), funcionarioId)) {
    return { error: "Você só pode agendar na sua própria agenda." };
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

  if (error?.code === ERRO_HORARIO_OCUPADO) return { error: "Esse profissional já tem um agendamento nesse horário." };
  if (error) return { error: "Não foi possível criar o agendamento." };

  return { success: "Agendamento criado." };
}

export async function updateAgendamentoStatus(agendamentoId: string, status: AgendamentoStatus) {
  await exigirEdicao("agenda");
  const supabase = await createSupabaseServerClient();
  const { data: atual } = await supabase
    .from("agendamentos")
    .select("empresa_id, funcionario_id")
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!atual) return;

  const staff = await getCurrentStaff(atual.empresa_id);
  if (!staff || !podeMexerNoProfissional(await escopoAgenda(staff), atual.funcionario_id)) {
    throw new Error("Você só pode alterar atendimentos da sua própria agenda.");
  }

  const { data: agendamento, error: erroUpdate } = await supabase
    .from("agendamentos")
    .update({ status })
    .eq("id", agendamentoId)
    .select("empresa_id, cliente_id, funcionario_id, servico_id")
    .maybeSingle();
  if (erroUpdate?.code === ERRO_HORARIO_OCUPADO) {
    // Reativar um cancelado cujo horário já foi ocupado por outro atendimento.
    throw new Error("Esse horário já foi ocupado por outro atendimento.");
  }

  if (!agendamento || status !== "concluido") return;

  // A permissão sobre este atendimento já foi conferida acima; pontos, pote e
  // comissão rodam como servidor (ver lib/agenda/concluir.ts).
  await processarConclusao(createSupabaseServiceRoleClient(), { id: agendamentoId, ...agendamento });
}
