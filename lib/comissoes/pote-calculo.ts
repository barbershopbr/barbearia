/**
 * Cálculo do pote das assinaturas (ESCOPO.md §3) — funções puras, sem banco.
 *
 * Regra fixa:
 *   pote = mensalidades pagas no mês − parte da casa
 *   cada atendimento de assinante concluído gera pontos (peso do serviço)
 *   valor do ponto = pote ÷ total de pontos; barbeiro recebe pontos × valor
 *
 * Exemplo do escopo: R$1.000 pagos, casa 40% → pote R$600; João 880 pts,
 * Pedro 570 pts → ponto R$0,4138 → João R$364,14 · Pedro R$235,86.
 */

export type ConfigPote = {
  ativo: boolean;
  /** % da receita que fica com a casa (modo "única"). */
  casaPercentual: number;
  /** % da casa por barbeiro (funcionario_id → %); vazio = usa casaPercentual para todos. */
  casaPorBarbeiro: Record<string, number>;
  /** Como cada atendimento pontua. */
  peso: "valor" | "atendimentos" | "manual";
  /** Pontos por serviço quando peso = manual (servico_id → pontos). */
  pesosManuais: Record<string, number>;
  /** Um pote só ou um pote por plano de assinatura. */
  modo: "unico" | "por_plano";
  /** O que fazer quando sobra dinheiro sem atendimento para distribuir. */
  sobra: "casa" | "dividir" | "acumular";
  /** funcionario_id → participa? (ausente = participa). */
  participantes: Record<string, boolean>;
};

export const CONFIG_POTE_PADRAO: ConfigPote = {
  ativo: false,
  casaPercentual: 40,
  casaPorBarbeiro: {},
  peso: "valor",
  pesosManuais: {},
  modo: "unico",
  sobra: "casa",
  participantes: {},
};

const pct = (v: unknown, padrao: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : padrao;
};

export function lerConfigPote(raw: unknown): ConfigPote {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<ConfigPote>;
  const mapaNumeros = (m: unknown, validar: (n: number) => boolean) =>
    Object.fromEntries(
      Object.entries(m && typeof m === "object" ? (m as Record<string, unknown>) : {})
        .map(([k, v]) => [k, Number(v)] as const)
        .filter(([, n]) => Number.isFinite(n) && validar(n)),
    );
  return {
    ativo: o.ativo === true,
    casaPercentual: pct(o.casaPercentual, CONFIG_POTE_PADRAO.casaPercentual),
    casaPorBarbeiro: mapaNumeros(o.casaPorBarbeiro, (n) => n >= 0 && n <= 100),
    peso: o.peso === "atendimentos" || o.peso === "manual" ? o.peso : "valor",
    pesosManuais: mapaNumeros(o.pesosManuais, (n) => n >= 0),
    modo: o.modo === "por_plano" ? "por_plano" : "unico",
    sobra: o.sobra === "dividir" || o.sobra === "acumular" ? o.sobra : "casa",
    participantes: Object.fromEntries(
      Object.entries(o.participantes && typeof o.participantes === "object" ? o.participantes : {}).filter(([, v]) => typeof v === "boolean"),
    ) as Record<string, boolean>,
  };
}

export type ReceitaPote = { planoId: string; valor: number };
export type AtendimentoPote = { funcionarioId: string; servicoId: string; preco: number; planoId: string };
export type Profissional = { id: string; nome: string };

export type LinhaPote = { funcionarioId: string; nome: string; atendimentos: number; pontos: number; bruto: number; casa: number; valor: number };

export type ResultadoPote = {
  receita: number;
  /** Sobra de meses anteriores somada a este pote (modo acumular). */
  acumuladoAnterior: number;
  parteCasa: number;
  pote: number;
  totalPontos: number;
  valorPonto: number;
  distribuido: number;
  sobra: number;
  linhas: LinhaPote[];
};

const centavos = (v: number) => Math.round(v * 100) / 100;

function pontosDe(cfg: ConfigPote, a: AtendimentoPote): number {
  if (cfg.peso === "atendimentos") return 1;
  if (cfg.peso === "manual") return cfg.pesosManuais[a.servicoId] ?? a.preco;
  return a.preco;
}

/**
 * Calcula a distribuição do mês. `acumuladoAnterior` = sobra que veio de
 * meses anteriores (quando a regra é acumular).
 */
