"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { ANTECEDENCIA_MINIMA_HORAS, clientePodeAlterar } from "@/lib/agenda/regras-cliente";

export async function cancelarAgendamentoCliente(slug: string, agendamentoId: string): Promise<{ error?: string }> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Barbearia não encontrada." };
  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) return { error: "Entre na sua conta para cancelar." };

  const supabase = await createSupabaseServerClient();
  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select("id, status, data_hora_inicio")
    .eq("id", agendamentoId)
    .eq("cliente_id", cliente.id)
    .maybeSingle();
  if (!agendamento) return { error: "Agendamento não encontrado." };
  if (!clientePodeAlterar(agendamento)) {
    return { error: `Só é possível cancelar até ${ANTECEDENCIA_MINIMA_HORAS}h antes. Fale com a barbearia.` };
  }

  const { error } = await supabase.from("agendamentos").update({ status: "cancelado" }).eq("id", agendamentoId).eq("cliente_id", cliente.id);
  if (error) return { error: "Não foi possível cancelar. Tente novamente." };

  refresh();
  return {};
}
