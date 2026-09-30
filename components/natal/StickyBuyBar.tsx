"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import { PRODUCTS } from "@/lib/natal/products";
import { CheckoutLink } from "./CheckoutLink";
import { usePurchase } from "./PurchaseContext";
import { BUY_BUTTON_ID } from "./PurchasePanel";
import { Money } from "./ui";

/**
 * Barra de compra fixa no rodapé (celular e tablet), com a opção escolhida na página. Aparece depois que o botão
 * principal de compra sai da tela. O rodapé da página tem espaço extra para a barra nunca cobrir conteúdo.
 */
export function StickyBuyBar() {
  const { selected } = usePurchase();
  const product = PRODUCTS[selected];
  const [visible, setVisible] = useState(false);

  // Conferido a cada rolagem (no máximo uma vez por quadro), e não só quando o botão cruza a borda da tela:
  // assim a barra também aparece depois de saltos de rolagem (barra de rolagem arrastada, tecla End...).
  useEffect(() => {
    const target = document.getElementById(BUY_BUTTON_ID);
    if (!target) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(target.getBoundingClientRect().bottom < 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      data-sticky-bar={visible ? "visible" : "hidden"}
      className={cx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-pine-900/10 bg-white/95 shadow-[0_-12px_30px_-20px_rgb(8_37_26/0.5)] backdrop-blur-md transition duration-300 lg:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.8rem] font-semibold text-pine-900">
            <span className="truncate">{product.name}</span>
            <span className="hidden shrink-0 rounded bg-berry-50 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-berry-700 min-[360px]:inline-block">
              Pré-venda
            </span>
          </p>
          <Money cents={product.priceCents} className="text-[1.3rem] font-bold leading-tight text-pine-950" />
        </div>
        <CheckoutLink href={product.checkout} product={product.id} placement="barra-fixa" size="md" className="shrink-0">
          Comprar
        </CheckoutLink>
      </div>
    </div>
  );
}
