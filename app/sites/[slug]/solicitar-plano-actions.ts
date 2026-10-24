"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentCliente } from "@/lib/auth/current-cliente";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { temRecurso } from "@/lib/plano/recursos";

export async function solicitarPlano(slug: string, planoId: string): Promise<{ error?: string; success?: string }> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  if (!temRecurso(empresa, "assinaturas")) return { error: "Esta barbearia não oferece planos de assinatura." };

  const cliente = await getCurrentCliente(empresa.id);
  if (!cliente) return { error: "Faça login para solicitar um plano." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("assinaturas_clientes").insert({
    empresa_id: empresa.id,
    cliente_id: cliente.id,
    plano_id: planoId,
    status: "pendente",
  });

  if (error) return { error: "Não foi possível solicitar o plano." };

  return { success: "Solicitação enviada! A barbearia vai confirmar em breve." };
}
