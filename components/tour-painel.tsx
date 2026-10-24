"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type PassoTour = {
  titulo: string;
  texto: string;
  /** Valor de data-tour do elemento a destacar; sem alvo = balão no centro da tela. */
  alvo?: string;
};

/** Evento para reabrir o tutorial de qualquer lugar (botão "Ver tutorial"). */
export const EVENTO_ABRIR_TUTORIAL = "abrir-tutorial";

const MARGEM = 8;
const LARGURA_BALAO = 320;

type Caixa = { top: number; left: number; width: number; height: number };

/**
 * Tutorial guiado do painel: escurece a tela, dá um "zoom" no botão da vez e
 * mostra um balão com Voltar / Próximo / Pular. Passos cujo alvo não existe
 * na tela (ex.: seção sem permissão ou fora do plano) são pulados sozinhos.
 */
export function TourPainel({
  passos,
  iniciarAberto,
  aoConcluir,
}: {
  passos: PassoTour[];
  iniciarAberto: boolean;
  aoConcluir: () => Promise<void>;
}) {
  const [aberto, setAberto] = useState(iniciarAberto);
  const [visiveis, setVisiveis] = useState<PassoTour[]>([]);
  const [indice, setIndice] = useState(0);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const concluido = useRef(false);

  // Só os passos com alvo presente na tela (lido ao abrir).
  useEffect(() => {
    if (!aberto) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende do DOM já montado
    setVisiveis(passos.filter((p) => !p.alvo || document.querySelector(`[data-tour="${p.alvo}"]`)));
    setIndice(0);
  }, [aberto, passos]);

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener(EVENTO_ABRIR_TUTORIAL, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_TUTORIAL, abrir);
  }, []);

  const passo = visiveis[indice];

  const medir = useCallback(() => {
    if (!passo?.alvo) return setCaixa(null);
    const el = document.querySelector<HTMLElement>(`[data-tour="${passo.alvo}"]`);
    if (!el) return setCaixa(null);
    const r = el.getBoundingClientRect();
    setCaixa({ top: r.top - MARGEM / 2, left: r.left - MARGEM / 2, width: r.width + MARGEM, height: r.height + MARGEM });
  }, [passo]);

  useLayoutEffect(() => {
    if (!aberto || !passo) return;
    document.querySelector(`[data-tour="${passo.alvo}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    // Mede no próximo quadro e de novo depois da rolagem suave.
    const quadro = requestAnimationFrame(medir);
    const t = setTimeout(medir, 250);
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(t);
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [aberto, passo, medir]);

  const fechar = useCallback(() => {
    setAberto(false);
    if (!concluido.current) {
      concluido.current = true;
      void aoConcluir();
    }
  }, [aoConcluir]);

  const proximo = useCallback(() => (indice < visiveis.length - 1 ? setIndice(indice + 1) : fechar()), [indice, visiveis.length, fechar]);
  const voltar = useCallback(() => setIndice((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!aberto) return;
    const teclas = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowRight" || e.key === "Enter") proximo();
      if (e.key === "ArrowLeft") voltar();
    };
    window.addEventListener("keydown", teclas);
    return () => window.removeEventListener("keydown", teclas);
  }, [aberto, fechar, proximo, voltar]);

  if (!aberto || !passo) return null;

  // Balão à direita do alvo (menu lateral); sem espaço, embaixo; sem alvo, no centro.
  let posBalao: React.CSSProperties;
  if (caixa) {
    const cabeDireita = caixa.left + caixa.width + 16 + LARGURA_BALAO < window.innerWidth;
    const top = Math.min(Math.max(12, caixa.top), window.innerHeight - 240);
    posBalao = cabeDireita
      ? { top, left: caixa.left + caixa.width + 16 }
      : { top: Math.min(caixa.top + caixa.height + 12, window.innerHeight - 240), left: Math.max(12, Math.min(caixa.left, window.innerWidth - LARGURA_BALAO - 12)) };
  } else {
    posBalao = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-titulo">
      {caixa ? (
        <div
          key={indice}
          className="tour-destaque pointer-events-none fixed rounded-lg transition-[top,left,width,height] duration-300"
          style={{ top: caixa.top, left: caixa.left, width: caixa.width, height: caixa.height }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}

      <div
        key={`balao-${indice}`}
        className="fixed rounded-xl border bg-card p-5 text-card-foreground shadow-2xl"
        style={{ width: LARGURA_BALAO, maxWidth: "calc(100vw - 24px)", animation: "tour-zoom 0.3s ease-out", ...posBalao }}
      >
        <p className="mb-1 text-xs text-muted-foreground">
          {indice + 1} de {visiveis.length}
        </p>
        <h2 id="tour-titulo" className="mb-1 text-base font-semibold">
          {passo.titulo}
        </h2>
        <p className="text-sm text-muted-foreground">{passo.texto}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={fechar}>
            Pular tutorial
          </Button>
          <div className="flex gap-2">
            {indice > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={voltar}>
                Voltar
              </Button>
            )}
            <Button type="button" size="sm" onClick={proximo} autoFocus>
              {indice < visiveis.length - 1 ? "Próximo" : "Concluir"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BotaoVerTutorial({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_TUTORIAL))}>
      Ver tutorial
    </button>
  );
}
