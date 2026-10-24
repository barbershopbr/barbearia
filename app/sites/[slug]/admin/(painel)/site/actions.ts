"use server";

import { refresh } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaBySlug } from "@/lib/tenant/get-empresa";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { lerSiteConfig } from "@/lib/site/config";
import type { ActionState } from "../../../area-cliente/actions";

const COR_REGEX = /^#[0-9a-fA-F]{6}$/;

/** Aparência do site é do responsável/admin, como as Configurações. */
async function requireGestor(slug: string) {
  const empresa = await getEmpresaBySlug(slug);
  if (!empresa) return { error: "Empresa não encontrada." as const };
  const staff = await getCurrentStaff(empresa.id);
  if (!staff || (staff.role !== "owner" && staff.role !== "admin")) {
    return { error: "Só o responsável ou um admin pode alterar o site." as const };
  }
  return { empresa };
}

/** Aceita qualquer URL https (uploads do nosso Storage e links já existentes); vazio/inválido vira null. */
function urlImagem(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^https:\/\/\S+$/.test(s) ? s : null;
}

function cor(v: FormDataEntryValue | null, padrao: string): string {
  const s = String(v ?? "").trim();
  return COR_REGEX.test(s) ? s : padrao;
}

export async function salvarAparencia(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const check = await requireGestor(slug);
  if ("error" in check) return { error: check.error };
  const { empresa } = check;

  let secoes: unknown = [];
  try {
    secoes = JSON.parse(String(formData.get("secoes") ?? "[]"));
  } catch {
    // lerSiteConfig completa com o padrão
  }

  const siteConfig = lerSiteConfig({
    tema: String(formData.get("tema") ?? ""),
    corDestaque: String(formData.get("cor_destaque") ?? ""),
    hero: {
      titulo: String(formData.get("hero_titulo") ?? "").trim(),
      subtitulo: String(formData.get("hero_subtitulo") ?? "").trim(),
      botao: String(formData.get("hero_botao") ?? "").trim(),
    },
    secoes,
  });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("empresas")
    .update({
      logo_url: urlImagem(formData.get("logo_url")),
      banner_url: urlImagem(formData.get("banner_url")),
      favicon_url: urlImagem(formData.get("favicon_url")),
      cores: {
        primaria: cor(formData.get("cor_primaria"), "#171717"),
        secundaria: cor(formData.get("cor_secundaria"), "#404040"),
      },
      site_config: siteConfig,
    })
    .eq("id", empresa.id);

  if (error) return { error: "Não foi possível salvar a aparência." };
  refresh();
  return { success: "Site atualizado." };
}

export async function adicionarFotosGaleria(slug: string, urls: string[]): Promise<ActionState> {
  const check = await requireGestor(slug);
  if ("error" in check) return { error: check.error };

  const validas = urls.map((u) => urlImagem(u)).filter((u): u is string => !!u);
  if (validas.length === 0) return { error: "Nenhuma imagem válida." };

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("galeria_fotos")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", check.empresa.id);
  const inicio = count ?? 0;

  const { error } = await supabase
    .from("galeria_fotos")
    .insert(validas.map((url, i) => ({ empresa_id: check.empresa.id, url, ordem: inicio + i })));
  if (error) return { error: "Não foi possível salvar as fotos." };
  refresh();
  return { success: `${validas.length} foto(s) adicionada(s).` };
}

export async function atualizarLegendaFoto(fotoId: string, legenda: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("galeria_fotos").update({ legenda: legenda.trim() || null }).eq("id", fotoId);
  refresh();
}

export async function removerFotoGaleria(fotoId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("galeria_fotos").delete().eq("id", fotoId);
  refresh();
}

export async function salvarPromocao(
  slug: string,
  promocaoId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const check = await requireGestor(slug);
  if ("error" in check) return { error: check.error };

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return { error: "Informe o título da promoção." };

  const preco = (k: string) => {
    const v = String(formData.get(k) ?? "").trim().replace(",", ".");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const dados = {
    titulo,
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    imagem_url: urlImagem(formData.get("imagem_url")),
    preco_de: preco("preco_de"),
    preco_por: preco("preco_por"),
    validade: String(formData.get("validade") ?? "").trim() || null,
  };

  const supabase = await createSupabaseServerClient();
  const { error } = promocaoId
    ? await supabase.from("promocoes").update(dados).eq("id", promocaoId)
    : await supabase.from("promocoes").insert({ ...dados, empresa_id: check.empresa.id });

  if (error) return { error: "Não foi possível salvar a promoção." };
  refresh();
  return { success: "Promoção salva." };
}

export async function togglePromocaoAtiva(promocaoId: string, ativo: boolean) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("promocoes").update({ ativo: !ativo }).eq("id", promocaoId);
  refresh();
}

export async function removerPromocao(promocaoId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("promocoes").delete().eq("id", promocaoId);
  refresh();
}
