import { cx } from "@/lib/cx";
import { IMAGES, KIT, KIT_SAVINGS_CENTS, SEPARATE_TOTAL_CENTS } from "@/lib/natal/products";
import { HeroGallery } from "./HeroGallery";
import { IconArrowDown, IconBox, IconCheck, IconShield, IconTree, IconTruck } from "./icons";
import { CheckoutLink, Container, Money, Price, Seal } from "./ui";

const HERO_CHECKLIST = [
  "Árvore de 1,5\u00a0m",
  "Pisca-pisca LED",
  "Várias programações de iluminação",
  "Enfeites inclusos",
  "Frete grátis",
  "Embalagem protegida",
];

// Bordas da grade 2×2 (celular e tablet) e da linha de 4 colunas (computador).
const BENEFITS = [
  { icon: IconBox, title: "Embalagem reforçada", border: "border-r border-b pr-3 lg:border-b-0" },
  { icon: IconShield, title: "Proteção com isopor", border: "border-b pl-3 lg:border-b-0 lg:border-r" },
  { icon: IconTree, title: "Produtos protegidos durante o transporte", border: "border-r pr-3" },
  { icon: IconTruck, title: "Frete grátis", border: "pl-3" },
];

export function Hero() {
  // overflow: clip corta o brilho decorativo sem anular o sticky da galeria (overflow-hidden fica para navegadores antigos).
  return (
    <section id="topo" aria-labelledby="hero-title" className="relative overflow-hidden bg-cream-50 supports-[overflow:clip]:overflow-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(226_196_124/0.28),transparent)]"
      />
      <Container className="relative grid gap-6 pb-10 pt-4 sm:pt-6 md:grid-cols-2 md:gap-8 lg:grid-cols-12 lg:gap-12 lg:pb-14 lg:pt-10">
        <div className="md:sticky md:top-6 md:self-start lg:col-span-7">
          <HeroGallery
            images={[IMAGES.hero, IMAGES.kit, IMAGES.arvore, IMAGES.pisca, IMAGES.acessorios]}
            seal={
              <Seal tone="dark" icon={<IconTree size={14} />}>
                Pré-venda especial de Natal
              </Seal>
            }
          />
        </div>

        <div className="flex flex-col lg:col-span-5 lg:pt-2">
          <div>
            <Seal tone="berry" icon={<IconTree size={14} />}>
              Pré-venda limitada
            </Seal>
          </div>
          <h1
            id="hero-title"
            className="mt-4 text-balance font-display text-[2.15rem] font-semibold leading-[1.04] tracking-[-0.02em] text-pine-950 min-[400px]:text-[2.4rem] sm:text-[2.7rem] lg:text-[3.15rem]"
          >
            O Natal da Sua Casa Começa Aqui
            <IconTree size={34} className="ml-2 inline-block -translate-y-1 align-middle text-gold-500" />
          </h1>
          <p className="mt-4 text-pretty text-[1.05rem] leading-relaxed text-stone-600">
            Árvore de 1,5&nbsp;m + Pisca-Pisca LED + Enfeites em um único kit para deixar sua casa pronta para o Natal.
          </p>

          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[0.9rem] font-medium leading-snug text-pine-950">
            {HERO_CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-px grid size-[1.15rem] shrink-0 place-items-center rounded-full bg-pine-800 text-white">
                  <IconCheck size={12} strokeWidth={2.6} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-[1.4rem] border border-pine-900/10 bg-white p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-pine-800">Kit completo</span>
              <Seal tone="gold">Preço especial de pré-venda</Seal>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
              <Price cents={KIT.priceCents} className="text-[3.1rem] text-pine-950 sm:text-[3.4rem]" />
              <div className="pb-1 text-[0.85rem] leading-snug">
                <p className="text-stone-500">
                  Separado:{" "}
                  <s>
                    <Money cents={SEPARATE_TOTAL_CENTS} />
                  </s>
                </p>
                <p className="font-bold text-berry-700">
                  Economize <Money cents={KIT_SAVINGS_CENTS} />
                </p>
              </div>
            </div>
            <p className="mt-2 text-[0.92rem] text-stone-600">Preço especial durante a pré-venda.</p>
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-pine-50 px-3 py-2.5 text-[0.92rem] font-semibold text-pine-800">
              <IconTruck size={20} className="shrink-0" />
              Frete Grátis para Todo o Brasil
            </p>
            <CheckoutLink href={KIT.checkout} product="kit" placement="topo" shine className="mt-4 w-full">
              Quero garantir meu kit
              <IconTree size={19} />
            </CheckoutLink>
            <p className="mt-3.5 text-center text-[0.88rem] text-stone-600">
              Também disponível para compra separada.{" "}
              <a
                href="#produtos-individuais"
                className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-pine-800 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-pine-950"
              >
                Ver produtos individuais
                <IconArrowDown size={15} />
              </a>
            </p>
          </div>
        </div>
      </Container>

      <div className="border-y border-pine-900/10 bg-white">
        <Container>
          <ul className="grid grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, border }) => (
              <li
                key={title}
                className={cx(
                  "flex items-center gap-3 border-pine-900/10 py-4 text-[0.84rem] font-semibold leading-snug text-pine-950 sm:justify-center sm:text-[0.9rem] lg:px-4",
                  border,
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-100 text-gold-700">
                  <Icon size={20} />
                </span>
                {title}
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </section>
  );
}

export function PreSaleNotice() {
  return (
    <section id="pre-venda" aria-labelledby="pre-venda-title" className="bg-cream-50 py-10 sm:py-14">
      <Container>
        <div className="reveal natal-stars relative overflow-hidden rounded-[1.75rem] bg-pine-900 px-5 py-8 text-cream-50 shadow-lift sm:px-10 sm:py-10 lg:flex lg:items-center lg:gap-10">
          <div className="relative lg:flex-1">
            <Seal tone="onDark">Oferta limitada de pré-venda</Seal>
            <h2 id="pre-venda-title" className="mt-4 flex items-start gap-3 text-balance font-display text-[1.75rem] font-semibold leading-tight sm:text-[2.2rem]">
              <IconTree size={30} className="mt-0.5 shrink-0 text-gold-300 sm:mt-1.5" />
              Condição Especial de Pré-Venda
            </h2>
            <p className="mt-4 max-w-[60ch] text-pretty leading-relaxed text-cream-100/85">
              Estamos disponibilizando o Kit de Natal Completo com preço promocional durante o período de pré-venda. A condição de{" "}
              <Money cents={KIT.priceCents} className="font-semibold text-cream-50" /> é limitada a esta etapa da campanha e poderá ser alterada após o
              encerramento da pré-venda.
            </p>
            <p className="mt-3 font-semibold text-gold-200">Garanta o seu durante a condição promocional.</p>
          </div>
          <div className="relative mt-7 sm:grid sm:grid-cols-2 sm:items-center sm:gap-4 lg:mt-0 lg:block lg:w-[18.5rem] lg:shrink-0">
            <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-gold-300">Kit completo na pré-venda</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <Price cents={KIT.priceCents} className="text-[2.5rem] text-cream-50" />
                <span className="pb-1 text-right text-[0.8rem] font-semibold leading-tight text-gold-200">
                  Frete
                  <br />
                  grátis
                </span>
              </div>
            </div>
            <CheckoutLink href={KIT.checkout} product="kit" placement="pre-venda" variant="berry" className="mt-3 w-full sm:mt-0 lg:mt-3">
              Aproveitar a pré-venda
            </CheckoutLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