export function calcularPote(
  cfg: ConfigPote,
  dados: { receitas: ReceitaPote[]; atendimentos: AtendimentoPote[]; profissionais: Profissional[]; acumuladoAnterior: number },
): ResultadoPote {
  const participa = (id: string) => cfg.participantes[id] !== false;
  const profissionais = dados.profissionais.filter((p) => participa(p.id));
  const nome = new Map(dados.profissionais.map((p) => [p.id, p.nome]));
  const atendimentos = dados.atendimentos.filter((a) => participa(a.funcionarioId));
  const receita = centavos(dados.receitas.reduce((s, r) => s + r.valor, 0));
  const casaPorBarbeiro = Object.keys(cfg.casaPorBarbeiro).length > 0;

  // Potes: um só, ou um por plano (a sobra acumulada entra proporcional à receita).
  const grupos = new Map<string, { receita: number; atendimentos: AtendimentoPote[] }>();
  const chave = (planoId: string) => (cfg.modo === "por_plano" ? planoId : "unico");
  for (const r of dados.receitas) {
    const g = grupos.get(chave(r.planoId)) ?? { receita: 0, atendimentos: [] };
    g.receita += r.valor;
    grupos.set(chave(r.planoId), g);
  }
  for (const a of atendimentos) {
    const g = grupos.get(chave(a.planoId)) ?? { receita: 0, atendimentos: [] };
    g.atendimentos.push(a);
    grupos.set(chave(a.planoId), g);
  }

  const linhas = new Map<string, LinhaPote>();
  const linha = (id: string) => {
    let l = linhas.get(id);
    if (!l) {
      l = { funcionarioId: id, nome: nome.get(id) ?? "—", atendimentos: 0, pontos: 0, bruto: 0, casa: 0, valor: 0 };
      linhas.set(id, l);
    }
    return l;
  };

  let parteCasa = 0;
  let pote = 0;
  let sobra = 0;
  let totalPontos = 0;

  for (const g of grupos.values()) {
    const extra = receita > 0 ? (dados.acumuladoAnterior * g.receita) / receita : grupos.size === 1 ? dados.acumuladoAnterior : 0;
    const base = g.receita + extra;
    // Casa única: sai antes de dividir. Casa por barbeiro: sai da parte de cada um.
    const casaGrupo = casaPorBarbeiro ? 0 : (base * cfg.casaPercentual) / 100;
    const poteGrupo = base - casaGrupo;
    parteCasa += casaGrupo;
    pote += poteGrupo;

    const pontosGrupo = g.atendimentos.reduce((s, a) => s + pontosDe(cfg, a), 0);
    totalPontos += pontosGrupo;

    if (pontosGrupo === 0) {
      if (cfg.sobra === "dividir" && profissionais.length > 0) {
        for (const p of profissionais) linha(p.id).bruto += poteGrupo / profissionais.length;
      } else {
        sobra += poteGrupo;
      }
      continue;
    }
    const valorPontoGrupo = poteGrupo / pontosGrupo;
    for (const a of g.atendimentos) {
      const l = linha(a.funcionarioId);
      const pts = pontosDe(cfg, a);
      l.atendimentos += 1;
      l.pontos += pts;
      l.bruto += pts * valorPontoGrupo;
    }
  }

  // Casa por barbeiro (ou única = 0 aqui) e arredondamento a centavos.
  for (const l of linhas.values()) {
    const casaPct = casaPorBarbeiro ? (cfg.casaPorBarbeiro[l.funcionarioId] ?? cfg.casaPercentual) : 0;
    l.casa = (l.bruto * casaPct) / 100;
    l.valor = centavos(l.bruto - l.casa);
    l.bruto = centavos(l.bruto);
    l.casa = centavos(l.casa);
    l.pontos = centavos(l.pontos);
    parteCasa += l.casa;
  }

  // O arredondamento não pode criar nem sumir centavos: ajusta na maior parte.
  const lista = [...linhas.values()].sort((a, b) => b.valor - a.valor);
  const alvo = centavos(lista.reduce((s, l) => s + l.bruto - l.casa, 0));
  const somado = centavos(lista.reduce((s, l) => s + l.valor, 0));
  if (lista.length > 0 && somado !== alvo) lista[0].valor = centavos(lista[0].valor + (alvo - somado));

  const distribuido = centavos(lista.reduce((s, l) => s + l.valor, 0));
  return {
    receita,
    acumuladoAnterior: centavos(dados.acumuladoAnterior),
    parteCasa: centavos(parteCasa),
    pote: centavos(pote),
    totalPontos: centavos(totalPontos),
    valorPonto: totalPontos > 0 ? pote / totalPontos : 0,
    distribuido,
    sobra: centavos(sobra),
    linhas: lista,
  };
}
