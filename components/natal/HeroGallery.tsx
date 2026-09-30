"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { ImageAsset, ProductId } from "@/lib/natal/products";
import { usePurchase } from "./PurchaseContext";

/**
 * Galeria do produto: desliza com o dedo no celular e troca pelas miniaturas a partir do tablet. Ao escolher uma
 * opção de compra, mostra a imagem dela (focus: índice da imagem de cada opção).
 */
export function HeroGallery({ images, seal, focus }: { images: ImageAsset[]; seal: ReactNode; focus?: Partial<Record<ProductId, number>> }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { selected } = usePurchase();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const index = focus?.[selected];
    const track = trackRef.current;
    if (index !== undefined && track) track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }, [selected, focus]);

  function onScroll() {
    const track = trackRef.current;
    if (!track?.clientWidth) return;
    setActive(Math.min(images.length - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth))));
  }

  function show(index: number) {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-[1.75rem] bg-cream-100 shadow-card ring-1 ring-pine-900/5">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          tabIndex={0}
          role="region"
          aria-roledescription="galeria"
          aria-label="Imagens do Kit de Natal Completo"
        >
          {images.map((image, i) => (
            <div
              key={image.src}
              role="group"
              aria-roledescription="imagem"
              aria-label={`${i + 1} de ${images.length}`}
              className="relative aspect-square w-full shrink-0 snap-center snap-always"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={i === 0}
                fetchPriority={i === 0 ? "high" : undefined}
                sizes="(min-width: 1152px) 600px, (min-width: 1024px) 54vw, (min-width: 768px) 48vw, 100vw"
                className="object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute left-3 top-3 sm:left-4 sm:top-4">{seal}</div>
      </div>

      {/* Celular: indicadores */}
      <div className="mt-2 flex justify-center md:hidden">
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => show(i)}
            aria-label={`Ver imagem ${i + 1} de ${images.length}`}
            aria-current={active === i || undefined}
            className="grid h-7 w-6 place-items-center"
          >
            <span className={cx("block h-1.5 rounded-full transition-all duration-300", active === i ? "w-4 bg-pine-800" : "w-1.5 bg-pine-900/25")} />
          </button>
        ))}
      </div>

      {/* Tablet e computador: miniaturas */}
      <div className="mt-4 hidden max-w-md grid-cols-5 gap-2.5 md:grid">
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => show(i)}
            aria-label={`Ver imagem ${i + 1}: ${image.alt}`}
            aria-current={active === i || undefined}
            className={cx(
              "relative aspect-square overflow-hidden rounded-xl bg-cream-100 ring-2 ring-offset-2 ring-offset-cream-50 transition",
              active === i ? "ring-pine-800" : "ring-transparent opacity-75 hover:opacity-100",
            )}
          >
            <Image src={image.src} alt="" fill sizes="80px" className="object-cover" draggable={false} />
          </button>
        ))}
      </div>
    </div>
  );
}
