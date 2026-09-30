"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cx } from "@/lib/cx";
import type { ReviewView } from "@/lib/natal/reviews";
import { IconCheckCircle, IconChevronLeft, IconChevronRight, IconQuote, IconStar } from "./icons";

/** Computador: grade de 4 colunas × 2 linhas por página. */
const PER_PAGE = 8;
/** Celular e tablet: no máximo 7 indicadores visíveis (a janela acompanha o card atual). */
const MAX_DOTS = 7;

const AVATAR_TONES = [
  "bg-pine-100 text-pine-800",
  "bg-gold-100 text-gold-700",
  "bg-berry-50 text-berry-700",
  "bg-cream-200 text-pine-900",
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`Nota ${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStar key={n} size={17} className={n <= rating ? "text-gold-500" : "text-stone-300"} />
      ))}
    </span>
  );
}

function Avatar({ review }: { review: ReviewView }) {
  if (review.avatar) {
    return <Image src={review.avatar} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      className={cx("grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold", AVATAR_TONES[review.id % AVATAR_TONES.length])}
    >
      {review.initials}
    </span>
  );
}

function ReviewCard({ review }: { review: ReviewView }) {
  const meta = [review.date, review.product && `Comprou: ${review.product}`].filter(Boolean);
  return (
    <article className="flex h-full flex-col rounded-2xl border border-pine-900/10 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <Stars rating={review.rating} />
        <IconQuote size={26} className="shrink-0 text-gold-200" />
      </div>
      <p className="mt-3 flex-1 text-pretty text-[0.95rem] leading-relaxed text-stone-700">{review.text}</p>
      <div className="mt-5 flex items-center gap-3 border-t border-dashed border-pine-900/15 pt-4">
        <Avatar review={review} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-pine-950">{review.name}</p>
          {review.verified && (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-pine-700">
              <IconCheckCircle size={14} />
              Compra verificada
            </p>
          )}
          {meta.length > 0 && <p className="mt-0.5 truncate text-xs text-stone-500">{meta.join(" · ")}</p>}
        </div>
      </div>
    </article>
  );
}

function ArrowButton({ direction, onClick, disabled, label }: { direction: "prev" | "next"; onClick: () => void; disabled: boolean; label: string }) {
  const Icon = direction === "prev" ? IconChevronLeft : IconChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-11 place-items-center rounded-full bg-white text-pine-900 shadow-card ring-1 ring-pine-900/10 transition hover:bg-pine-50 disabled:pointer-events-none disabled:opacity-35"
    >
      <Icon size={20} />
    </button>
  );
}

/** Avaliações: carrossel com o próximo card aparecendo no celular e grade paginada no computador. */
export function ReviewsCarousel({ reviews }: { reviews: ReviewView[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [page, setPage] = useState(0);
  const total = reviews.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  function cardStep(): number {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null | undefined;
    if (!track || !first) return 0;
    return first.offsetWidth + (Number.parseFloat(getComputedStyle(track).columnGap) || 0);
  }

  function onScroll() {
    const track = trackRef.current;
    const step = cardStep();
    if (!track || !step) return;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    setActive(atEnd ? total - 1 : Math.min(total - 1, Math.round(track.scrollLeft / step)));
  }

  function goTo(index: number) {
    const track = trackRef.current;
    const target = Math.min(total - 1, Math.max(0, index));
    if (track) track.scrollTo({ left: target * cardStep(), behavior: "smooth" });
  }

  const half = Math.floor(MAX_DOTS / 2);
  const start = total <= MAX_DOTS ? 0 : Math.min(Math.max(0, active - half), total - MAX_DOTS);
  const end = Math.min(total, start + MAX_DOTS);
  const dots = Array.from({ length: end - start }, (_, k) => start + k);

  return (
    <div role="region" aria-roledescription="carrossel" aria-label="Avaliações de clientes">
      <ul
        ref={trackRef}
        onScroll={onScroll}
        tabIndex={0}
        aria-label="Lista de avaliações"
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 pt-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {reviews.map((review, i) => {
          const onPage = Math.floor(i / PER_PAGE) === page;
          return (
            <li
              key={review.id}
              aria-label={`Avaliação ${i + 1} de ${total}`}
              className={cx("w-[84%] shrink-0 snap-start sm:w-[46%] lg:w-auto", !onPage && "lg:hidden")}
            >
              <ReviewCard review={review} />
            </li>
          );
        })}
      </ul>

      {/* Celular e tablet */}
      <div className="mt-3 flex items-center justify-center gap-3 lg:hidden">
        <div className="hidden sm:block">
          <ArrowButton direction="prev" label="Avaliação anterior" onClick={() => goTo(active - 1)} disabled={active === 0} />
        </div>
        <div className="flex items-center" aria-label={`Avaliação ${active + 1} de ${total}`}>
          {dots.map((i) => {
            const edge = (i === start && start > 0) || (i === end - 1 && end < total);
            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir para a avaliação ${i + 1}`}
                aria-current={i === active || undefined}
                className="grid h-7 w-5 place-items-center"
              >
                <span
                  className={cx(
                    "block rounded-full transition-all duration-300",
                    i === active ? "h-1.5 w-4 bg-pine-800" : edge ? "size-1 bg-pine-900/20" : "size-1.5 bg-pine-900/25",
                  )}
                />
              </button>
            );
          })}
        </div>
        <div className="hidden sm:block">
          <ArrowButton direction="next" label="Próxima avaliação" onClick={() => goTo(active + 1)} disabled={active >= total - 1} />
        </div>
      </div>

      {/* Computador */}
      {pages > 1 && (
        <div className="mt-8 hidden items-center justify-center gap-4 lg:flex">
          <ArrowButton direction="prev" label="Avaliações anteriores" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} />
          <div className="flex items-center gap-2">
            {Array.from({ length: pages }, (_, p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-label={`Página ${p + 1} de ${pages}`}
                aria-current={p === page || undefined}
                className="grid h-8 w-6 place-items-center"
              >
                <span className={cx("block h-2 rounded-full transition-all duration-300", p === page ? "w-6 bg-pine-800" : "w-2 bg-pine-900/25 hover:bg-pine-900/45")} />
              </button>
            ))}
          </div>
          <ArrowButton direction="next" label="Próximas avaliações" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} />
        </div>
      )}
    </div>
  );
}
