"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ProductId } from "@/lib/natal/products";

// Opção de compra escolhida na página (kit, árvore, pisca-pisca ou acessórios). O painel de compra, a galeria e a
// barra fixa do celular acompanham a mesma escolha.
type Purchase = { selected: ProductId; select: (id: ProductId) => void };

const PurchaseContext = createContext<Purchase>({ selected: "kit", select: () => {} });

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const [selected, select] = useState<ProductId>("kit");
  return <PurchaseContext.Provider value={{ selected, select }}>{children}</PurchaseContext.Provider>;
}

export function usePurchase(): Purchase {
  return useContext(PurchaseContext);
}
