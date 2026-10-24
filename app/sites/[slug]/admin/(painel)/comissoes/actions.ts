"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { RegraComissaoTipo } from "@/lib/supabase/types";
import { exigirRecurso } from "@/lib/plano/recursos";

export async function salvarRegraComissao(
  slug: string,
  funcionarioId: string,
  tipo: RegraComissaoTipo,
  valor: number,
) {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return;
  exigirRecurso(empresa, "comissoes");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("regras_comissao")
    .upsert(
      { empresa_id: empresa.id, funcionario_id: funcionarioId, tipo, valor, ativo: true },
      { onConflict: "empresa_id,funcionario_id" },
    );
}

export async function marcarComissaoPaga(comissaoId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("comissoes").update({ status: "pago" }).eq("id", comissaoId);
}

/** Lançamento manual de comissão pra regras que não são por atendimento (diária/mensal) — o dono decide quando lançar. */
export async function lancarComissaoManual(
  slug: string,
  funcionarioId: string,
  tipo: "diaria" | "mensal",
  valor: number,
) {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return;
  exigirRecurso(empresa, "comissoes");

  const supabase = await createSupabaseServerClient();
  await supabase.from("comissoes").insert({
    empresa_id: empresa.id,
    funcionario_id: funcionarioId,
    tipo,
    valor,
    periodo_pagamento: tipo === "diaria" ? "semanal" : "mensal",
    status: "pendente",
  });
}
