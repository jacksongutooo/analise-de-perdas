import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatBRL } from "@/lib/format";
import {
  CHECKOUT_ACESSORIOS,
  CHECKOUT_ARVORE,
  CHECKOUT_KIT,
  CHECKOUT_PISCA,
  withCampaignParams,
} from "@/lib/natal/checkout";
import { INDIVIDUAL_PRODUCTS, KIT, KIT_SAVINGS_CENTS, PRODUCTS, PURCHASE_OPTIONS, SEPARATE_TOTAL_CENTS } from "@/lib/natal/products";
import { publicFileExists } from "@/lib/natal/public-files";
import { REVIEW_PLACEHOLDER_TEXT, clampRating, formatReviewDate, initials, reviews, toReviewView } from "@/lib/natal/reviews";

const brl = (cents: number) => formatBRL(cents).replace(/ /g, " ");

describe("página do Kit de Natal: preços", () => {
  test("valores de cada produto", () => {
    assert.equal(brl(PRODUCTS.kit.priceCents), "R$ 67,90");
    assert.equal(brl(PRODUCTS.arvore.priceCents), "R$ 49,90");
    assert.equal(brl(PRODUCTS.pisca.priceCents), "R$ 19,90");
    assert.equal(brl(PRODUCTS.acessorios.priceCents), "R$ 23,90");
  });

  test("total separado e economia do kit são calculados a partir dos preços", () => {
    assert.equal(SEPARATE_TOTAL_CENTS, 9370);
    assert.equal(brl(SEPARATE_TOTAL_CENTS), "R$ 93,70");
    assert.equal(KIT_SAVINGS_CENTS, 2580);
    assert.equal(brl(KIT_SAVINGS_CENTS), "R$ 25,80");
    assert.deepEqual(
      INDIVIDUAL_PRODUCTS.map((p) => p.id),
      ["arvore", "pisca", "acessorios"],
    );
  });
});

describe("página do Kit de Natal: seletor de compra", () => {
  test("kit primeiro (opção inicial), depois árvore, pisca-pisca e acessórios", () => {
    assert.deepEqual(
      PURCHASE_OPTIONS.map((p) => p.id),
      ["kit", "arvore", "pisca", "acessorios"],
    );
    assert.deepEqual(
      PURCHASE_OPTIONS.map((p) => p.label),
      ["Kit Completo", "Somente a árvore", "Somente o pisca-pisca", "Somente os acessórios"],
    );
    assert.deepEqual(
      PURCHASE_OPTIONS.map((p) => p.cta),
      ["Quero garantir meu kit", "Comprar árvore", "Comprar pisca-pisca", "Comprar acessórios"],
    );
  });
});

describe("página do Kit de Natal: checkout", () => {
  test("cada produto usa a sua constante de checkout", () => {
    assert.equal(PRODUCTS.kit.checkout, CHECKOUT_KIT);
    assert.equal(PRODUCTS.arvore.checkout, CHECKOUT_ARVORE);
    assert.equal(PRODUCTS.pisca.checkout, CHECKOUT_PISCA);
    assert.equal(PRODUCTS.acessorios.checkout, CHECKOUT_ACESSORIOS);
    assert.equal(KIT, PRODUCTS.kit);
  });

  test("repassa os parâmetros de campanha só para links externos", () => {
    const search = "?utm_source=meta&utm_campaign=natal&fbclid=abc&outro=x";
    assert.equal(withCampaignParams("#", search), "#");
    assert.equal(withCampaignParams("#produtos-individuais", search), "#produtos-individuais");
    assert.equal(
      withCampaignParams("https://checkout.exemplo.com/kit", search),
      "https://checkout.exemplo.com/kit?utm_source=meta&utm_campaign=natal&fbclid=abc",
    );
  });

  test("não sobrescreve parâmetros que o link de checkout já tem", () => {
    assert.equal(
      withCampaignParams("https://checkout.exemplo.com/p?id=1&utm_source=site", "?utm_source=meta&utm_medium=cpc"),
      "https://checkout.exemplo.com/p?id=1&utm_source=site&utm_medium=cpc",
    );
    assert.equal(withCampaignParams("https://checkout.exemplo.com/p", ""), "https://checkout.exemplo.com/p");
    assert.equal(withCampaignParams("https://checkout.exemplo.com/p", "?pagina=2"), "https://checkout.exemplo.com/p");
  });
});

describe("página do Kit de Natal: avaliações", () => {
  test("20 avaliações provisórias, marcadas como placeholder", () => {
    assert.equal(reviews.length, 20);
    assert.equal(new Set(reviews.map((r) => r.id)).size, 20);
    reviews.forEach((review, i) => {
      const n = String(i + 1).padStart(2, "0");
      assert.equal(review.id, i + 1);
      assert.equal(review.name, `Cliente ${n}`);
      assert.equal(review.text, REVIEW_PLACEHOLDER_TEXT);
      assert.equal(review.avatar, `/images/reviews/cliente-${n}.webp`);
      assert.equal(review.verified, undefined, "compra verificada só com informação real");
    });
  });

  test("avatar com iniciais quando não há foto; selo verificado só quando informado", () => {
    const semFoto = toReviewView(reviews[0], () => false);
    assert.equal(semFoto.avatar, null);
    assert.equal(semFoto.initials, "C");
    assert.equal(semFoto.verified, false);
    assert.equal(semFoto.date, null);
    assert.equal(semFoto.product, null);

    const comFoto = toReviewView(
      { id: 30, name: "Maria da Silva", rating: 4, text: "Texto", avatar: "/images/reviews/maria.webp", date: "2026-12-10", product: "Kit Completo", verified: true },
      (src) => src === "/images/reviews/maria.webp",
    );
    assert.equal(comFoto.avatar, "/images/reviews/maria.webp");
    assert.equal(comFoto.initials, "MS");
    assert.equal(comFoto.date, "10/12/2026");
    assert.equal(comFoto.product, "Kit Completo");
    assert.equal(comFoto.verified, true);
  });

  test("iniciais, nota e data", () => {
    assert.equal(initials("Ana"), "A");
    assert.equal(initials("  joão  pedro souza "), "JS");
    assert.equal(initials("Cliente 01"), "C");
    assert.equal(initials(""), "?");
    assert.equal(clampRating(5), 5);
    assert.equal(clampRating(7), 5);
    assert.equal(clampRating(0), 1);
    assert.equal(clampRating(4.4), 4);
    assert.equal(clampRating(Number.NaN), 5);
    assert.equal(formatReviewDate("2026-12-01"), "01/12/2026");
    assert.equal(formatReviewDate("Dezembro de 2026"), "Dezembro de 2026");
    assert.equal(formatReviewDate("  "), null);
    assert.equal(formatReviewDate(undefined), null);
  });

  test("a conferência de arquivos só olha dentro de /public", () => {
    assert.equal(publicFileExists("/images/hero-kit-natal.webp"), true);
    assert.equal(publicFileExists("/images/reviews/cliente-01.webp"), false);
    assert.equal(publicFileExists("/../package.json"), false);
    assert.equal(publicFileExists("images/hero-kit-natal.webp"), false);
    assert.equal(publicFileExists("/images/..\\..\\package.json"), false);
  });
});
