"use client";

import Image from "next/image";
import { cx } from "@/lib/cx";
import { KIT, KIT_SAVINGS_CENTS, PRODUCTS, PURCHASE_OPTIONS, SEPARATE_TOTAL_CENTS, type Product } from "@/lib/natal/products";
import { CheckoutLink } from "./CheckoutLink";
import { IconTag, IconTree } from "./icons";
import { usePurchase } from "./PurchaseContext";
import { Money, Price, Seal } from "./ui";

/** Id do botão principal de compra: a barra fixa do celular aparece quando ele sai da tela. */
export const BUY_BUTTON_ID = "comprar";

function OptionCard({ product, checked, onSelect }: { product: Product; checked: boolean; onSelect: () => void }) {
  const isKit = product.id === "kit";
  return (
    <label
      className={cx(
        "relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-gold-400 has-focus-visible:ring-offset-2",
        checked ? "border-pine-800 bg-pine-50" : "border-pine-900/10 bg-white hover:border-pine-900/30",
      )}
    >
      <input type="radio" name="opcao-de-compra" value={product.id} checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden="true"
        className={cx("grid size-5 shrink-0 place-items-center rounded-full border-2 bg-white transition-colors", checked ? "border-pine-800" : "border-pine-900/25")}
      >
        <span className={cx("size-2.5 rounded-full bg-pine-800 transition-transform", checked ? "scale-100" : "scale-0")} />
      </span>
      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-cream-100">
        <Image src={product.image.src} alt="" fill sizes="56px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-tight text-pine-950">{product.label}</span>
        <span className="mt-0.5 block text-[0.8rem] leading-snug text-stone-600">{product.detail}</span>
        <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <Money cents={product.priceCents} className="font-bold text-pine-950" />
          {isKit && (
            <s className="text-[0.8rem] text-stone-400">
              <Money cents={SEPARATE_TOTAL_CENTS} />
            </s>
          )}
        </span>
      </span>
      {isKit && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-gold-300 px-2.5 py-1 text-[0.6rem] font-bold uppercase leading-none tracking-[0.1em] text-pine-950 shadow-card">
          Melhor custo-benefício
        </span>
      )}
    </label>
  );
}

/** Preço, seletor de opções e botão de compra: o link do botão acompanha a opção escolhida. */
export function PurchasePanel() {
  const { selected, select } = usePurchase();
  const product = PRODUCTS[selected];
  const isKit = product.id === "kit";

  return (
    <div>
      <div className="mt-5" aria-live="polite">
        {isKit && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="text-[0.9rem] text-stone-500">
              Separado:{" "}
              <s>
                <Money cents={SEPARATE_TOTAL_CENTS} />
              </s>
            </p>
            <Seal tone="gold">Preço especial de pré-venda</Seal>
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Price cents={product.priceCents} className="text-[2.75rem] text-pine-950 sm:text-[3rem]" />
          {isKit && (
            <Seal tone="berry" icon={<IconTag size={14} />}>
              Economize <Money cents={KIT_SAVINGS_CENTS} />
            </Seal>
          )}
        </div>
        <p className="mt-1.5 text-[0.9rem] text-stone-600">
          {isKit ? (
            <>
              Preço especial disponível durante o período de <span className="whitespace-nowrap">pré-venda.</span>
            </>
          ) : (
            product.detail
          )}
        </p>
      </div>

      <fieldset className="mt-6">
        <legend className="text-[0.95rem] font-bold text-pine-950">Escolha como quer comprar:</legend>
        <div className="mt-4 space-y-2.5">
          {PURCHASE_OPTIONS.map((option) => (
            <OptionCard key={option.id} product={option} checked={option.id === selected} onSelect={() => select(option.id)} />
          ))}
        </div>
      </fieldset>

      <p
        className={cx(
          "mt-3 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[0.86rem] leading-snug",
          isKit ? "bg-pine-50 text-pine-900" : "bg-berry-50 text-berry-800",
        )}
      >
        <IconTag size={18} className="mt-px shrink-0" />
        <span>
          <strong className="font-bold uppercase tracking-[0.03em]">
            Economize <Money cents={KIT_SAVINGS_CENTS} /> levando o Kit Completo
          </strong>
          {isKit ? (
            <>
              {" "}
              — separado, os três itens sairiam por <Money cents={SEPARATE_TOTAL_CENTS} />.
            </>
          ) : (
            <>
              : os três itens por <Money cents={KIT.priceCents} />.{" "}
              <button type="button" onClick={() => select("kit")} className="font-bold underline underline-offset-2">
                Escolher o kit
              </button>
            </>
          )}
        </span>
      </p>

      <CheckoutLink id={BUY_BUTTON_ID} href={product.checkout} product={product.id} placement="produto" shine className="mt-4 w-full">
        {product.cta}
        {isKit && <IconTree size={19} />}
      </CheckoutLink>
    </div>
  );
}
