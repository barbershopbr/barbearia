import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { brazilDayRangeUtc, utcIsoToBrazilMinutesOfDay } from "@/lib/tenant/timezone";

/** Funcionamento de um dia; pausa_inicio/pausa_fim = intervalo sem atendimento (ex.: almoço). */
export type Horario = { abre?: string; fecha?: string; fechado?: boolean; pausa_inicio?: string; pausa_fim?: string };

const DIA_SEMANA_KEYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"] as const;

const PASSO_MINUTOS = 30;

function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function minutosParaHora(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Dia da semana (chave usada em `empresas.horarios`) de uma data "YYYY-MM-DD", sem depender do fuso do processo que roda o código. */
function diaSemanaKey(data: string): (typeof DIA_SEMANA_KEYS)[number] {
  const [ano, mes, dia] = data.split("-").map(Number);
  // Data "fake" em UTC só pra usar getUTCDay() de forma determinística — não
  // representa o instante real, só serve pra descobrir o dia da semana.
  return DIA_SEMANA_KEYS[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
}

async function buscarOcupados(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  funcionarioId: string,
  data: string,
) {
  const { inicio, fim } = brazilDayRangeUtc(data);
  // Função SECURITY DEFINER: o cliente não enxerga agendamentos de outros
  // clientes pela RLS, mas precisa saber quais horários já estão ocupados.
  const { data: agendamentos } = await supabase.rpc("horarios_ocupados", {
    p_empresa: empresaId,
    p_funcionario: funcionarioId,
    p_inicio: inicio.toISOString(),
    p_fim: fim.toISOString(),
  });

  return (agendamentos ?? []).map((a) => ({
    inicio: utcIsoToBrazilMinutesOfDay(a.data_hora_inicio),
    fim: utcIsoToBrazilMinutesOfDay(a.data_hora_fim),
  }));
}

/** Lista de horários ("HH:mm") livres pra um funcionário, numa data, considerando o horário de funcionamento da empresa e os agendamentos já existentes. */
export async function getAvailableSlots(
  supabase: SupabaseClient<Database>,
  params: {
    empresaId: string;
    funcionarioId: string;
    data: string;
    duracaoMinutos: number;
    horarios: Record<string, Horario>;
  },
): Promise<string[]> {
  const { empresaId, funcionarioId, data, duracaoMinutos, horarios } = params;

  const horario = horarios[diaSemanaKey(data)];
  if (!horario || horario.fechado || !horario.abre || !horario.fecha) return [];

  const aberturaMin = horaParaMinutos(horario.abre);
  const fechamentoMin = horaParaMinutos(horario.fecha);
  // Agendamentos + bloqueios (via RPC) + pausa diária configurada.
  const ocupados = await buscarOcupados(supabase, empresaId, funcionarioId, data);
  if (horario.pausa_inicio && horario.pausa_fim && horario.pausa_fim > horario.pausa_inicio) {
    ocupados.push({ inicio: horaParaMinutos(horario.pausa_inicio), fim: horaParaMinutos(horario.pausa_fim) });
  }

  const slots: string[] = [];
  for (let inicio = aberturaMin; inicio + duracaoMinutos <= fechamentoMin; inicio += PASSO_MINUTOS) {
    const fim = inicio + duracaoMinutos;
    const conflita = ocupados.some((o) => inicio < o.fim && fim > o.inicio);
    if (!conflita) slots.push(minutosParaHora(inicio));
  }

  return slots;
}

/**
 * Confere, no momento de criar o agendamento, se o horário escolhido ainda
 * está livre. A garantia final contra duas reservas simultâneas é a
 * constraint agendamentos_sem_sobreposicao (erro 23P01 no insert).
 */
export async function hasConflict(
  supabase: SupabaseClient<Database>,
  params: { empresaId: string; funcionarioId: string; inicioUtc: Date; fimUtc: Date },
): Promise<boolean> {
  const { empresaId, funcionarioId, inicioUtc, fimUtc } = params;

  const { data: agendamentos } = await supabase.rpc("horarios_ocupados", {
    p_empresa: empresaId,
    p_funcionario: funcionarioId,
    p_inicio: inicioUtc.toISOString(),
    p_fim: fimUtc.toISOString(),
  });

  return (agendamentos ?? []).length > 0;
}

/** Código do Postgres para violação da constraint de exclusão (horário já ocupado). */
export const ERRO_HORARIO_OCUPADO = "23P01";
