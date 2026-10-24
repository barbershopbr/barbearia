"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { whatsappBR } from "@/lib/tenant/nova-empresa";
import type { Horario } from "@/lib/agenda/available-slots";
import type { ActionState } from "../../../area-cliente/actions";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";

// Mesmas chaves usadas em lib/agenda/available-slots.ts e no site público.
const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;

export async function salvarConfiguracoes(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await exigirEdicao("configuracoes");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "O nome da barbearia é obrigatório." };

  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    if (!v) return null;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const horarios: Record<string, Horario> = {};
  for (const dia of DIAS) {
    const abre = String(formData.get(`${dia}_abre`) ?? "").trim() || "09:00";
    const fecha = String(formData.get(`${dia}_fecha`) ?? "").trim() || "18:00";
    const pausaInicio = String(formData.get(`${dia}_pausa_inicio`) ?? "").trim();
    const pausaFim = String(formData.get(`${dia}_pausa_fim`) ?? "").trim();
    horarios[dia] = { abre, fecha, fechado: formData.get(`${dia}_fechado`) === "on" };
    // Pausa só vale se estiver inteira e dentro do expediente.
    if (pausaInicio && pausaFim && pausaInicio < pausaFim && pausaInicio >= abre && pausaFim <= fecha) {
      horarios[dia].pausa_inicio = pausaInicio;
      horarios[dia].pausa_fim = pausaFim;
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("empresas")
    .update({
      nome,
      descricao: str("descricao"),
      cnpj: str("cnpj"),
      endereco: str("endereco"),
      latitude: num("latitude"),
      longitude: num("longitude"),
      telefone: str("telefone"),
      whatsapp: whatsappBR(String(formData.get("whatsapp") ?? "")),
      instagram: str("instagram"),
      horarios,
    })
    .eq("id", empresa.id);

  if (error) return { error: "Não foi possível salvar as configurações." };
  return { success: "Configurações salvas." };
}
