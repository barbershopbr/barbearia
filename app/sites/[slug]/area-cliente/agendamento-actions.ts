"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { avisarListaEspera } from "@/lib/agenda/lista-espera";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { ANTECEDENCIA_MINIMA_HORAS, clientePodeAlterar } from "@/lib/agenda/regras-cliente";
import { notificarEquipe } from "@/lib/push/enviar";

export async function cancelarAgendamentoCliente(slug: string, agendamentoId: string): Promise<{ error?: string }> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Barbearia não encontrada." };
  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) return { error: "Entre na sua conta para cancelar." };

  const supabase = await createSupabaseServerClient();
  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select("id, status, data_hora_inicio, funcionario_id")
    .eq("id", agendamentoId)
    .eq("cliente_id", cliente.id)
    .maybeSingle();
  if (!agendamento) return { error: "Agendamento não encontrado." };
  if (!clientePodeAlterar(agendamento)) {
    return { error: `Só é possível cancelar até ${ANTECEDENCIA_MINIMA_HORAS}h antes. Fale com a barbearia.` };
  }

  const { error } = await supabase.from("agendamentos").update({ status: "cancelado" }).eq("id", agendamentoId).eq("cliente_id", cliente.id);
  if (error) return { error: "Não foi possível cancelar. Tente novamente." };

  const admin = createSupabaseServiceRoleClient();
  await avisarListaEspera(admin, {
    empresaId: empresa.id,
    funcionarioId: agendamento.funcionario_id,
    inicioUtc: agendamento.data_hora_inicio,
  });
  const quando = new Date(agendamento.data_hora_inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  await notificarEquipe(admin, empresa.id, agendamento.funcionario_id, {
    titulo: "Cliente cancelou um horário",
    corpo: `${cliente.nome} · ${quando}`,
    url: "/admin/agenda",
  });
  refresh();
  return {};
}

/** Avaliação de um atendimento concluído do próprio cliente (uma vez; a RLS confere de novo). */
export async function avaliarAtendimento(slug: string, agendamentoId: string, nota: number, comentario: string): Promise<{ error?: string }> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Barbearia não encontrada." };
  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) return { error: "Entre na sua conta para avaliar." };
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return { error: "Escolha de 1 a 5 estrelas." };

  const supabase = await createSupabaseServerClient();
  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select("id, funcionario_id, status")
    .eq("id", agendamentoId)
    .eq("cliente_id", cliente.id)
    .maybeSingle();
  if (!agendamento || agendamento.status !== "concluido") return { error: "Só dá para avaliar atendimentos concluídos." };

  const { error } = await supabase.from("avaliacoes").insert({
    empresa_id: empresa.id,
    cliente_id: cliente.id,
    agendamento_id: agendamento.id,
    funcionario_id: agendamento.funcionario_id,
    nota,
    comentario: comentario.trim().slice(0, 1000) || null,
  });
  if (error) return { error: error.code === "23505" ? "Você já avaliou este atendimento." : "Não foi possível enviar a avaliação." };
  refresh();
  return {};
}
