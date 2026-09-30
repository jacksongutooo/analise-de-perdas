import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { Faq } from "@/components/natal/faq";
import { Hero, PreSaleNotice } from "@/components/natal/hero";
import { StoreFooter, StoreHeader, TopBar } from "@/components/natal/layout";
import { ChooseOffer, Comparison, FinalOffer, WhatArrives } from "@/components/natal/offers";
import { PageEffects } from "@/components/natal/PageEffects";
import { Reviews } from "@/components/natal/reviews";
import { Ambience, KitContents, Packaging, WhyKit } from "@/components/natal/sections";
import { StickyBuyBar } from "@/components/natal/StickyBuyBar";
import { cx } from "@/lib/cx";
import { formatBRL } from "@/lib/format";
import { IMAGES, KIT } from "@/lib/natal/products";
import { STORE } from "@/lib/natal/store";
import { site } from "@/lib/site";
import "./natal.css";

// Página de vendas do Kit de Natal Completo (loja "Natal Encantado"), independente do restante do site.
// Textos de preço vêm de lib/natal/products.ts e os links de compra de lib/natal/checkout.ts.

const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

// Sem dados dinâmicos: a página é gerada no build e servida pronta (mais rápida para o tráfego pago).
export const dynamic = "force-static";

const PATH = "/kit-de-natal";
const TITLE = "Kit de Natal Completo | Árvore 1,5m + Pisca-Pisca LED + Enfeites";
const DESCRIPTION = `Kit de Natal com árvore de 1,5 m, pisca-pisca LED com várias programações e acessórios. Pré-venda por ${formatBRL(KIT.priceCents).replace(/ /g, " ")} com frete grátis.`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "website", locale: "pt_BR", siteName: STORE.name, url: PATH, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#08251a" };

// Dados estruturados do produto (sem nota média: só entram avaliações reais, quando existirem).
const productJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Kit de Natal Completo",
  description: DESCRIPTION,
  image: [IMAGES.kit.src, IMAGES.hero.src].map((src) => new URL(src, site.url).toString()),
  brand: { "@type": "Brand", name: STORE.name },
  offers: {
    "@type": "Offer",
    url: new URL(PATH, site.url).toString(),
    priceCurrency: "BRL",
    price: (KIT.priceCents / 100).toFixed(2),
    availability: "https://schema.org/PreOrder",
    itemCondition: "https://schema.org/NewCondition",
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "BRL" },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "BR" },
    },
  },
}).replace(/</g, "\\u003c");

export default function KitDeNatalPage() {
  return (
    <div id="natal" className={cx(display.variable, "natal-page flex min-h-dvh flex-col bg-cream-50 text-stone-700")}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-pine-950 focus:shadow-card"
      >
        Pular para o conteúdo
      </a>
      <TopBar />
      <StoreHeader />
      <main id="conteudo" className="flex-1">
        <Hero />
        <PreSaleNotice />
        <KitContents />
        <Ambience />
        <WhyKit />
        <ChooseOffer />
        <Comparison />
        <Packaging />
        <WhatArrives />
        <Reviews />
        <FinalOffer />
        <Faq />
      </main>
      <StoreFooter />
      <StickyBuyBar watchId="topo" />
      <PageEffects rootId="natal" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd }} />
    </div>
  );
}
