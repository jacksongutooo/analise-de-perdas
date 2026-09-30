import type { ReactNode } from "react";
import type { IconProps } from "@/components/icons";

// Ícones da página /kit-de-natal, no mesmo traço dos ícones do projeto (components/icons.tsx).
export { IconCheck, IconChevronLeft, IconChevronRight, IconLayers, IconPlus, IconShield } from "@/components/icons";

function icon({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconTree = (p: IconProps) =>
  icon({ ...p, children: <path d="M12 2.8 7.6 8.6h2.3l-3.7 5.1h2.6L5 19.2h14l-3.8-5.5h2.6l-3.7-5.1h2.3zM12 19.2v2.3" /> });

export const IconSparkles = (p: IconProps) =>
  icon({
    ...p,
    children: <path d="M11 3.5c.5 3.9 2.4 5.8 6.3 6.3-3.9.5-5.8 2.4-6.3 6.3-.5-3.9-2.4-5.8-6.3-6.3 3.9-.5 5.8-2.4 6.3-6.3zM18.5 14.5v5M16 17h5" />,
  });

export const IconLights = (p: IconProps) =>
  icon({
    ...p,
    children: (
      <>
        <path d="M2.5 5c3 2.6 6.5 2.6 9.5 0 3 2.6 6.5 2.6 9.5 0M7.2 7v1.4M16.8 7v1.4M12 5v1.4" />
        <ellipse cx="7.2" cy="10.9" rx="1.8" ry="2.4" />
        <ellipse cx="16.8" cy="10.9" rx="1.8" ry="2.4" />
        <ellipse cx="12" cy="8.9" rx="1.8" ry="2.4" />
      </>
    ),
  });

export const IconGift = (p: IconProps) =>
  icon({
    ...p,
    children: (
      <>
        <rect x="3.5" y="8" width="17" height="4.5" rx="1" />
        <path d="M5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7M12 8v13M12 8c-1.2-2.7-3.8-4.3-5.2-3.1-1.2 1 .1 3.1 5.2 3.1zM12 8c1.2-2.7 3.8-4.3 5.2-3.1 1.2 1-.1 3.1-5.2 3.1z" />
      </>
    ),
  });

export const IconTruck = (p: IconProps) =>
  icon({
    ...p,
    children: (
      <>
        <path d="M5.1 16.5H3.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1H13a1 1 0 0 1 1 1v10M14 9.5h3.6l3.4 4.2v1.8a1 1 0 0 1-1 1h-.6M8.9 16.5h6.7" />
        <circle cx="7" cy="16.5" r="1.9" />
        <circle cx="17.5" cy="16.5" r="1.9" />
      </>
    ),
  });

export const IconBox = (p: IconProps) =>
  icon({ ...p, children: <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7zM3.5 7 12 11.2 20.5 7M12 11.2v10M7.8 4.9l8.5 4.3" /> });

export const IconTag = (p: IconProps) =>
  icon({
    ...p,
    children: (
      <>
        <path d="M3.5 12.1V4.5a1 1 0 0 1 1-1h7.6a1 1 0 0 1 .7.3l7.9 7.9a1 1 0 0 1 0 1.4l-7.6 7.6a1 1 0 0 1-1.4 0l-7.9-7.9a1 1 0 0 1-.3-.7z" />
        <circle cx="8" cy="8" r="1.5" />
      </>
    ),
  });

export const IconCalendar = (p: IconProps) =>
  icon({
    ...p,
    children: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
  });

export const IconCheckCircle = (p: IconProps) =>
  icon({
    ...p,
    children: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.4 12.3 2.4 2.4 4.8-5" />
      </>
    ),
  });

export const IconArrowDown = (p: IconProps) => icon({ ...p, children: <path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" /> });
export const IconArrowRight = (p: IconProps) => icon({ ...p, children: <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" /> });

/** Estrela cheia (notas das avaliações). */
export const IconStar = (p: IconProps) =>
  icon({
    ...p,
    fill: "currentColor",
    stroke: "none",
    children: <path d="M12 2.9l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2l-5.6 2.9 1.1-6.2L3 9.5l6.2-.9z" />,
  });

/** Aspas decorativas dos cards de avaliação. */
export const IconQuote = (p: IconProps) =>
  icon({
    ...p,
    fill: "currentColor",
    stroke: "none",
    children: <path d="M9.6 6.5C6.4 7.6 4.8 9.9 4.8 13v4.5h5.4v-5.4H7.5c.1-1.9 1-3.2 3-3.9zm9 0c-3.2 1.1-4.8 3.4-4.8 6.5v4.5h5.4v-5.4h-2.7c.1-1.9 1-3.2 3-3.9z" />,
  });
