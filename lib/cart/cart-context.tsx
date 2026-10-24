"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type CartItem = {
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  foto?: string | null;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantidade">, quantidade?: number) => void;
  removeItem: (produtoId: string) => void;
  updateQuantidade: (produtoId: string, quantidade: number) => void;
  clear: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Carrinho fica só no navegador (localStorage), por tenant — não existe
 * tabela de "carrinho" no banco. Só vira dado persistido quando o cliente
 * finaliza o pedido (criarPedido grava em pagamentos/pagamento_itens). Chave
 * prefixada por slug pra não misturar carrinho entre barbearias diferentes
 * visitadas no mesmo navegador.
 */
export function CartProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const storageKey = `cart:${slug}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Lê o localStorage só depois do mount de propósito: o servidor sempre
    // renderiza carrinho vazio (não tem acesso a localStorage), então
    // preencher os itens síncrono no primeiro render do client causaria
    // mismatch de hidratação. Esse é o padrão aceito pra "estado só do
    // cliente" — não dá pra resolver isso com um handler de evento, então o
    // lint de "setState dentro de efeito" é esperado aqui.
    try {
      const raw = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage indisponível (aba anônima, bloqueado): segue com carrinho vazio.
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // sem armazenamento: o carrinho vale só enquanto a página estiver aberta
    }
  }, [items, hydrated, storageKey]);

  const addItem = useCallback<CartContextValue["addItem"]>((item, quantidade = 1) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.produtoId === item.produtoId);
      if (existente) {
        return prev.map((i) =>
          i.produtoId === item.produtoId ? { ...i, quantidade: i.quantidade + quantidade } : i,
        );
      }
      return [...prev, { ...item, quantidade }];
    });
  }, []);

  const removeItem = useCallback((produtoId: string) => {
    setItems((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }, []);

  const updateQuantidade = useCallback((produtoId: string, quantidade: number) => {
    setItems((prev) =>
      quantidade <= 0
        ? prev.filter((i) => i.produtoId !== produtoId)
        : prev.map((i) => (i.produtoId === produtoId ? { ...i, quantidade } : i)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
  const count = items.reduce((soma, i) => soma + i.quantidade, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantidade, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart() precisa estar dentro de <CartProvider>");
  return ctx;
}
