// Avaliações exibidas na página /kit-de-natal.

export type Review = {
  id: number;
  name: string;
  /** Nota de 1 a 5 */
  rating: number;
  text: string;
  /** Foto em /public/images/reviews/. Enquanto o arquivo não existir, aparece um avatar neutro com as iniciais. */
  avatar?: string;
  /** Opcional: "2026-12-10" (vira 10/12/2026) ou texto livre, como "Dezembro de 2026" */
  date?: string;
  /** Opcional: produto comprado, ex.: "Kit Completo" */
  product?: string;
  /** Opcional: true SOMENTE quando a compra for confirmada. Sem isso, o selo "Compra verificada" não aparece. */
  verified?: boolean;
};

export const REVIEW_PLACEHOLDER_TEXT = "AVALIAÇÃO REAL SERÁ INSERIDA AQUI";

// PLACEHOLDER: substituir pelas avaliações reais fornecidas pelo cliente antes da publicação final
export const reviews: Review[] = [
  { id: 1, name: "Cliente 01", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-01.webp" },
  { id: 2, name: "Cliente 02", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-02.webp" },
  { id: 3, name: "Cliente 03", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-03.webp" },
  { id: 4, name: "Cliente 04", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-04.webp" },
  { id: 5, name: "Cliente 05", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-05.webp" },
  { id: 6, name: "Cliente 06", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-06.webp" },
  { id: 7, name: "Cliente 07", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-07.webp" },
  { id: 8, name: "Cliente 08", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-08.webp" },
  { id: 9, name: "Cliente 09", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-09.webp" },
  { id: 10, name: "Cliente 10", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-10.webp" },
  { id: 11, name: "Cliente 11", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-11.webp" },
  { id: 12, name: "Cliente 12", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-12.webp" },
  { id: 13, name: "Cliente 13", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-13.webp" },
  { id: 14, name: "Cliente 14", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-14.webp" },
  { id: 15, name: "Cliente 15", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-15.webp" },
  { id: 16, name: "Cliente 16", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-16.webp" },
  { id: 17, name: "Cliente 17", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-17.webp" },
  { id: 18, name: "Cliente 18", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-18.webp" },
  { id: 19, name: "Cliente 19", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-19.webp" },
  { id: 20, name: "Cliente 20", rating: 5, text: "AVALIAÇÃO REAL SERÁ INSERIDA AQUI", avatar: "/images/reviews/cliente-20.webp" },
];

/** Dados já prontos para exibir no card (o avatar só vem quando o arquivo existe). */
export type ReviewView = {
  id: number;
  name: string;
  rating: number;
  text: string;
  initials: string;
  avatar: string | null;
  date: string | null;
  product: string | null;
  verified: boolean;
};

/** "Maria Souza" → "MS"; "Ana" → "A"; "Cliente 01" → "C" (só letras). */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}]/gu, ""))
    .filter(Boolean);
  if (!words.length) return "?";
  const first = (words[0] ?? "").charAt(0);
  const last = words.length > 1 ? (words[words.length - 1] ?? "").charAt(0) : "";
  return (first + last).toLocaleUpperCase("pt-BR");
}

export function clampRating(rating: number): number {
  if (!Number.isFinite(rating)) return 5;
  return Math.min(5, Math.max(1, Math.round(rating)));
}

/** "2026-12-10" → "10/12/2026"; outros textos ficam como vieram. */
export function formatReviewDate(date: string | undefined): string | null {
  const value = date?.trim();
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : value;
}

export function toReviewView(review: Review, avatarExists: (src: string) => boolean): ReviewView {
  const avatar = review.avatar?.trim();
  return {
    id: review.id,
    name: review.name,
    rating: clampRating(review.rating),
    text: review.text,
    initials: initials(review.name),
    avatar: avatar && avatarExists(avatar) ? avatar : null,
    date: formatReviewDate(review.date),
    product: review.product?.trim() || null,
    verified: review.verified === true,
  };
}
