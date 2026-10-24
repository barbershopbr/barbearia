"use server";

import { redirect } from "next/navigation";
import { PLANOS_SAAS } from "@/lib/plano/recursos";
import { criarEmpresaComResponsavel, motivoSlugInvalido, slugDisponivel } from "@/lib/tenant/nova-empresa";
import { tenantOrigin } from "@/lib/tenant/domain";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email/send";
import type { PlanoSaas } from "@/lib/supabase/types";
import { dentroDoLimite, MSG_LIMITE } from "@/lib/seguranca/limite";

export type CadastroState = { error?: string; campo?: string } | null;

/** Consulta ao vivo enquanto a pessoa digita o endereço do site. */
export async function checarSlug(slug: string): Promise<{ ok: boolean; motivo?: string }> {
  const s = slug.trim().toLowerCase();
  const invalido = motivoSlugInvalido(s);
  if (invalido) return { ok: false, motivo: invalido };
  return (await slugDisponivel(s)) ? { ok: true } : { ok: false, motivo: "Esse endereço já está em uso." };
}

/**
 * Autocadastro da barbearia pelo site do BarberControl: cria a empresa e o
 * login do responsável e libera o painel na hora. A cobrança recorrente do
 * plano entra aqui quando a integração de pagamento do SaaS estiver ativa
 * (Etapa 2 do ESCOPO.md) — até lá, o Master acompanha os novos cadastros.
 */
export async function cadastrarBarbearia(_prev: CadastroState, formData: FormData): Promise<CadastroState> {
  if (!(await dentroDoLimite("cadastro-barbearia", 3, 3600))) return { error: MSG_LIMITE };
  const nome = String(formData.get("nome") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const plano = String(formData.get("plano") ?? "") as PlanoSaas;
  const responsavel = String(formData.get("responsavel") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");

  // Campo escondido que pessoas não preenchem — barra robôs simples.
  if (String(formData.get("site_web") ?? "")) return { error: "Não foi possível concluir o cadastro." };

  if (nome.length < 2) return { error: "Informe o nome da barbearia.", campo: "nome" };
  const slugInvalido = motivoSlugInvalido(slug);
  if (slugInvalido) return { error: slugInvalido, campo: "slug" };
  if (!(plano in PLANOS_SAAS)) return { error: "Escolha um plano.", campo: "plano" };
  if (!responsavel) return { error: "Informe o seu nome.", campo: "responsavel" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido.", campo: "email" };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres.", campo: "password" };
  if (formData.get("aceite") !== "on") return { error: "É preciso aceitar os termos de uso.", campo: "aceite" };
  if (!(await slugDisponivel(slug))) return { error: "Esse endereço já está em uso. Escolha outro.", campo: "slug" };

  const resultado = await criarEmpresaComResponsavel({
    nome,
    slug,
    plano,
    telefone,
    responsavel: { nome: responsavel, email, password },
  });
  if ("error" in resultado) {
    return { error: resultado.error.includes("e-mail") ? "Este e-mail já tem cadastro. Use outro e-mail." : resultado.error };
  }

  const site = tenantOrigin(slug);
  await sendEmail({
    to: email,
    subject: `Bem-vindo ao BarberControl, ${nome}!`,
    text: `Sua barbearia está no ar.\n\nSite: ${site}\nPainel: ${site}/admin/login\nLogin: ${email}\n\nPrimeiros passos: cadastre serviços e equipe, escolha o tema em "Aparência do site" e divulgue o link.`,
    html: emailLayout({
      titulo: "Sua barbearia está no ar!",
      corpo: `<p>Olá, ${escapeHtml(responsavel)}! A <strong>${escapeHtml(nome)}</strong> já tem site e painel.</p>
<p>Site para os clientes: <a href="${escapeHtml(site)}">${escapeHtml(site)}</a><br>Login do painel: ${escapeHtml(email)}</p>
<p>Primeiros passos: cadastre serviços e equipe, escolha o tema em <em>Aparência do site</em> e divulgue o link.</p>`,
      botao: { texto: "Abrir meu painel", url: `${site}/admin/login` },
    }),
  });

  // A sessão não é compartilhada entre o domínio principal e o subdomínio da
  // barbearia, então o responsável entra pelo login do próprio painel.
  redirect(`${site}/admin/login?bemvindo=1&email=${encodeURIComponent(email)}`);
}
