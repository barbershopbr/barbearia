import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { brazilDayRangeUtc, utcIsoToBrazilMinutesOfDay } from "@/lib/tenant/timezone";

export type Horario = { abre?: string; fecha?: string; fechado?: boolean };

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
  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select("data_hora_inicio, data_hora_fim")
    .eq("empresa_id", empresaId)
    .eq("funcionario_id", funcionarioId)
    .neq("status", "cancelado")
    .gte("data_hora_inicio", inicio.toISOString())
    .lte("data_hora_inicio", fim.toISOString());

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
  const ocupados = await buscarOcupados(supabase, empresaId, funcionarioId, data);

  const slots: string[] = [];
  for (let inicio = aberturaMin; inicio + duracaoMinutos <= fechamentoMin; inicio += PASSO_MINUTOS) {
    const fim = inicio + duracaoMinutos;
    const conflita = ocupados.some((o) => inicio < o.fim && fim > o.inicio);
    if (!conflita) slots.push(minutosParaHora(inicio));
  }

  return slots;
}

/** Confere, no momento de criar o agendamento, se o horário escolhido ainda está livre (defesa contra corrida entre duas reservas simultâneas). */
export async function hasConflict(
  supabase: SupabaseClient<Database>,
  params: { empresaId: string; funcionarioId: string; inicioUtc: Date; fimUtc: Date },
): Promise<boolean> {
  const { empresaId, funcionarioId, inicioUtc, fimUtc } = params;

  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select("data_hora_inicio, data_hora_fim")
    .eq("empresa_id", empresaId)
    .eq("funcionario_id", funcionarioId)
    .neq("status", "cancelado")
    .lt("data_hora_inicio", fimUtc.toISOString())
    .gt("data_hora_fim", inicioUtc.toISOString());

  return (agendamentos ?? []).length > 0;
}
