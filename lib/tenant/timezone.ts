// O app assume que toda barbearia opera no horário do Brasil
// (America/Sao_Paulo, sempre UTC-3 — o país aboliu o horário de verão em
// 2019, então não há complicação de DST). Isso importa porque em produção o
// Cloudflare Workers roda em UTC: `new Date("2026-01-01T09:00:00")` gerado
// ali representa 09:00 UTC, não 09:00 no horário local da barbearia. Sem essa
// conversão explícita, um agendamento marcado como "09:00" pelo cliente seria
// gravado 3 horas adiantado (ou atrasado, dependendo do ambiente que rodou o
// código) em relação ao horário real de funcionamento cadastrado.
const BRAZIL_UTC_OFFSET_HOURS = 3;

/** Converte uma data ("YYYY-MM-DD") + hora ("HH:mm") no horário local do Brasil para o instante UTC correspondente. */
export function brazilDateTimeToUtc(data: string, hora: string): Date {
  const [ano, mes, dia] = data.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia, h + BRAZIL_UTC_OFFSET_HOURS, m, 0));
}

/** Minutos desde meia-noite, no horário local do Brasil, de um timestamp UTC (ex.: `agendamentos.data_hora_inicio`). */
export function utcIsoToBrazilMinutesOfDay(iso: string): number {
  const d = new Date(iso);
  const totalUtcMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  return (((totalUtcMinutes - BRAZIL_UTC_OFFSET_HOURS * 60) % (24 * 60)) + 24 * 60) % (24 * 60);
}

/** Início (00:00) e fim (23:59:59.999) de um dia local do Brasil, como instantes UTC — útil pra filtrar `gte`/`lte` no Supabase. */
export function brazilDayRangeUtc(data: string): { inicio: Date; fim: Date } {
  const inicio = brazilDateTimeToUtc(data, "00:00");
  const fim = new Date(brazilDateTimeToUtc(data, "23:59").getTime() + 59_999);
  return { inicio, fim };
}
