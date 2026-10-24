import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Empresa, PlanoSaas } from "@/lib/supabase/types";

/**
 * Recursos liberados por plano do SaaS (ESCOPO.md, "Planos do SaaS").
 *
 * O núcleo (agenda, clientes, serviços, equipe, configurações) não aparece
 * aqui porque está em todos os planos. Recursos futuros (várias unidades,
 * relatórios avançados, temas extras, caixa/PDV) entram neste mapa quando
 * forem construídos.
 */
export type Recurso =
  | "loja"
  | "cupons"
  | "fidelidade"
  | "comissoes"
  | "financeiro"
  | "assinaturas"
  | "caixa"
  | "dominio_proprio";

export const PLANOS_SAAS: Record<PlanoSaas, { nome: string; preco: number }> = {
  basico: { nome: "Básico", preco: 99 },
  pro: { nome: "Pro", preco: 149 },
  premium: { nome: "Premium", preco: 199 },
};

const ORDEM_PLANOS: PlanoSaas[] = ["basico", "pro", "premium"];

/** Plano mais barato que inclui cada recurso. */
const PLANO_MINIMO: Record<Recurso, PlanoSaas> = {
  loja: "pro",
  cupons: "pro",
  fidelidade: "pro",
  comissoes: "pro",
  financeiro: "pro",
  assinaturas: "pro",
  caixa: "pro",
  dominio_proprio: "premium",
};

export const RECURSO_LABEL: Record<Recurso, string> = {
  loja: "Loja e estoque",
  cupons: "Cupons",
  fidelidade: "Fidelidade",
  comissoes: "Comissões",
  financeiro: "Financeiro",
  assinaturas: "Assinaturas de clientes",
  caixa: "Caixa / PDV",
  dominio_proprio: "Domínio próprio",
};

export function planoMinimo(recurso: Recurso): PlanoSaas {
  return PLANO_MINIMO[recurso];
}

type EmpresaPlano = Pick<Empresa, "plano_saas" | "recursos_extras">;

export function temRecurso(empresa: EmpresaPlano, recurso: Recurso): boolean {
  const extra = empresa.recursos_extras?.[recurso];
  if (typeof extra === "boolean") return extra;
  return ORDEM_PLANOS.indexOf(empresa.plano_saas) >= ORDEM_PLANOS.indexOf(PLANO_MINIMO[recurso]);
}

/** Variante de temRecurso para quando só se tem o id (helpers de lib/ chamados de vários pontos). */
export async function empresaTemRecurso(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  recurso: Recurso,
): Promise<boolean> {
  const { data } = await supabase
    .from("empresas")
    .select("plano_saas, recursos_extras")
    .eq("id", empresaId)
    .maybeSingle();
  return !!data && temRecurso(data, recurso);
}

/**
 * Trava de servidor para Server Actions: o menu e as páginas já escondem o
 * recurso, isto impede chamar a action direto. Lança erro (em vez de
 * retornar ActionState) para servir tanto em actions com estado quanto nas
 * que retornam void.
 */
export function exigirRecurso(empresa: EmpresaPlano, recurso: Recurso): void {
  if (!temRecurso(empresa, recurso)) {
    throw new Error(`Recurso "${RECURSO_LABEL[recurso]}" não incluso no plano atual.`);
  }
}
