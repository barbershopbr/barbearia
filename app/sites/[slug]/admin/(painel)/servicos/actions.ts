"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import type { ActionState } from "../../../area-cliente/actions";

export async function createServico(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };

  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const preco = Number(formData.get("preco") ?? 0);
  const duracao = Number(formData.get("duracao_minutos") ?? 30);

  if (!nome || preco < 0 || duracao <= 0) return { error: "Preencha os dados corretamente." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("servicos").insert({
    empresa_id: empresa.id,
    nome,
    descricao,
    preco,
    duracao_minutos: duracao,
  });

  if (error) return { error: "Não foi possível criar o serviço." };

  return { success: "Serviço criado." };
}

// Next.js já re-renderiza os Server Components da página atual depois que
// uma Server Action chamada por um <form> termina — não precisa de
// revalidatePath aqui (as páginas deste projeto já são dinâmicas por usarem
// cookies() via createSupabaseServerClient).
export async function toggleServicoAtivo(servicoId: string, ativo: boolean) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("servicos").update({ ativo: !ativo }).eq("id", servicoId);
}

export async function deleteServico(servicoId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("servicos").delete().eq("id", servicoId);
}
