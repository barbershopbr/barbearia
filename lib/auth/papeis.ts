import type { UsuarioEmpresa, UsuarioEmpresaRole } from "@/lib/supabase/types";

/**
 * Permissões da equipe no painel admin. O dono decide, por funcionário e por
 * seção, se ele não acessa, só vê ou vê e edita (usuarios_empresa.permissions).
 * O papel serve só como modelo inicial; owner/admin sempre podem tudo.
 *
 * Seção = primeiro segmento depois de /admin ("" = dashboard). Toda página
 * nova do admin precisa entrar em SECOES.
 */
export type Nivel = "ver" | "editar";
export type Permissoes = Record<string, Nivel>;

export const SECOES: { id: string; label: string }[] = [
  { id: "", label: "Dashboard" },
  { id: "agenda", label: "Agenda" },
  { id: "clientes", label: "Clientes" },
  { id: "servicos", label: "Serviços" },
  { id: "funcionarios", label: "Funcionários" },
  { id: "pedidos", label: "Pedidos da loja" },
  { id: "produtos", label: "Produtos e estoque" },
  { id: "fornecedores", label: "Fornecedores" },
  { id: "planos", label: "Planos de assinatura" },
  { id: "assinaturas", label: "Assinaturas de clientes" },
  { id: "cupons", label: "Cupons" },
  { id: "fidelidade", label: "Fidelidade" },
  { id: "comissoes", label: "Comissões" },
  { id: "pote", label: "Pote das assinaturas" },
  { id: "financeiro", label: "Financeiro" },
  { id: "pagamentos", label: "Recebimentos (Mercado Pago)" },
  { id: "notas-fiscais", label: "Notas fiscais (Bling)" },
  { id: "site", label: "Aparência do site" },
  { id: "dominio", label: "Domínio" },
  { id: "configuracoes", label: "Configurações" },
];

/**
 * Permissões que não são uma página do menu. "agenda-equipe": ver/editar os
 * atendimentos de todos os profissionais — sem ela, a pessoa só enxerga e
 * mexe na própria agenda (perfil vinculado em Funcionários).
 */
export const PERMISSOES_EXTRAS: { id: string; label: string }[] = [
  { id: "agenda-equipe", label: "Agenda de toda a equipe (sem isso, só a própria)" },
];

/** Tudo que aparece no diálogo de permissões, na ordem. */
export const ITENS_PERMISSAO = [...SECOES.slice(0, 2), ...PERMISSOES_EXTRAS, ...SECOES.slice(2)];

/** Sempre liberada: cada um vê os próprios atendimentos e comissões. */
const SECAO_PESSOAL = "meu-historico";

export const PAPEL_LABEL: Record<UsuarioEmpresaRole, string> = {
  owner: "Responsável",
  admin: "Administrador",
  recepcionista: "Recepcionista",
  barbeiro: "Barbeiro",
};

/** Papéis que o dono pode dar a alguém da equipe (owner só nasce pelo Master). */
export const PAPEIS_ATRIBUIVEIS: UsuarioEmpresaRole[] = ["barbeiro", "recepcionista", "admin"];

/** Modelo inicial de cada papel — o dono ajusta depois em Funcionários → Permissões. */
export const PERMISSOES_PADRAO: Record<"barbeiro" | "recepcionista", Permissoes> = {
  barbeiro: { agenda: "editar", clientes: "ver" },
  recepcionista: { "": "ver", agenda: "editar", "agenda-equipe": "editar", clientes: "editar", pedidos: "editar", assinaturas: "ver", servicos: "ver", produtos: "ver" },
};

type StaffPerm = Pick<UsuarioEmpresa, "role" | "permissions">;

function ehGestor(staff: StaffPerm): boolean {
  return staff.role === "owner" || staff.role === "admin";
}

/** Permissões efetivas: as salvas pelo dono ou, se nunca salvas, o modelo do papel. */
export function permissoesDe(staff: StaffPerm): Permissoes {
  const salvas = (staff.permissions as { secoes?: unknown } | null)?.secoes;
  if (salvas && typeof salvas === "object") {
    const limpas: Permissoes = {};
    for (const [secao, nivel] of Object.entries(salvas)) {
      if (nivel === "ver" || nivel === "editar") limpas[secao] = nivel;
    }
    return limpas;
  }
  return staff.role === "barbeiro" || staff.role === "recepcionista" ? PERMISSOES_PADRAO[staff.role] : {};
}

export function nivelSecao(staff: StaffPerm, secao: string): Nivel | null {
  if (ehGestor(staff) || secao === SECAO_PESSOAL) return "editar";
  return permissoesDe(staff)[secao] ?? null;
}

export function podeAcessarSecao(staff: StaffPerm, secao: string): boolean {
  return nivelSecao(staff, secao) !== null;
}

/** Primeira seção liberada — destino quando a pessoa abre algo proibido. */
export function secaoInicial(staff: StaffPerm): string {
  if (ehGestor(staff)) return "";
  return SECOES.find((s) => podeAcessarSecao(staff, s.id))?.id ?? SECAO_PESSOAL;
}

/** Extrai a seção de um caminho interno: /sites/x/admin/agenda/123 → "agenda". */
export function secaoDoCaminho(caminho: string): string | null {
  // O lookahead evita casar com um slug que comece com "admin" (/sites/admin-x/...).
  const m = /\/admin(?:\/([^/?#]*))?(?=$|[/?#])/.exec(caminho);
  return m ? (m[1] ?? "") : null;
}
