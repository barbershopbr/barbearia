"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";

export async function responderAvaliacao(avaliacaoId: string, formData: FormData) {
  await exigirEdicao("avaliacoes");
  const resposta = String(formData.get("resposta") ?? "").trim().slice(0, 1000) || null;
  const supabase = await createSupabaseServerClient();
  await supabase.from("avaliacoes").update({ resposta }).eq("id", avaliacaoId);
  refresh();
}

export async function alternarPublicacao(avaliacaoId: string, publicada: boolean) {
  await exigirEdicao("avaliacoes");
  const supabase = await createSupabaseServerClient();
  await supabase.from("avaliacoes").update({ publicada: !publicada }).eq("id", avaliacaoId);
  refresh();
}
