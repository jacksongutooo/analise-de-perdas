import { IMAGES, KIT, type ProductId } from "@/lib/natal/products";
import { HeroGallery } from "./HeroGallery";
import { IconBox, IconCheck, IconShield, IconTree, IconTruck } from "./icons";
import { PurchasePanel } from "./PurchasePanel";
import { Container, Money, Seal } from "./ui";

// Bloco principal da página de produto: galeria de um lado e área de compra do outro (no celular, galeria primeiro).

const GALLERY = [IMAGES.hero, IMAGES.kit, IMAGES.arvore, IMAGES.pisca, IMAGES.acessorios];
/** Imagem da galeria mostrada ao escolher cada opção de compra. */
const GALLERY_FOCUS: Record<ProductId, number> = { kit: 0, arvore: 2, pisca: 3, acessorios: 4 };

const CHECKLIST = ["Árvore de 1,5 m", "Pisca-pisca LED", "Várias programações de iluminação", "Enfeites inclusos", "Frete grátis", "Embalagem protegida"];

const BENEFITS = [
  { icon: IconBox, title: "Embalagem reforçada" },
  { icon: IconShield, title: "Proteção com isopor" },
  { icon: IconTree, title: "Produtos protegidos durante o transporte" },
  { icon: IconTruck, title: "Frete grátis" },
];

export function ProductSection() {
  return (
    <section id="produto" aria-labelledby="produto-title" className="bg-white">
      <Container className="grid gap-6 pb-12 pt-4 sm:pt-6 md:grid-cols-2 md:gap-8 lg:grid-cols-12 lg:gap-12 lg:pb-16 lg:pt-8">
        <div className="md:sticky md:top-6 md:self-start lg:col-span-7">
          <HeroGallery
            images={GALLERY}
            focus={GALLERY_FOCUS}
            seal={
              <Seal tone="dark" icon={<IconTree size={14} />}>
                Pré-venda especial de Natal
              </Seal>
            }
          />
        </div>

        <div className="lg:col-span-5">
          <Seal tone="berry" icon={<IconTree size={14} />}>
            Pré-venda limitada
          </Seal>
          <p className="mt-4 flex items-center gap-1.5 text-[0.75rem] font-bold uppercase tracking-[0.16em] text-gold-700">
            O Natal da sua casa começa aqui
            <IconTree size={15} className="shrink-0" />
          </p>
          <h1
            id="produto-title"
            className="mt-1.5 text-balance font-display text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.015em] text-pine-950 sm:text-[2.5rem]"
          >
            Kit de Natal Completo
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-stone-600">
            Árvore de 1,5&nbsp;m + Pisca-Pisca LED + Enfeites em um único kit para deixar sua casa pronta para o Natal.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[0.88rem] font-medium leading-snug text-pine-950">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-px grid size-[1.1rem] shrink-0 place-items-center rounded-full bg-pine-800 text-white">
                  <IconCheck size={11} strokeWidth={2.6} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <PurchasePanel />

          <p className="mt-4 flex items-center justify-center gap-2 text-[0.92rem] font-semibold text-pine-800">
            <IconTruck size={20} className="shrink-0" />
            Frete Grátis para Todo o Brasil
          </p>

          <ul className="mt-5 divide-y divide-pine-900/10 rounded-2xl border border-pine-900/10 bg-cream-50/70 px-4">
            {BENEFITS.map(({ icon: Icon, title }) => (
              <li key={title} className="flex items-center gap-3 py-2.5 text-[0.86rem] font-semibold leading-snug text-pine-950">
                <Icon size={19} className="shrink-0 text-gold-700" />
                {title}
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-2xl border border-gold-300/70 bg-gold-100/50 p-4">
            <h2 className="flex items-center gap-2 text-[0.98rem] font-bold text-pine-950">
              <IconTree size={18} className="shrink-0 text-gold-700" />
              <span>
                Condição Especial de <span className="whitespace-nowrap">Pré-Venda</span>
              </span>
            </h2>
            <p className="mt-1.5 text-pretty text-[0.88rem] leading-relaxed text-stone-600">
              Estamos disponibilizando o Kit de Natal Completo com preço promocional durante o período de pré-venda. A condição de{" "}
              <Money cents={KIT.priceCents} className="font-semibold text-pine-950" /> é limitada a esta etapa da campanha e poderá ser alterada após o
              encerramento da pré-venda.
            </p>
            <p className="mt-1.5 text-[0.88rem] font-semibold text-pine-800">Garanta o seu durante a condição promocional.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
