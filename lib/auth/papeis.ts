import type { UsuarioEmpresaRole } from "@/lib/supabase/types";

/**
 * O que cada papel da equipe acessa no painel admin, por seção
 * (primeiro segmento depois de /admin; "" = dashboard).
 *
 * Isto controla menu e páginas. A RLS do banco ainda libera as tabelas para
 * qualquer staff ativo — restringir também no banco (ex.: barbeiro só ver a
 * própria agenda) é o próximo passo do escopo "Login do barbeiro".
 */
const SECOES_POR_PAPEL: Record<UsuarioEmpresaRole, readonly string[] | "todas"> = {
  owner: "todas",
  admin: "todas",
  recepcionista: ["", "agenda", "clientes", "pedidos", "assinaturas", "meu-historico"],
  barbeiro: ["agenda", "clientes", "meu-historico"],
};

export const PAPEL_LABEL: Record<UsuarioEmpresaRole, string> = {
  owner: "Responsável",
  admin: "Administrador",
  recepcionista: "Recepcionista",
  barbeiro: "Barbeiro",
};

/** Papéis que o dono pode dar a alguém da equipe (owner só nasce pelo Master). */
export const PAPEIS_ATRIBUIVEIS: UsuarioEmpresaRole[] = ["barbeiro", "recepcionista", "admin"];

/** `secao` é o trecho do caminho depois de /admin: "", "agenda", "financeiro"... */
export function podeAcessarSecao(papel: UsuarioEmpresaRole, secao: string): boolean {
  const permitidas = SECOES_POR_PAPEL[papel];
  return permitidas === "todas" || permitidas.includes(secao);
}

/** Primeira seção liberada para o papel — destino quando ele abre algo proibido. */
export function secaoInicial(papel: UsuarioEmpresaRole): string {
  const permitidas = SECOES_POR_PAPEL[papel];
  return permitidas === "todas" ? "" : permitidas[0];
}

/** Extrai a seção de um caminho interno: /sites/x/admin/agenda/123 → "agenda". */
export function secaoDoCaminho(caminho: string): string | null {
  // O lookahead evita casar com um slug que comece com "admin" (/sites/admin-x/...).
  const m = /\/admin(?:\/([^/?#]*))?(?=$|[/?#])/.exec(caminho);
  return m ? (m[1] ?? "") : null;
}
