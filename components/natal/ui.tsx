import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { formatBRL } from "@/lib/format";
import { IconSparkles } from "./icons";

// Peças visuais da página /kit-de-natal.

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export type CtaVariant = "berry" | "pine" | "light" | "outline";
export type CtaSize = "md" | "lg";

const CTA_VARIANTS: Record<CtaVariant, string> = {
  berry: "bg-berry-600 text-white shadow-[0_10px_24px_-12px_rgb(163_30_38/0.75)] hover:bg-berry-700 active:bg-berry-800",
  pine: "bg-pine-900 text-white hover:bg-pine-800 active:bg-pine-950",
  light: "bg-cream-50 text-pine-950 hover:bg-white",
  outline: "bg-white text-pine-900 ring-1 ring-inset ring-pine-900/20 hover:bg-pine-50 hover:ring-pine-900/35",
};

export function ctaClasses(variant: CtaVariant = "berry", size: CtaSize = "lg", className?: string): string {
  return cx(
    "inline-flex select-none items-center justify-center gap-2 rounded-xl text-center font-bold uppercase tracking-[0.07em] transition duration-200 hover:-translate-y-0.5 active:translate-y-0",
    size === "lg" && "min-h-14 px-6 text-[0.92rem]",
    size === "md" && "min-h-12 px-5 text-[0.8rem]",
    CTA_VARIANTS[variant],
    className,
  );
}

/** Preço no padrão do varejo: "R$" e centavos menores. Leitores de tela recebem o valor completo. */
export function Price({ cents, className }: { cents: number; className?: string }) {
  const reais = Math.floor(cents / 100).toLocaleString("pt-BR");
  const centavos = String(cents % 100).padStart(2, "0");
  return (
    <span className={cx("inline-flex whitespace-nowrap font-bold leading-none tracking-[-0.02em] tabular-nums", className)}>
      <span className="sr-only">{formatBRL(cents)}</span>
      <span aria-hidden="true" className="inline-flex items-start">
        <span className="mr-[0.12em] mt-[0.2em] text-[0.4em] font-semibold tracking-normal">R$</span>
        <span>{reais}</span>
        <span className="mt-[0.1em] text-[0.46em]">,{centavos}</span>
      </span>
    </span>
  );
}

/** Valor em reais sem quebrar linha entre "R$" e o número. */
export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={cx("whitespace-nowrap tabular-nums", className)}>{formatBRL(cents)}</span>;
}

type SealTone = "berry" | "gold" | "goldSolid" | "pine" | "onDark" | "dark";

const SEAL_TONES: Record<SealTone, string> = {
  berry: "bg-berry-600 text-white",
  gold: "bg-gold-100 text-gold-700 ring-1 ring-inset ring-gold-400/50",
  goldSolid: "bg-gold-300 text-pine-950 shadow-card",
  pine: "bg-pine-50 text-pine-800 ring-1 ring-inset ring-pine-200",
  onDark: "bg-gold-300/15 text-gold-200 ring-1 ring-inset ring-gold-300/35",
  dark: "bg-pine-950/90 text-gold-200 shadow-card ring-1 ring-inset ring-gold-300/30 backdrop-blur-sm",
};

/** Selo em pílula (pré-venda, frete grátis, economia...). */
export function Seal({ children, tone = "berry", icon, className }: { children: ReactNode; tone?: SealTone; icon?: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.7rem] font-bold uppercase leading-none tracking-[0.1em]",
        SEAL_TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Eyebrow({ children, dark = false, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <p className={cx("inline-flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.18em]", dark ? "text-gold-300" : "text-gold-700", className)}>
      <IconSparkles size={15} className={dark ? "text-gold-300" : "text-gold-500"} />
      {children}
    </p>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  dark = false,
  align = "center",
  className,
}: {
  id: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  dark?: boolean;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cx("reveal", align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      {eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}
      <h2
        id={id}
        className={cx(
          "mt-3 text-balance font-display text-[1.95rem] font-semibold leading-[1.08] tracking-[-0.015em] sm:text-[2.45rem]",
          dark ? "text-cream-50" : "text-pine-950",
        )}
      >
        {title}
      </h2>
      {intro && <p className={cx("mt-4 text-pretty text-[1.02rem] leading-relaxed", dark ? "text-cream-100/80" : "text-stone-600")}>{intro}</p>}
    </div>
  );
}
