import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { createStaffAccount } from "@/lib/auth/staff-management";
import type { PlanoSaas } from "@/lib/supabase/types";

export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Subdomínios que não podem virar barbearia (rotas da plataforma e nomes enganosos). */
const SLUGS_RESERVADOS = new Set([
  "www", "master", "admin", "api", "app", "painel", "suporte", "ajuda", "blog", "mail", "email", "smtp",
  "ftp", "cdn", "static", "assets", "status", "cadastro", "login", "conta", "pagamento", "pagamentos",
  "barbercontrol", "usebrcontrol", "teste", "demo",
]);

// Horário padrão só para a barbearia já nascer com agenda funcionando — o dono
// ajusta em Configurações depois.
export const HORARIOS_PADRAO = {
  segunda: { abre: "09:00", fecha: "19:00", fechado: false },
  terca: { abre: "09:00", fecha: "19:00", fechado: false },
  quarta: { abre: "09:00", fecha: "19:00", fechado: false },
  quinta: { abre: "09:00", fecha: "19:00", fechado: false },
  sexta: { abre: "09:00", fecha: "19:00", fechado: false },
  sabado: { abre: "09:00", fecha: "17:00", fechado: false },
  domingo: { abre: "09:00", fecha: "13:00", fechado: true },
};

/** Número para links wa.me: só dígitos e com o 55 do Brasil quando vier só DDD + número. */
export function whatsappBR(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, "");
  if (!digitos) return null;
  return digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
}

/** "Barbearia do Zé Ávila" -> "barbearia-do-ze-avila" */
export function slugDeNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function motivoSlugInvalido(slug: string): string | null {
  if (slug.length < 3) return "Use pelo menos 3 caracteres.";
  if (slug.length > 40) return "Use no máximo 40 caracteres.";
  if (!SLUG_REGEX.test(slug)) return "Use só letras minúsculas, números e hífens.";
  if (SLUGS_RESERVADOS.has(slug)) return "Esse endereço é reservado. Escolha outro.";
  return null;
}

export async function slugDisponivel(slug: string): Promise<boolean> {
  const admin = createSupabaseServiceRoleClient();
  // Inclui empresas inativas/excluídas: o slug continua ocupado.
  const { count } = await admin.from("empresas").select("id", { count: "exact", head: true }).eq("slug", slug);
  return (count ?? 0) === 0;
}

/**
 * Cria a barbearia com o responsável (owner). Usado pelo Master e pelo
 * autocadastro do site. Desfaz a empresa se a conta do responsável falhar.
 */
export async function criarEmpresaComResponsavel(input: {
  nome: string;
  slug: string;
  plano: PlanoSaas;
  telefone?: string | null;
  responsavel: { nome: string; email: string; password: string };
}): Promise<{ error: string } | { empresaId: string }> {
  const admin = createSupabaseServiceRoleClient();
  const { data: empresa, error } = await admin
    .from("empresas")
    .insert({
      nome: input.nome,
      slug: input.slug,
      plano_saas: input.plano,
      telefone: input.telefone ?? null,
      whatsapp: input.telefone ? whatsappBR(input.telefone) : null,
      horarios: HORARIOS_PADRAO,
    })
    .select("id")
    .single();

  if (error || !empresa) return { error: "Não foi possível criar a barbearia (endereço já em uso?)." };

  const staff = await createStaffAccount(empresa.id, { ...input.responsavel, role: "owner" });
  if (staff.error) {
    await admin.from("empresas").delete().eq("id", empresa.id);
    return { error: staff.error };
  }
  return { empresaId: empresa.id };
}
