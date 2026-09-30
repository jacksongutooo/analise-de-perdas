"use client";

import { useEffect } from "react";
import { withCampaignParams } from "@/lib/natal/checkout";

/**
 * Efeitos da página /kit-de-natal, sem biblioteca:
 * - blocos com a classe "reveal" aparecem suavemente ao entrar na tela (sem JavaScript, tudo fica visível);
 * - links para uma pergunta frequente abrem a resposta;
 * - os parâmetros de campanha da URL (utm_*, fbclid, gclid...) são repassados aos links de checkout externos.
 */
export function PageEffects({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
    const limit = window.innerHeight * 0.92;
    // O que já está na tela (ou acima dela) não some e reaparece.
    for (const el of items) if (el.getBoundingClientRect().top < limit) el.classList.add("is-visible");
    root.dataset.reveal = "on";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const el of items) if (!el.classList.contains("is-visible")) observer.observe(el);
    return () => observer.disconnect();
  }, [rootId]);

  // Links para uma pergunta frequente (ex.: #faq-pre-venda no rodapé) já abrem a resposta.
  useEffect(() => {
    function openFromHash() {
      const target = window.location.hash ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
      if (target instanceof HTMLDetailsElement) target.open = true;
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  useEffect(() => {
    const search = window.location.search;
    if (!search) return;
    for (const link of document.querySelectorAll<HTMLAnchorElement>("a[data-checkout]")) {
      const href = link.getAttribute("href") ?? "";
      const next = withCampaignParams(href, search);
      if (next !== href) link.setAttribute("href", next);
    }
  }, []);

  return null;
}
