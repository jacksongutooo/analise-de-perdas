import Image from "next/image";
import type { ReactNode } from "react";
import { IMAGES, INDIVIDUAL_PRODUCTS, KIT, KIT_SAVINGS_CENTS, SEPARATE_TOTAL_CENTS, type ProductId } from "@/lib/natal/products";
import { IconCheck, IconGift, IconLights, IconTag, IconTree, IconTruck } from "./icons";
import { CheckoutLink, Container, Money, Price, Seal, SectionHeading } from "./ui";

// Seções de compra da página /kit-de-natal. Os botões usam o checkout de cada produto (lib/natal/checkout.ts).

const PRODUCT_ICONS: Record<ProductId, typeof IconTree> = {
  kit: IconTree,
  arvore: IconTree,
  pisca: IconLights,
  acessorios: IconGift,
};

const KIT_INCLUDES = ["Árvore de Natal de 1,5\u00a0m", "Pisca-pisca LED com várias programações", "Kit de acessórios e enfeites"];

function CheckItem({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={
          dark
            ? "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-300 text-pine-950"
            : "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-pine-800 text-white"
        }
      >
        <IconCheck size={12} strokeWidth={2.6} />
      </span>
      {children}
    </li>
  );
}

export function ChooseOffer() {
  return (
    <section id="ofertas" aria-labelledby="ofertas-title" className="scroll-mt-4 bg-cream-100 py-16 sm:py-24">
      <Container>
        <SectionHeading
          id="ofertas-title"
          eyebrow="Pré-venda de Natal"
          title="Escolha Como Quer Comprar"
          intro="Leve o kit completo com o melhor custo-benefício ou compre cada produto separadamente."
        />

        <article className="reveal relative mt-10 overflow-hidden rounded-[2rem] bg-pine-900 text-cream-50 shadow-lift ring-2 ring-gold-400/70 sm:mt-12 lg:grid lg:grid-cols-2">
          <div className="relative aspect-square bg-pine-950 lg:aspect-auto lg:min-h-[34rem]">
            <Image src={IMAGES.hero.src} alt={IMAGES.hero.alt} fill sizes="(min-width: 1152px) 560px, (min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="absolute left-4 top-4 sm:left-5 sm:top-5">
            <Seal tone="goldSolid">Melhor custo-benefício</Seal>
          </div>
          <div className="natal-stars relative flex flex-col justify-center p-6 sm:p-9 lg:p-11">
            <p className="flex items-center gap-2 text-[0.75rem] font-bold uppercase tracking-[0.18em] text-gold-300">
              <IconTree size={18} />
              Kit completo
            </p>
            <h3 className="mt-3 text-balance font-display text-[1.75rem] font-semibold leading-tight sm:text-[2.1rem]">
              Árvore 1,5&nbsp;m + <span className="whitespace-nowrap">Pisca-pisca LED</span> + Acessórios
            </h3>
            <ul className="mt-5 space-y-2.5 text-[0.98rem] text-cream-100/90">
              {KIT_INCLUDES.map((item) => (
                <CheckItem key={item} dark>
                  {item}
                </CheckItem>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10 sm:p-5">
              <p className="text-[0.9rem] text-cream-100/70">
                De:{" "}
                <s>
                  <Money cents={SEPARATE_TOTAL_CENTS} />
                </s>{" "}
                comprando separado
              </p>
              <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="pb-1.5 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-gold-300">Pré-venda:</span>
                <Price cents={KIT.priceCents} className="text-[3.2rem] text-cream-50" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Seal tone="berry" icon={<IconTag size={14} />}>
                  Economize <Money cents={KIT_SAVINGS_CENTS} />
                </Seal>
                <Seal tone="onDark" icon={<IconTruck size={15} />}>
                  Frete grátis
                </Seal>
              </div>
            </div>
            <CheckoutLink href={KIT.checkout} product="kit" placement="escolha-kit" shine className="mt-6 w-full">
              {KIT.cta}
            </CheckoutLink>
          </div>
        </article>

        <div id="produtos-individuais" className="scroll-mt-6 pt-12 sm:pt-14">
          <div className="reveal flex items-center gap-4">
            <h3 className="shrink-0 text-[0.8rem] font-bold uppercase tracking-[0.18em] text-pine-800">Ou compre separado</h3>
            <span aria-hidden="true" className="h-px flex-1 bg-pine-900/15" />
          </div>
          {/* Celular e tablet: card horizontal. Computador: 3 colunas, com preço e botão alinhados embaixo. */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3 lg:gap-5">
            {INDIVIDUAL_PRODUCTS.map((product, i) => {
              const Icon = PRODUCT_ICONS[product.id];
              return (
                <article
                  key={product.id}
                  style={{ animationDelay: `${i * 90}ms` }}
                  className="reveal group flex flex-col overflow-hidden rounded-3xl border border-pine-900/10 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="grid grid-cols-[6.5rem_1fr] gap-4 p-4 min-[400px]:grid-cols-[7.5rem_1fr] sm:grid-cols-[10rem_1fr] sm:gap-6 sm:p-5 lg:flex lg:flex-col lg:gap-0 lg:p-0">
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-cream-100 lg:rounded-none">
                      <Image
                        src={product.image.src}
                        alt={product.image.alt}
                        fill
                        sizes="(min-width: 1152px) 360px, (min-width: 1024px) 31vw, (min-width: 640px) 160px, 120px"
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="min-w-0 sm:self-center lg:self-stretch lg:px-5 lg:pt-5">
                      <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-gold-700">
                        <Icon size={16} className="shrink-0" />
                        {product.label}
                      </p>
                      <h4 className="mt-1.5 text-[1.12rem] font-bold uppercase tracking-[0.04em] text-pine-950">{product.title}</h4>
                      <p className="text-[0.9rem] font-semibold text-pine-700">{product.subtitle}</p>
                      <p className="mt-1.5 text-[0.86rem] leading-relaxed text-stone-600">{product.description}</p>
                      <div className="mt-3 lg:hidden">
                        <Price cents={product.priceCents} className="text-[2.05rem] text-pine-950" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto px-4 pb-4 sm:px-5 sm:pb-5 lg:pt-4">
                    <div className="mb-4 hidden lg:block">
                      <Price cents={product.priceCents} className="text-[2.05rem] text-pine-950" />
                    </div>
                    <CheckoutLink href={product.checkout} product={product.id} placement="compra-separada" variant="pine" size="md" className="w-full">
                      {product.cta}
                    </CheckoutLink>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Comparison() {
  return (
    <section id="comparacao" aria-labelledby="comparacao-title" className="bg-white py-16 sm:py-24">
      <Container>
        <SectionHeading id="comparacao-title" eyebrow="Faça as contas" title="Comprar Separado ou Levar Tudo Junto?" />
        <div className="relative mx-auto mt-10 grid max-w-4xl items-stretch gap-5 sm:mt-12 md:grid-cols-2 md:gap-10">
          <div className="reveal receipt-edge flex flex-col rounded-t-3xl bg-cream-100 px-6 pb-12 pt-6 sm:px-8 sm:pt-8">
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.18em] text-stone-500">Separado</p>
            <dl className="mt-4 divide-y divide-dashed divide-pine-900/20 text-[1rem]">
              {INDIVIDUAL_PRODUCTS.map((product) => (
                <div key={product.id} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-stone-700">{product.shortName}</dt>
                  <dd className="font-semibold text-pine-950">
                    <Money cents={product.priceCents} />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-auto flex items-baseline justify-between gap-4 border-t-2 border-pine-950 pt-4">
              <span className="text-[0.85rem] font-bold uppercase tracking-[0.14em] text-pine-950">Total</span>
              <Money cents={SEPARATE_TOTAL_CENTS} className="text-[1.6rem] font-bold text-pine-950" />
            </div>
          </div>

          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-10 hidden size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold-300 font-display text-lg font-semibold italic text-pine-950 shadow-card ring-4 ring-white md:grid"
          >
            vs
          </span>

          <div className="reveal natal-stars relative flex flex-col overflow-hidden rounded-3xl bg-pine-900 p-6 text-cream-50 shadow-lift ring-2 ring-gold-400/70 sm:p-8">
            <p className="relative flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.18em] text-gold-300">
              <IconTree size={17} />
              Kit completo
            </p>
            <ul className="relative mt-4 space-y-2.5 text-[1rem]">
              {["Árvore 1,5\u00a0m", "Pisca-pisca LED", "Acessórios"].map((item) => (
                <CheckItem key={item} dark>
                  {item}
                </CheckItem>
              ))}
            </ul>
            <div className="relative mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t border-white/15 pt-4 max-md:mt-6">
              <span className="pb-1 text-[0.85rem] font-bold uppercase tracking-[0.14em] text-gold-200">Pré-venda:</span>
              <Price cents={KIT.priceCents} className="text-[2.6rem] text-cream-50" />
            </div>
            <p className="relative mt-4 rounded-xl bg-berry-600 px-4 py-3 text-center text-[0.86rem] font-bold uppercase tracking-[0.08em] text-white">
              Você economiza <Money cents={KIT_SAVINGS_CENTS} />
            </p>
            <CheckoutLink href={KIT.checkout} product="kit" placement="comparacao" variant="light" className="relative mt-3 w-full">
              Garantir meu kit
            </CheckoutLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

const ARRIVES = [
  { icon: IconTree, text: "1 Árvore de Natal — 1,5 metro" },
  { icon: IconLights, text: "1 Pisca-pisca LED com várias programações" },
  { icon: IconGift, text: "Kit de acessórios e enfeites" },
];

export function WhatArrives() {
  return (
    <section id="o-que-chega" aria-labelledby="o-que-chega-title" className="bg-white py-16 sm:py-24">
      <Container className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="reveal lg:col-span-6">
          <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-cream-100 shadow-card ring-1 ring-pine-900/5">
            <Image src={IMAGES.kit.src} alt={IMAGES.kit.alt} fill sizes="(min-width: 1152px) 540px, (min-width: 1024px) 46vw, 100vw" className="object-cover" />
          </div>
        </div>
        <div className="lg:col-span-6">
          <SectionHeading id="o-que-chega-title" align="left" eyebrow="Kit completo" title="O Que Chega na Sua Casa" />
          <ul className="reveal mt-6 divide-y divide-pine-900/10 overflow-hidden rounded-2xl border border-pine-900/10 bg-white">
            {ARRIVES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 px-4 py-4 text-[1rem] font-semibold text-pine-950 sm:px-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pine-900 text-gold-300">
                  <Icon size={22} />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <div className="reveal mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Price cents={KIT.priceCents} className="text-[3rem] text-pine-950" />
            <ul className="flex flex-wrap gap-2">
              <li>
                <Seal tone="pine">Condição especial de pré-venda</Seal>
              </li>
              <li>
                <Seal tone="pine" icon={<IconTruck size={15} />}>
                  Frete grátis
                </Seal>
              </li>
              <li>
                <Seal tone="berry">
                  Economia de <Money cents={KIT_SAVINGS_CENTS} />
                </Seal>
              </li>
            </ul>
          </div>
          <CheckoutLink href={KIT.checkout} product="kit" placement="o-que-chega" className="mt-7 w-full sm:w-auto sm:px-10">
            {KIT.cta}
          </CheckoutLink>
        </div>
      </Container>
    </section>
  );
}

export function FinalOffer() {
  return (
    <section id="oferta-final" aria-labelledby="oferta-final-title" className="natal-stars relative overflow-hidden bg-pine-950 py-16 text-cream-50 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(226_196_124/0.18),transparent)]"
      />
      <Container className="relative grid items-center gap-8 lg:grid-cols-2 lg:grid-rows-[auto_auto] lg:gap-x-16 lg:gap-y-8">
        <div className="text-center lg:col-start-1 lg:row-start-1 lg:self-end lg:text-left">
          <Seal tone="onDark" icon={<IconTree size={14} />}>
            Pré-venda especial
          </Seal>
          <h2 id="oferta-final-title" className="mt-5 text-balance font-display text-[2.3rem] font-semibold leading-[1.05] tracking-[-0.015em] sm:text-[3rem]">
            Deixe Sua Casa Pronta Para o Natal
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-[1.05rem] leading-relaxed text-cream-100/80 lg:mx-0">
            Condição promocional disponível durante o período de pré-venda.
          </p>
        </div>

        <div className="reveal rounded-[1.75rem] bg-cream-50 p-6 text-pine-950 shadow-lift sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <dl className="divide-y divide-dashed divide-pine-900/20">
            {INDIVIDUAL_PRODUCTS.map((product) => (
              <div key={product.id} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-stone-600">{product.shortName}</dt>
                <dd className="font-semibold">
                  <Money cents={product.priceCents} />
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="font-semibold text-stone-700">Total separado</dt>
              <dd className="text-lg font-bold text-stone-500">
                <s>
                  <Money cents={SEPARATE_TOTAL_CENTS} />
                </s>
              </dd>
            </div>
          </dl>
          <div className="mt-3 rounded-2xl bg-pine-900 p-5 text-cream-50">
            <p className="text-[0.88rem] text-cream-100/80">
              Preço do Kit Completo durante a <span className="whitespace-nowrap">pré-venda:</span>
            </p>
            <Price cents={KIT.priceCents} className="mt-2 text-[3.3rem] text-gold-200" />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Seal tone="berry" icon={<IconTag size={14} />}>
              Economize <Money cents={KIT_SAVINGS_CENTS} />
            </Seal>
            <Seal tone="pine" icon={<IconTruck size={15} />}>
              Frete grátis
            </Seal>
          </div>
        </div>

        <div className="text-center lg:col-start-1 lg:row-start-2 lg:self-start lg:text-left">
          <CheckoutLink href={KIT.checkout} product="kit" placement="oferta-final" shine className="w-full sm:w-auto sm:px-10">
            Garantir meu kit na pré-venda
            <IconTree size={19} />
          </CheckoutLink>
        </div>
      </Container>
    </section>
  );
}
