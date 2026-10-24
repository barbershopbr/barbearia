"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";
import { escopoAgenda, podeMexerNoProfissional } from "@/lib/auth/agenda-escopo";
import { brazilDateTimeToUtc, brazilDayRangeUtc } from "@/lib/tenant/timezone";
import type { ActionState } from "../../../area-cliente/actions";

const MAX_DIAS = 120;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

/**
 * Folga/férias/feriado/bloqueio avulso. Profissional vazio = barbearia
 * inteira (só quem edita a agenda da equipe). A RLS de bloqueios_agenda
 * aplica a mesma regra no banco.
 */
export async function criarBloqueio(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await exigirEdicao("agenda");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  const staff = await getCurrentStaff(empresa.id);
  if (!staff) return { error: "Sem permissão." };

  const funcionarioId = String(formData.get("funcionario_id") ?? "").trim() || null;
  const escopo = await escopoAgenda(staff);
  const permitido = funcionarioId ? podeMexerNoProfissional(escopo, funcionarioId) : escopo.tipo === "equipe" && escopo.podeEditarEquipe;
  if (!permitido) return { error: "Você só pode bloquear a sua própria agenda." };

  const dataInicio = String(formData.get("data_inicio") ?? "");
  const dataFim = String(formData.get("data_fim") ?? "") || dataInicio;
  const diaInteiro = formData.get("dia_inteiro") === "on";
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const horaFim = String(formData.get("hora_fim") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 120) || null;

  if (!DATA.test(dataInicio) || !DATA.test(dataFim)) return { error: "Informe as datas." };
  if (!diaInteiro && (!HORA.test(horaInicio) || !HORA.test(horaFim))) return { error: "Informe os horários ou marque \"dia inteiro\"." };

  const inicio = diaInteiro ? brazilDayRangeUtc(dataInicio).inicio : brazilDateTimeToUtc(dataInicio, horaInicio);
  const fim = diaInteiro ? brazilDayRangeUtc(dataFim).fim : brazilDateTimeToUtc(dataFim, horaFim);
  if (fim <= inicio) return { error: "O fim precisa ser depois do início." };
  if (fim.getTime() - inicio.getTime() > MAX_DIAS * 86_400_000) return { error: `Bloqueie no máximo ${MAX_DIAS} dias de cada vez.` };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("bloqueios_agenda").insert({
    empresa_id: empresa.id,
    funcionario_id: funcionarioId,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    motivo,
    criado_por: staff.id,
  });
  if (error) return { error: "Não foi possível salvar o bloqueio." };

  // Bloquear não cancela o que já estava marcado — avisa para tratar à mão.
  let conflitos = supabase
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", empresa.id)
    .in("status", ["agendado", "confirmado"])
    .lt("data_hora_inicio", fim.toISOString())
    .gt("data_hora_fim", inicio.toISOString());
  if (funcionarioId) conflitos = conflitos.eq("funcionario_id", funcionarioId);
  const { count } = await conflitos;

  refresh();
  return {
    success: count
      ? `Bloqueio salvo. Atenção: há ${count} atendimento(s) marcado(s) nesse período — avise os clientes ou remarque.`
      : "Bloqueio salvo. Esses horários não aparecem mais para agendamento.",
  };
}

export async function removerBloqueio(bloqueioId: string) {
  await exigirEdicao("agenda");
  const supabase = await createSupabaseServerClient();
  // A RLS só deixa apagar o que a pessoa poderia ter criado.
  await supabase.from("bloqueios_agenda").delete().eq("id", bloqueioId);
  refresh();
}
