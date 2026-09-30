// Produtos, preços e imagens da página /kit-de-natal. Preços em centavos: a economia do kit é calculada daqui.
import { CHECKOUT_ACESSORIOS, CHECKOUT_ARVORE, CHECKOUT_KIT, CHECKOUT_PISCA } from "./checkout";

export type ImageAsset = { src: string; width: number; height: number; alt: string };

// Imagens em /public/images. As atuais são ilustrações provisórias: substitua pelas fotos reais mantendo o
// mesmo nome de arquivo e a mesma proporção (quadradas, exceto embalagem 4:3 e ambiente 16:10).
export const IMAGES = {
  hero: { src: "/images/hero-kit-natal.webp", width: 1200, height: 1200, alt: "Árvore de Natal de 1,5 m montada e decorada com pisca-pisca LED e enfeites" },
  kit: { src: "/images/kit-completo.webp", width: 1200, height: 1200, alt: "Kit de Natal Completo: árvore de 1,5 m, pisca-pisca LED e acessórios de decoração" },
  arvore: { src: "/images/arvore-150cm.webp", width: 1000, height: 1000, alt: "Árvore de Natal com aproximadamente 1,5 metro de altura" },
  pisca: { src: "/images/pisca-pisca-led.webp", width: 1000, height: 1000, alt: "Pisca-pisca de LED aceso" },
  acessorios: { src: "/images/acessorios-natal.webp", width: 1000, height: 1000, alt: "Acessórios e enfeites para decorar a árvore de Natal" },
  embalagem: { src: "/images/embalagem-kit.webp", width: 1200, height: 900, alt: "Caixa de papelão com proteção interna de isopor para o transporte do kit" },
  ambiente: { src: "/images/natal-ambiente.webp", width: 1600, height: 1000, alt: "Sala aconchegante com árvore de Natal iluminada" },
} satisfies Record<string, ImageAsset>;

export type ProductId = "kit" | "arvore" | "pisca" | "acessorios";

export type Product = {
  id: ProductId;
  /** Opção no seletor de compra ("Somente a árvore") */
  label: string;
  /** Nome do produto (barra fixa de compra) */
  name: string;
  /** Nome curto nas listas de preço ("Pisca-pisca") */
  shortName: string;
  /** Linha de detalhe da opção */
  detail: string;
  priceCents: number;
  checkout: string;
  /** Texto do botão de compra quando a opção está selecionada */
  cta: string;
  image: ImageAsset;
};

export const PRODUCTS: Record<ProductId, Product> = {
  kit: {
    id: "kit",
    label: "Kit Completo",
    name: "Kit Completo",
    shortName: "Kit Completo",
    detail: "Árvore 1,5\u00a0m + Pisca-pisca LED + Acessórios",
    priceCents: 6790,
    checkout: CHECKOUT_KIT,
    cta: "Quero garantir meu kit",
    image: IMAGES.kit,
  },
  arvore: {
    id: "arvore",
    label: "Somente a árvore",
    name: "Árvore 1,5\u00a0m",
    shortName: "Árvore",
    detail: "Árvore de Natal de aproximadamente 1,5 metro.",
    priceCents: 4990,
    checkout: CHECKOUT_ARVORE,
    cta: "Comprar árvore",
    image: IMAGES.arvore,
  },
  pisca: {
    id: "pisca",
    label: "Somente o pisca-pisca",
    name: "Pisca-pisca LED",
    shortName: "Pisca-pisca",
    detail: "Pisca-pisca em LED com várias opções/programações de iluminação.",
    priceCents: 1990,
    checkout: CHECKOUT_PISCA,
    cta: "Comprar pisca-pisca",
    image: IMAGES.pisca,
  },
  acessorios: {
    id: "acessorios",
    label: "Somente os acessórios",
    name: "Acessórios",
    shortName: "Acessórios",
    detail: "Kit de acessórios e enfeites para decoração.",
    priceCents: 2390,
    checkout: CHECKOUT_ACESSORIOS,
    cta: "Comprar acessórios",
    image: IMAGES.acessorios,
  },
};

export const KIT = PRODUCTS.kit;
export const INDIVIDUAL_PRODUCTS = [PRODUCTS.arvore, PRODUCTS.pisca, PRODUCTS.acessorios];
/** Ordem das opções no seletor de compra. */
export const PURCHASE_OPTIONS = [KIT, ...INDIVIDUAL_PRODUCTS];

/** Soma dos três produtos comprados separadamente (R$ 93,70). */
export const SEPARATE_TOTAL_CENTS = INDIVIDUAL_PRODUCTS.reduce((sum, product) => sum + product.priceCents, 0);
/** Economia levando o kit (R$ 25,80). */
export const KIT_SAVINGS_CENTS = SEPARATE_TOTAL_CENTS - KIT.priceCents;
