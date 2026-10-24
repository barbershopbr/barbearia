/**
 * Layout do site público de cada barbearia (coluna empresas.site_config).
 * O dono edita em Admin → Aparência do site. Sempre ler via lerSiteConfig():
 * o JSON salvo pode ser parcial ou de uma versão antiga, e aqui ele é
 * completado com os padrões.
 */

export type TemaSite = "classico" | "moderno" | "minimal";

export type SecaoSite = "promocoes" | "servicos" | "produtos" | "equipe" | "galeria" | "avaliacoes" | "planos" | "contato";

export type SiteConfig = {
  tema: TemaSite;
  /** Cor de botões e destaques (a primária fica no topo/fundo). */
  corDestaque: string;
  hero: {
    /** Vazio = usa o nome da barbearia. */
    titulo: string;
    /** Vazio = usa a descrição da barbearia. */
    subtitulo: string;
    botao: string;
  };
  secoes: { id: SecaoSite; visivel: boolean }[];
};

export const TEMAS: Record<TemaSite, { nome: string; descricao: string }> = {
  classico: { nome: "Clássico", descricao: "Topo escuro com foto de fundo e logo centralizado." },
  moderno: { nome: "Moderno", descricao: "Topo dividido: texto de um lado, foto grande do outro." },
  minimal: { nome: "Minimalista", descricao: "Fundo claro, tipografia limpa e muito espaço em branco." },
};

export const SECOES_LABEL: Record<SecaoSite, string> = {
  promocoes: "Promoções",
  servicos: "Serviços",
  produtos: "Produtos",
  equipe: "Equipe",
  galeria: "Galeria de fotos",
  avaliacoes: "Avaliações dos clientes",
  planos: "Planos de assinatura",
  contato: "Horários e contato",
};

const ORDEM_PADRAO: SecaoSite[] = ["promocoes", "servicos", "equipe", "galeria", "avaliacoes", "produtos", "planos", "contato"];

export const SITE_CONFIG_PADRAO: SiteConfig = {
  tema: "classico",
  corDestaque: "#c8a24a",
  hero: { titulo: "", subtitulo: "", botao: "Agendar horário" },
  secoes: ORDEM_PADRAO.map((id) => ({ id, visivel: true })),
};

const COR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function lerSiteConfig(raw: unknown): SiteConfig {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<SiteConfig> & { hero?: Partial<SiteConfig["hero"]> };
  const tema = obj.tema && obj.tema in TEMAS ? obj.tema : SITE_CONFIG_PADRAO.tema;
  const corDestaque = typeof obj.corDestaque === "string" && COR_REGEX.test(obj.corDestaque) ? obj.corDestaque : SITE_CONFIG_PADRAO.corDestaque;
  const str = (v: unknown, padrao: string) => (typeof v === "string" ? v.slice(0, 200) : padrao);

  // Mantém a ordem salva, descarta ids desconhecidos/duplicados e acrescenta
  // no fim seções novas que ainda não existiam quando a config foi salva.
  const vistas = new Set<SecaoSite>();
  const secoes: SiteConfig["secoes"] = [];
  for (const s of Array.isArray(obj.secoes) ? obj.secoes : []) {
    if (s && s.id in SECOES_LABEL && !vistas.has(s.id)) {
      vistas.add(s.id);
      secoes.push({ id: s.id, visivel: s.visivel !== false });
    }
  }
  for (const id of ORDEM_PADRAO) if (!vistas.has(id)) secoes.push({ id, visivel: true });

  return {
    tema,
    corDestaque,
    hero: {
      titulo: str(obj.hero?.titulo, ""),
      subtitulo: str(obj.hero?.subtitulo, ""),
      botao: str(obj.hero?.botao, "") || SITE_CONFIG_PADRAO.hero.botao,
    },
    secoes,
  };
}

/** Preto ou branco, o que tiver mais contraste sobre a cor (para texto de botões de destaque). */
export function corTextoSobre(hex: string): "#000000" | "#ffffff" {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return "#ffffff";
  const [r, g, b] = m.slice(1).map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // 0,179: ponto em que preto e branco têm o mesmo contraste (WCAG).
  return luminancia > 0.179 ? "#000000" : "#ffffff";
}
