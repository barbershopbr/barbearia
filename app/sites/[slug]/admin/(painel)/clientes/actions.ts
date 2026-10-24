"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { SEM_EMAIL_SUFIXO, syntheticAuthEmail } from "@/lib/auth/cliente-identity";
import type { ActionState } from "../../../area-cliente/actions";
import { exigirEdicao } from "@/lib/auth/exigir-permissao";

/**
 * Cadastro/edição de cliente pela equipe (atendimento no balcão).
 *
 * Criar segue o mesmo modelo do autocadastro (conta de login com e-mail
 * sintético por barbearia) com senha aleatória: se o cliente quiser usar o
 * site depois, faz "Esqueci minha senha" com o e-mail informado. Sem e-mail,
 * o cadastro existe só para a agenda/histórico (não consegue logar).
 * Na edição, o e-mail não muda (é a chave do login).
 */
export async function salvarCliente(
  slug: string,
  clienteId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await exigirEdicao("clientes");
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." };
  if (!(await getCurrentStaff(empresa.id))) return { error: "Sem permissão." };

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  if (!nome) return { error: "Informe o nome." };

  if (clienteId) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("clientes")
      .update({ nome, telefone })
      .eq("id", clienteId)
      .eq("empresa_id", empresa.id);
    if (error) return { error: "Não foi possível salvar." };
    refresh();
    return { success: "Cliente atualizado." };
  }

  const emailInformado = String(formData.get("email") ?? "").trim().toLowerCase();
  if (emailInformado && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInformado)) return { error: "E-mail inválido." };
  if (!emailInformado && !telefone) return { error: "Informe ao menos o e-mail ou o telefone." };
  const email = emailInformado || `${randomBytes(8).toString("hex")}${SEM_EMAIL_SUFIXO}`;

  const admin = createSupabaseServiceRoleClient();
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email: syntheticAuthEmail(empresa.id, email),
    password: randomBytes(18).toString("base64url"),
    email_confirm: true,
    user_metadata: { empresa_id: empresa.id, real_email: email, cadastro_balcao: true },
  });
  if (erroAuth || !criado.user) return { error: "Já existe um cliente com esse e-mail nesta barbearia." };

  const { error } = await admin
    .from("clientes")
    .insert({ empresa_id: empresa.id, auth_user_id: criado.user.id, email, nome, telefone });
  if (error) {
    await admin.auth.admin.deleteUser(criado.user.id);
    return { error: "Não foi possível cadastrar o cliente." };
  }

  refresh();
  return {
    success: emailInformado
      ? "Cliente cadastrado. Para usar o site, ele faz \"Esqueci minha senha\" com esse e-mail."
      : "Cliente cadastrado.",
  };
}
