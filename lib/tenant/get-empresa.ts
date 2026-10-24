import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Empresa } from "@/lib/supabase/types";

/**
 * Busca a empresa pelo slug do subdomínio atual.
 *
 * Usa `cache()` do React só para deduplicar a query dentro da MESMA
 * requisição (várias Server Components pedindo a mesma empresa). Isso NÃO é
 * um cache entre requisições/usuários — a query roda com o client
 * autenticado da requisição (respeita RLS: anônimo só vê empresa "ativo",
 * staff vê a própria empresa mesmo "inativo"/"bloqueado"). Nunca trocar isso
 * por `unstable_cache`/`fetch` com revalidate sem ter certeza de que o
 * resultado independe do usuário logado — senão dados de uma sessão vazam
 * para outra.
 */
export const getEmpresaBySlug = cache(async (slug: string): Promise<Empresa | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar empresa por slug", slug, error);
    return null;
  }

  return data;
});
