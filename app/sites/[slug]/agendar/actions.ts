"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { tenantBasePath } from "@/lib/tenant/base-path";
import { brazilDateTimeToUtc } from "@/lib/tenant/timezone";
import { ERRO_HORARIO_OCUPADO, getAvailableSlots, hasConflict } from "@/lib/agenda/available-slots";
import { validarEComputarCupom } from "@/lib/cupons/validar";
import type { ActionState } from "../area-cliente/actions";
import type { AgendamentoStatus } from "@/lib/supabase/types";
import { ANTECEDENCIA_MINIMA_HORAS, clientePodeAlterar } from "@/lib/agenda/regras-cliente";

export async function listarHorariosDisponiveis(
  slug: string,
  funcionarioId: string,
  data: string,
  servicoId: string,
): Promise<string[]> {
  if (!funcionarioId || !data || !servicoId) return [];

  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return [];

  const supabase = await createSupabaseServerClient();
  const { data: servico } = await supabase
    .from("servicos")
    .select("duracao_minutos")
    .eq("id", servicoId)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!servico) return [];

  return getAvailableSlots(supabase, {
    empresaId: empresa.id,
    funcionarioId,
    data,
    duracaoMinutos: servico.duracao_minutos,
    horarios: empresa.horarios as Record<string, { abre?: string; fecha?: string; fechado?: boolean }>,
  });
}

export async function createAgendamento(slug: string, empresaId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const cliente = await getCurrentCliente(empresaId);
  if (!cliente) return { error: "Faça login para agendar." };

  const servicoId = String(formData.get("servico_id") ?? "");
  const funcionarioId = String(formData.get("funcionario_id") ?? "");
  const data = String(formData.get("data") ?? "");
  const hora = String(formData.get("hora") ?? "");
  const codigoCupom = String(formData.get("codigo_cupom") ?? "").trim();

  if (!servicoId || !funcionarioId || !data || !hora) {
    return { error: "Preencha serviço, profissional, data e horário." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: servico } = await supabase
    .from("servicos")
    .select("duracao_minutos, preco")
    .eq("id", servicoId)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (!servico) return { error: "Serviço inválido." };

  const inicio = brazilDateTimeToUtc(data, hora);
  if (Number.isNaN(inicio.getTime())) return { error: "Data/horário inválidos." };
  const fim = new Date(inicio.getTime() + servico.duracao_minutos * 60_000);

  // Remarcar: libera o horário antigo antes de checar conflito (o novo pode
  // se sobrepor a ele) e devolve o status original se algo der errado.
  const remarcarId = String(formData.get("remarcar_id") ?? "").trim() || null;
  let original: { id: string; status: AgendamentoStatus } | null = null;
  if (remarcarId) {
    const { data: antigo } = await supabase
      .from("agendamentos")
      .select("id, status, data_hora_inicio")
      .eq("id", remarcarId)
      .eq("cliente_id", cliente.id)
      .maybeSingle();
    if (!antigo || !clientePodeAlterar(antigo)) {
      return { error: `Esse horário não pode mais ser remarcado (limite de ${ANTECEDENCIA_MINIMA_HORAS}h antes).` };
    }
    await supabase.from("agendamentos").update({ status: "cancelado" }).eq("id", antigo.id).eq("cliente_id", cliente.id);
    original = { id: antigo.id, status: antigo.status };
  }
  const desfazerRemarcacao = async () => {
    if (original) await supabase.from("agendamentos").update({ status: original.status }).eq("id", original.id);
  };

  if (await hasConflict(supabase, { empresaId, funcionarioId, inicioUtc: inicio, fimUtc: fim })) {
    await desfazerRemarcacao();
    return { error: "Esse horário acabou de ficar indisponível. Escolha outro." };
  }

  // Cupom é revalidado aqui (nunca confia no desconto que veio do preview).
  const { cupom, erro: erroCupom } = await validarEComputarCupom(
    supabase,
    empresaId,
    codigoCupom,
    Number(servico.preco),
  );
  if (erroCupom) {
    await desfazerRemarcacao();
    return { error: erroCupom };
  }

  const { data: agendamento, error } = await supabase
    .from("agendamentos")
    .insert({
      empresa_id: empresaId,
      cliente_id: cliente.id,
      funcionario_id: funcionarioId,
      servico_id: servicoId,
      data_hora_inicio: inicio.toISOString(),
      data_hora_fim: fim.toISOString(),
      cupom_id: cupom?.id ?? null,
      desconto: cupom?.desconto ?? 0,
    })
    .select("id")
    .single();

  if (error || !agendamento) {
    await desfazerRemarcacao();
    return {
      error:
        error?.code === ERRO_HORARIO_OCUPADO
          ? "Esse horário acabou de ficar indisponível. Escolha outro."
          : "Não foi possível criar o agendamento.",
    };
  }

  if (cupom) {
    await supabase.from("cupom_usos").insert({
      empresa_id: empresaId,
      cupom_id: cupom.id,
      cliente_id: cliente.id,
      referencia_tipo: "agendamento",
      referencia_id: agendamento.id,
      valor_desconto: cupom.desconto,
    });
  }

  redirect(`${await tenantBasePath(slug)}/area-cliente`);
}
