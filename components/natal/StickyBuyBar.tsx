"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import { KIT } from "@/lib/natal/products";
import { CheckoutLink, Money } from "./ui";

/**
 * Barra de compra fixa no rodapé (celular e tablet). Aparece depois que o topo da página (watchId) sai da
 * tela. O rodapé da página tem espaço extra embaixo para a barra nunca cobrir conteúdo.
 */
export function StickyBuyBar({ watchId }: { watchId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

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
            {KIT.title}
            <span className="rounded bg-berry-50 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-berry-700">Pré-venda</span>
          </p>
          <Money cents={KIT.priceCents} className="text-[1.3rem] font-bold leading-tight text-pine-950" />
        </div>
        <CheckoutLink href={KIT.checkout} product="kit" placement="barra-fixa" size="md" className="shrink-0">
          Comprar
        </CheckoutLink>
      </div>
    </div>
  );
}
