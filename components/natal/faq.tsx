import type { ReactNode } from "react";
import { INDIVIDUAL_PRODUCTS, KIT } from "@/lib/natal/products";
import { NOT_INFORMED, PRE_SALE, STORE_LINKS } from "@/lib/natal/store";
import { IconArrowRight, IconPlus } from "./icons";
import { Money, SectionHeading } from "./ui";

function Pending({ value }: { value: string }) {
  return value ? <>{value}</> : <span className="italic text-stone-400">{NOT_INFORMED}</span>;
}

const FAQ: { id?: string; question: string; answer: ReactNode }[] = [
  {
    question: "Qual é o tamanho da árvore?",
    answer: <p>A árvore possui aproximadamente 1,5 metro de altura.</p>,
  },
  {
    question: "O que vem no Kit Completo?",
    answer: <p>Árvore de Natal de 1,5 m, pisca-pisca LED com várias programações e kit de acessórios/enfeites.</p>,
  },
  {
    question: "O pisca-pisca possui diferentes modos?",
    answer: <p>Sim. O pisca-pisca utiliza LEDs e possui várias programações de iluminação.</p>,
  },
  {
    question: "Posso comprar separadamente?",
    answer: (
      <>
        <p>Sim.</p>
        <ul className="mt-2 space-y-1">
          {INDIVIDUAL_PRODUCTS.map((product) => (
            <li key={product.id}>
              {product.shortName}: <Money cents={product.priceCents} className="font-semibold text-pine-950" />
            </li>
          ))}
        </ul>
        <p className="mt-2">
          O Kit Completo custa <Money cents={KIT.priceCents} className="font-semibold text-pine-950" /> durante a condição promocional de pré-venda.
        </p>
      </>
    ),
  },
  {
    id: "faq-pre-venda",
    question: "O que significa pré-venda?",
    // A política de pré-venda é definida pela loja: os prazos vêm de lib/natal/store.ts (PRE_SALE).
    answer: (
      <>
        <p>
          Na pré-venda, você garante o Kit de Natal Completo pela condição especial desta etapa da campanha (
          <Money cents={KIT.priceCents} />
          ), antes do início dos envios.
        </p>
        <dl className="mt-3 space-y-1.5 rounded-xl bg-cream-50 p-4 text-[0.92rem]">
          <div>
            <dt className="inline font-semibold text-pine-950">Previsão de início dos envios: </dt>
            <dd className="inline">
              <Pending value={PRE_SALE.shippingStart} />
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold text-pine-950">Prazo de processamento: </dt>
            <dd className="inline">
              <Pending value={PRE_SALE.processingTime} />
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold text-pine-950">Previsão de entrega: </dt>
            <dd className="inline">
              <Pending value={PRE_SALE.deliveryEstimate} />
            </dd>
          </div>
        </dl>
      </>
    ),
  },
  {
    question: "Como o produto é enviado?",
    answer: <p>O produto é preparado para transporte utilizando proteção com isopor e caixa de papelão.</p>,
  },
  {
    question: "O frete é grátis?",
    answer: <p>Sim, conforme regiões atendidas pela operação.</p>,
  },
  {
    question: "A árvore já vem decorada?",
    answer: <p>Os itens de decoração acompanham o Kit Completo, mas a montagem e a decoração são realizadas pelo cliente.</p>,
  },
  {
    id: "faq-rastreio",
    question: "Consigo acompanhar meu pedido?",
    // Área de rastreamento: preencha STORE_LINKS.rastreio (lib/natal/store.ts) quando a integração estiver disponível.
    answer: STORE_LINKS.rastreio ? (
      <>
        <p>Sim. Acompanhe a entrega do seu pedido pela página de rastreamento.</p>
        <a
          href={STORE_LINKS.rastreio}
          className="mt-3 inline-flex items-center gap-2 font-semibold text-pine-800 underline decoration-gold-400 decoration-2 underline-offset-4"
        >
          Rastrear meu pedido
          <IconArrowRight size={16} />
        </a>
      </>
    ) : (
      <p>Sim. O acompanhamento do pedido ficará disponível nesta área assim que a integração de rastreamento estiver ativa.</p>
    ),
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-cream-50 py-14 sm:py-20">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading id="faq-title" eyebrow="Dúvidas" title="Perguntas Frequentes" />
        <div className="natal-faq mt-8 divide-y divide-pine-900/10 rounded-[1.75rem] border border-pine-900/10 bg-white px-5 shadow-card sm:mt-10 sm:px-7">
          {FAQ.map((item) => (
            <details key={item.question} id={item.id} name="faq" className="group scroll-mt-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-[1.02rem] font-semibold leading-snug text-pine-950 transition-colors hover:text-pine-700">
                {item.question}
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-pine-50 text-pine-800 transition duration-300 group-open:rotate-45 group-open:bg-pine-900 group-open:text-white">
                  <IconPlus size={17} />
                </span>
              </summary>
              <div className="pb-6 pr-2 text-[0.97rem] leading-relaxed text-stone-600 sm:pr-12">{item.answer}</div>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center leading-relaxed text-stone-600">
          Não encontrou o que procurava?{" "}
          <a href={STORE_LINKS.atendimento} className="font-semibold text-pine-800 underline decoration-gold-400 decoration-2 underline-offset-4">
            Fale com o atendimento
          </a>
          .
        </p>
      </div>
    </section>
  );
}
