import Image from "next/image";
import { cx } from "@/lib/cx";
import { IMAGES, KIT, KIT_SAVINGS_CENTS, SEPARATE_TOTAL_CENTS } from "@/lib/natal/products";
import { formatBRL } from "@/lib/format";
import { IconArrowDown, IconBox, IconGift, IconLayers, IconLights, IconShield, IconSparkles, IconTag, IconTree, IconTruck } from "./icons";
import { Container, Money, SectionHeading } from "./ui";

// Seções de conteúdo da página /kit-de-natal.

const KIT_ITEMS = [
  {
    icon: IconTree,
    title: "Árvore de Natal\u00a0— 1,5\u00a0m",
    text: "Árvore de Natal com aproximadamente 1,5 metro de altura, ideal para salas, casas, apartamentos, escritórios e outros ambientes.",
    image: IMAGES.arvore,
  },
  {
    icon: IconLights,
    title: "Pisca-Pisca LED",
    text: "Pisca-pisca com iluminação em LED e várias programações, permitindo alternar diferentes efeitos de luz.",
    image: IMAGES.pisca,
  },
  {
    icon: IconGift,
    title: "Acessórios e Enfeites",
    text: "Kit de acessórios para completar a decoração da árvore.",
    image: IMAGES.acessorios,
  },
];

export function KitContents() {
  return (
    <section id="kit" aria-labelledby="kit-title" className="bg-white py-16 sm:py-24">
      <Container>
        <SectionHeading
          id="kit-title"
          eyebrow="Tudo que você precisa"
          title="Seu Natal Completo em Uma Única Compra"
          intro="Esqueça a correria de comprar árvore, iluminação e decoração em lugares diferentes. O Kit de Natal Completo reúne os principais itens para você montar sua decoração de maneira prática."
        />
        <div className="mt-10 grid gap-4 sm:mt-12 md:grid-cols-3 md:gap-6">
          {KIT_ITEMS.map(({ icon: Icon, title, text, image }, i) => (
            <article
              key={title}
              style={{ animationDelay: `${i * 90}ms` }}
              className="reveal group grid grid-cols-[6.75rem_1fr] items-center gap-4 rounded-3xl border border-pine-900/10 bg-cream-50 p-3 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift min-[400px]:grid-cols-[8rem_1fr] md:flex md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:p-0"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-cream-100 md:rounded-none">
                <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1152px) 360px, (min-width: 768px) 31vw, 128px" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="py-1 pr-1 md:p-6">
                <p className="flex items-center gap-2 text-gold-700">
                  <Icon size={18} />
                  <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em]">Item {String(i + 1).padStart(2, "0")}</span>
                </p>
                <h3 className="mt-1.5 font-display text-[1.15rem] font-semibold leading-tight text-pine-950 sm:text-[1.3rem] md:text-[1.4rem]">{title}</h3>
                <p className="mt-1.5 text-[0.86rem] leading-relaxed text-stone-600 sm:text-[0.92rem] md:mt-2.5 md:text-[0.95rem]">{text}</p>
              </div>
            </article>
          ))}
        </div>
        {/* Vantagem do kit */}
        <div className="reveal mx-auto mt-10 max-w-3xl rounded-3xl border border-berry-600/15 bg-berry-50 px-5 py-5 text-center sm:px-8">
          <p className="flex items-center justify-center gap-2 text-balance text-[1rem] font-bold uppercase leading-snug tracking-[0.06em] text-berry-700 sm:text-[1.1rem]">
            <IconTag size={22} className="shrink-0" />
            <span>
              Economize <Money cents={KIT_SAVINGS_CENTS} /> levando o Kit Completo
            </span>
          </p>
          <p className="mt-2 text-[0.93rem] text-stone-600">
            Separado: <Money cents={SEPARATE_TOTAL_CENTS} className="line-through" /> · Kit Completo na{" "}
            <span className="whitespace-nowrap">pré-venda:</span>{" "}
            <Money cents={KIT.priceCents} className="font-bold text-pine-950" />
          </p>
          <a
            href="#ofertas"
            className="mt-2.5 inline-flex items-center gap-1 whitespace-nowrap text-[0.93rem] font-semibold text-pine-800 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-pine-950"
          >
            Ver opções de compra
            <IconArrowDown size={15} />
          </a>
        </div>
      </Container>
    </section>
  );
}

