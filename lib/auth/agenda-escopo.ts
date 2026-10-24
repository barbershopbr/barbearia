import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nivelSecao } from "@/lib/auth/papeis";
import type { UsuarioEmpresa } from "@/lib/supabase/types";

/**
 * De quais profissionais a pessoa enxerga/mexe na agenda.
 * - "equipe": todos (responsável/admin, ou quem o dono liberou "agenda-equipe").
 * - "propria": só o funcionário vinculado ao login (funcionarios.usuario_empresa_id);
 *   funcionarioId null = login sem perfil vinculado, não vê atendimento nenhum.
 */
export type EscopoAgenda =
  | { tipo: "equipe"; podeEditarEquipe: boolean }
  | { tipo: "propria"; funcionarioId: string | null };

export async function escopoAgenda(staff: Pick<UsuarioEmpresa, "id" | "role" | "permissions" | "empresa_id">): Promise<EscopoAgenda> {
  const nivel = nivelSecao(staff, "agenda-equipe");
  if (nivel) return { tipo: "equipe", podeEditarEquipe: nivel === "editar" };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("funcionarios")
    .select("id")
    .eq("empresa_id", staff.empresa_id)
    .eq("usuario_empresa_id", staff.id)
    .maybeSingle();
  return { tipo: "propria", funcionarioId: data?.id ?? null };
}

/** Pode alterar atendimentos deste profissional? */
export function podeMexerNoProfissional(escopo: EscopoAgenda, funcionarioId: string): boolean {
  return escopo.tipo === "equipe" ? escopo.podeEditarEquipe : escopo.funcionarioId === funcionarioId;
}
