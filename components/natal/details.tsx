import Image from "next/image";
import { IMAGES } from "@/lib/natal/products";
import { IconBox, IconGift, IconLayers, IconLights, IconShield, IconTree, IconTruck } from "./icons";
import { Container, SectionHeading } from "./ui";

// Descrição do produto, logo abaixo da área de compra: o que vem no kit, o clima de Natal e a embalagem.

const KIT_ITEMS = [
  {
    icon: IconTree,
    title: "Árvore de Natal — 1,5 m",
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

const PACKING = [
  { icon: IconBox, title: "Caixa de papelão" },
  { icon: IconShield, title: "Proteção interna com isopor" },
  { icon: IconLayers, title: "Produtos organizados na embalagem" },
  { icon: IconTruck, title: "Preparado para transporte" },
];

export function ProductDetails() {
  return (
    <section id="detalhes" aria-labelledby="detalhes-title" className="bg-cream-50 py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="detalhes-title"
          eyebrow="Tudo que você precisa"
          title="Seu Natal Completo em Uma Única Compra"
          intro="Esqueça a correria de comprar árvore, iluminação e decoração em lugares diferentes. O Kit de Natal Completo reúne os principais itens para você montar sua decoração de maneira prática."
        />
        <div className="mt-8 grid gap-3 sm:mt-10 md:grid-cols-3 md:gap-5">
          {KIT_ITEMS.map(({ icon: Icon, title, text, image }, i) => (
            <article
              key={title}
              style={{ animationDelay: `${i * 90}ms` }}
              className="reveal group grid grid-cols-[6.5rem_1fr] items-center gap-4 rounded-3xl border border-pine-900/10 bg-white p-3 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift min-[400px]:grid-cols-[7.5rem_1fr] md:flex md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:p-0"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-cream-100 md:rounded-none">
                <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1152px) 360px, (min-width: 768px) 31vw, 120px" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="py-1 pr-1 md:p-5">
                <h3 className="flex items-start gap-2 font-display text-[1.12rem] font-semibold leading-tight text-pine-950 sm:text-[1.25rem]">
                  <Icon size={18} className="mt-0.5 shrink-0 text-gold-700" />
                  {title}
                </h3>
                <p className="mt-1.5 text-[0.86rem] leading-relaxed text-stone-600 sm:text-[0.92rem]">{text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="reveal natal-stars mt-12 grid items-center overflow-hidden rounded-[1.75rem] bg-pine-950 text-cream-50 shadow-lift sm:mt-16 md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-auto md:h-full md:min-h-80">
            <Image src={IMAGES.ambiente.src} alt={IMAGES.ambiente.alt} fill sizes="(min-width: 1152px) 544px, (min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="p-6 sm:p-9">
            <h2 className="text-balance font-display text-[1.75rem] font-semibold leading-tight sm:text-[2.2rem]">Imagine Sua Casa Assim Neste Natal...</h2>
            <p className="mt-3 text-pretty text-[1.02rem] leading-relaxed text-cream-100/80">
              Uma árvore iluminada ajuda a transformar o clima da casa durante o Natal.
            </p>
          </div>
        </div>

        <div className="mt-12 grid items-center gap-8 sm:mt-16 md:grid-cols-2 md:gap-12">
          <div className="reveal relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-cream-100 shadow-card ring-1 ring-pine-900/5">
            <Image src={IMAGES.embalagem.src} alt={IMAGES.embalagem.alt} fill sizes="(min-width: 1152px) 520px, (min-width: 768px) 46vw, 100vw" className="object-cover" />
          </div>
          <div>
            <SectionHeading id="embalagem-title" align="left" eyebrow="Embalagem e envio" title="Preparado com Cuidado Para Chegar Até Você" />
            <p className="reveal mt-4 font-semibold text-pine-900">Seu pedido vai bem protegido até você.</p>
            <p className="reveal mt-1.5 text-pretty leading-relaxed text-stone-600">
              Cada pedido é preparado para transporte com proteção utilizando isopor e caixa de papelão, ajudando a preservar os produtos durante o
              trajeto.
            </p>
            <ul className="reveal mt-5 grid grid-cols-2 gap-2.5">
              {PACKING.map(({ icon: Icon, title }) => (
                <li key={title} className="flex items-center gap-2.5 rounded-xl border border-pine-900/10 bg-white px-3 py-2.5 text-[0.84rem] font-semibold leading-snug text-pine-950">
                  <Icon size={19} className="shrink-0 text-gold-700" />
                  {title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
