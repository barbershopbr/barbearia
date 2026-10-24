/**
 * Até quando o cliente pode cancelar/remarcar pelo site. Fixo por enquanto;
 * vira configuração por barbearia junto com folgas/bloqueios (ESCOPO.md, Etapa 5).
 */
export const ANTECEDENCIA_MINIMA_HORAS = 2;

const STATUS_ALTERAVEIS = new Set(["agendado", "confirmado"]);

export function clientePodeAlterar(agendamento: { status: string; data_hora_inicio: string }, agora: Date = new Date()): boolean {
  if (!STATUS_ALTERAVEIS.has(agendamento.status)) return false;
  const limite = new Date(agendamento.data_hora_inicio).getTime() - ANTECEDENCIA_MINIMA_HORAS * 3_600_000;
  return agora.getTime() <= limite;
}
