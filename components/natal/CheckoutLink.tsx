"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { withCampaignParams } from "@/lib/natal/checkout";
import type { ProductId } from "@/lib/natal/products";
import { ctaClasses, type CtaSize, type CtaVariant } from "./ui";

// Parâmetros da URL atual. No servidor (e na hidratação) é vazio; no navegador, o link é refeito com eles.
const noSubscribe = () => () => {};
function useSearch(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => window.location.search,
    () => "",
  );
}

/**
 * Botão de compra. O href SEMPRE vem de uma das constantes de lib/natal/checkout.ts (via PRODUCTS); os parâmetros
 * de campanha da URL (utm_*, fbclid, gclid...) são repassados quando o link é externo.
 * data-checkout identifica o produto e data-placement o lugar do botão (úteis para pixel e tag manager).
 */
export function CheckoutLink({
  href,
  product,
  placement,
  id,
  variant = "berry",
  size = "lg",
  shine = false,
  className,
  children,
}: {
  href: string;
  product: ProductId;
  placement: string;
  id?: string;
  variant?: CtaVariant;
  size?: CtaSize;
  shine?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const search = useSearch();
  return (
    <a
      id={id}
      href={withCampaignParams(href, search)}
      data-checkout={product}
      data-placement={placement}
      className={ctaClasses(variant, size, cx(shine && "shine", className))}
    >
      {children}
    </a>
  );
}