export function Ambience() {
  return (
    <section aria-labelledby="ambiente-title" className="natal-stars relative overflow-hidden bg-pine-950 py-16 text-cream-50 sm:py-24">
      <Container className="relative grid items-center gap-9 lg:grid-cols-12 lg:gap-14">
        <div className="reveal lg:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] ring-1 ring-white/10 shadow-lift sm:aspect-[16/10]">
            <Image src={IMAGES.ambiente.src} alt={IMAGES.ambiente.alt} fill sizes="(min-width: 1152px) 660px, (min-width: 1024px) 58vw, 100vw" className="object-cover" />
          </div>
        </div>
        <div className="lg:col-span-5">
          <SectionHeading id="ambiente-title" dark align="left" eyebrow="Clima de Natal" title="Imagine Sua Casa Assim Neste Natal..." />
          <p className="reveal mt-4 max-w-md text-pretty text-[1.08rem] leading-relaxed text-cream-100/80">
            Uma árvore iluminada ajuda a transformar o clima da casa durante o Natal.
          </p>
          <a
            href="#ofertas"
            className="reveal mt-7 inline-flex items-center gap-2 rounded-xl px-1 font-semibold text-gold-200 underline decoration-gold-300/60 decoration-2 underline-offset-[6px] transition-colors hover:text-gold-100"
          >
            Escolher meu kit
            <IconArrowDown size={16} />
          </a>
        </div>
      </Container>
    </section>
  );
}

const REASONS = [
  { icon: IconGift, title: "Kit Completo", text: "Árvore, iluminação e decoração em uma única compra." },
  { icon: IconTree, title: "Árvore de 1,5\u00a0m", text: "Um tamanho que traz presença para a decoração." },
  { icon: IconSparkles, title: "LED com Várias Programações", text: "Diferentes efeitos de iluminação para personalizar sua árvore." },
  { icon: IconBox, title: "Embalagem Protegida", text: "Produtos enviados com proteção utilizando isopor e caixa de papelão." },
  {
    icon: IconTag,
    title: `Economia de ${formatBRL(KIT_SAVINGS_CENTS)}`,
    text: "O kit custa menos do que a soma dos três produtos comprados separadamente.",
    highlight: true,
  },
  { icon: IconTruck, title: "Frete Grátis", text: "Sem custo adicional de frete para regiões atendidas pela operação no Brasil." },
];

export function WhyKit() {
  return (
    <section id="vantagens" aria-labelledby="vantagens-title" className="bg-white py-16 sm:py-24">
      <Container>
        <SectionHeading id="vantagens-title" eyebrow="Vantagens" title="Por Que Escolher o Kit" />
        <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {REASONS.map(({ icon: Icon, title, text, highlight }, i) => (
            <li
              key={title}
              style={{ animationDelay: `${(i % 3) * 80}ms` }}
              className={cx(
                "reveal flex gap-4 rounded-3xl border bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-6",
                highlight ? "border-gold-400/70 ring-1 ring-gold-300/60" : "border-pine-900/10",
              )}
            >
              <span
                className={cx(
                  "grid size-12 shrink-0 place-items-center rounded-2xl",
                  highlight ? "bg-berry-600 text-white" : "bg-pine-900 text-gold-300",
                )}
              >
                <Icon size={23} />
              </span>
              <div>
                <h3 className={cx("text-[1.05rem] font-bold leading-snug", highlight ? "text-berry-700" : "text-pine-950")}>{title}</h3>
                <p className="mt-1 text-[0.93rem] leading-relaxed text-stone-600">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

const PACKING = [
  { icon: IconBox, title: "Caixa de papelão" },
  { icon: IconShield, title: "Proteção interna com isopor" },
  { icon: IconLayers, title: "Produtos organizados na embalagem" },
  { icon: IconTruck, title: "Preparado para transporte" },
];

export function Packaging() {
  return (
    <section id="embalagem" aria-labelledby="embalagem-title" className="bg-cream-50 py-16 sm:py-24">
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="reveal">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-cream-100 shadow-card ring-1 ring-pine-900/5">
            <Image src={IMAGES.embalagem.src} alt={IMAGES.embalagem.alt} fill sizes="(min-width: 1152px) 540px, (min-width: 1024px) 46vw, 100vw" className="object-cover" />
          </div>
        </div>
        <div>
          <SectionHeading id="embalagem-title" align="left" eyebrow="Embalagem e envio" title="Preparado com Cuidado Para Chegar Até Você" />
          <p className="reveal mt-5 text-[1.08rem] font-semibold text-pine-900">Seu pedido vai bem protegido até você.</p>
          <p className="reveal mt-2 text-pretty leading-relaxed text-stone-600">
            Cada pedido é preparado para transporte com proteção utilizando isopor e caixa de papelão, ajudando a preservar os produtos durante o
            trajeto.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {PACKING.map(({ icon: Icon, title }) => (
              <li key={title} className="reveal flex items-center gap-3 rounded-2xl border border-pine-900/10 bg-white p-3.5 text-[0.95rem] font-semibold text-pine-950">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700">
                  <Icon size={20} />
                </span>
                {title}
              </li>
            ))}
          </ul>
          <p className="reveal mt-5 text-[0.88rem] leading-relaxed text-stone-500">
            Materiais de proteção: isopor, caixa de papelão e proteção interna adequada para transporte.
          </p>
        </div>
      </Container>
    </section>
  );
}
