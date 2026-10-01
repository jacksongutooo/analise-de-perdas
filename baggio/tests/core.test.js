// Testes das regras da loja (sem navegador): node --test baggio/tests/
const assert = require("node:assert/strict");
const { describe, test } = require("node:test");
const config = require("../js/config.js");
const reviewsData = require("../js/reviews.js");
const core = require("../js/core.js");

const catalog = core.createCatalog(config);
const brl = (cents) => core.formatBRL(cents).replace(/\u00a0/g, " ");
const offer = (id) => catalog.offerById[id];

/** Configuração com alterações pontuais, sem mexer na original. */
function withConfig(changes) {
  const copy = JSON.parse(JSON.stringify(config));
  changes(copy);
  return core.createCatalog(copy);
}

/** Seleção pronta: kit + sabores na ordem dos pacotes. */
function pick(cat, offerId, flavorIds) {
  let selection = core.changeOffer(cat, null, offerId);
  flavorIds.forEach((id, i) => {
    selection = core.setSlot(cat, selection, i, id);
  });
  return selection;
}

describe("preços: promoção com o preço normal riscado (calculado do pacote avulso)", () => {
  test("pacote de 250g: de R$ 40,90 por R$ 29,90 (promoção)", () => {
    const o = offer("1x250");
    assert.equal(brl(o.priceCents), "R$ 29,90");
    assert.equal(brl(o.referenceCents), "R$ 40,90");
    assert.equal(brl(o.savingsCents), "R$ 11,00");
    assert.equal(o.discountPercent, 26); // 26,9%
  });

  test("pacote de 500g: de R$ 75,00 por R$ 39,90 (promoção)", () => {
    const o = offer("1x500");
    assert.equal(brl(o.priceCents), "R$ 39,90");
    assert.equal(brl(o.referenceCents), "R$ 75,00");
    assert.equal(brl(o.savingsCents), "R$ 35,10");
    assert.equal(o.discountPercent, 46); // 46,8%
  });

  test("Kit Variedade 4 × 250g: 1kg por R$ 69,90, de R$ 163,60 (4 × preço normal), ≈ R$ 17,47 por pacote", () => {
    const o = offer("4x250");
    assert.equal(brl(o.priceCents), "R$ 69,90");
    assert.equal(o.totalGrams, 1000);
    assert.equal(core.formatWeight(o.totalGrams), "1kg");
    assert.equal(brl(o.referenceCents), "R$ 163,60");
    assert.equal(brl(o.savingsCents), "R$ 93,70");
    assert.equal(brl(o.perPackCents), "R$ 17,47"); // 17,475 → arredonda para baixo no empate
    assert.equal(o.perPackExact, false);
    assert.equal(o.badge, "MELHOR OFERTA");
  });

  test("Kit Favoritos 2 × 500g: 1kg pelo mesmo preço, de R$ 150,00, R$ 34,95 por pacote", () => {
    const o = offer("2x500");
    assert.equal(brl(o.priceCents), "R$ 69,90");
    assert.equal(o.totalGrams, 1000);
    assert.equal(brl(o.referenceCents), "R$ 150,00");
    assert.equal(brl(o.savingsCents), "R$ 80,10");
    assert.equal(brl(o.perPackCents), "R$ 34,95");
    assert.equal(o.perPackExact, true);
  });

  test("percentual de desconto arredondado para baixo (nunca maior que o real)", () => {
    assert.equal(offer("4x250").discountPercent, 57); // 57,3%
    assert.equal(offer("2x500").discountPercent, 53); // 53,4%
  });

  test("quadro da promoção: preço normal e promocional de cada pacote", () => {
    assert.deepEqual(
      catalog.packPromos.map((p) => [p.size, brl(p.regularCents), brl(p.priceCents)]),
      [
        [250, "R$ 40,90", "R$ 29,90"],
        [500, "R$ 75,00", "R$ 39,90"],
      ],
    );
  });

  test("os preços vêm só da configuração central", () => {
    const cat = withConfig((c) => {
      c.prices.regular250 = 50;
      c.offers.find((o) => o.id === "4x250").price = 120;
    });
    assert.equal(cat.offerById["4x250"].referenceCents, 20000);
    assert.equal(cat.offerById["4x250"].savingsCents, 8000);
  });

  test("sem preço normal (fim da promoção), a referência é o preço atual do pacote", () => {
    const cat = withConfig((c) => {
      delete c.prices.regular250;
    });
    assert.equal(cat.offerById["1x250"].savingsCents, 0);
    assert.equal(brl(cat.offerById["4x250"].referenceCents), "R$ 119,60"); // 4 × R$ 29,90
    assert.deepEqual(
      cat.packPromos.map((p) => p.size),
      [500],
    );
  });

  test("formatação em reais", () => {
    assert.equal(brl(0), "R$ 0,00");
    assert.equal(brl(1500), "R$ 15,00");
    assert.equal(brl(11499), "R$ 114,99");
    assert.equal(brl(123456), "R$ 1.234,56");
    assert.equal(core.toCents(40.9), 4090);
    assert.equal(core.toCents(99.99), 9999);
    assert.equal(core.toCents(null), null);
  });
});

describe("menu de ofertas", () => {
  test("primeira área: 1 pacote 250g, 1 pacote 500g e 1KG; kits sem preço ficam fora", () => {
    assert.deepEqual(catalog.menu.main, ["1x250", "1x500", "1kg"]);
    assert.deepEqual(catalog.menu.oneKg.offers, ["4x250", "2x500"]);
    assert.deepEqual(catalog.menu.more, []);
    assert.equal(catalog.offerById["2x250"], undefined);
    assert.equal(catalog.offerById["3x250"], undefined);
    assert.equal(catalog.menu.defaultOfferId, "1x250");
  });

  test("kit desligado volta com preço e active: true", () => {
    const cat = withConfig((c) => {
      const kit3 = c.offers.find((o) => o.id === "3x250");
      kit3.active = true;
      kit3.price = 59.9; // preço só de teste
    });
    assert.equal(brl(cat.offerById["3x250"].priceCents), "R$ 59,90");
    assert.equal(brl(cat.offerById["3x250"].referenceCents), "R$ 122,70");
    assert.deepEqual(cat.menu.more, ["3x250"]);
  });

  test("as duas opções de 1kg têm o mesmo preço e 1kg cada", () => {
    const g = core.groupSummary(catalog, catalog.menu.oneKg.offers);
    assert.equal(g.samePrice, true);
    assert.equal(g.minPriceCents, 6990);
    assert.equal(g.maxSavingsCents, 9370);
    g.offers.forEach((o) => assert.equal(o.totalGrams, 1000));
  });

  test("sugestão de kit maior com a diferença real de preço", () => {
    const up250 = core.upgradeFor(catalog, "1x250");
    assert.equal(up250.offer.id, "4x250");
    assert.equal(brl(up250.extraCents), "R$ 40,00");
    const up500 = core.upgradeFor(catalog, "1x500");
    assert.equal(up500.offer.id, "2x500");
    assert.equal(brl(up500.extraCents), "R$ 30,00");
    assert.equal(core.upgradeFor(catalog, "4x250"), null);
    assert.equal(core.upgradeFor(catalog, "2x500"), null);
  });
});

describe("monte seu kit", () => {
  test("sabores diferentes, repetidos ou todos iguais", () => {
    const mixed = pick(catalog, "4x250", ["caramelo", "chocolate-com-avela", "caramelo", "bourbon"]);
    assert.equal(core.selectionStatus(catalog, mixed).complete, true);
    const groups = core.groupFlavors(catalog, mixed.slots).map((g) => `${g.quantity}× ${g.flavor.name}`);
    assert.deepEqual(groups, ["2× Caramelo", "1× Chocolate com Avelã", "1× Bourbon"]);

    const same = pick(catalog, "4x250", ["caramelo", "caramelo", "caramelo", "caramelo"]);
    assert.deepEqual(core.groupFlavors(catalog, same.slots).map((g) => g.quantity), [4]);
  });

  test("progresso: 3 de 4 sabores escolhidos e kit pronto", () => {
    let s = pick(catalog, "4x250", ["caramelo", "bourbon", "espresso"]);
    let status = core.selectionStatus(catalog, s);
    assert.equal(status.filled, 3);
    assert.equal(status.total, 4);
    assert.deepEqual(status.missing, [3]);
    assert.equal(status.complete, false);
    s = core.setSlot(catalog, s, 3, "baunilha");
    status = core.selectionStatus(catalog, s);
    assert.equal(status.complete, true);
  });

  test("trocar o sabor de qualquer pacote", () => {
    let s = pick(catalog, "4x250", ["caramelo", "bourbon", "espresso", "baunilha"]);
    s = core.setSlot(catalog, s, 1, "chocolate-com-menta");
    assert.deepEqual(s.slots, ["caramelo", "chocolate-com-menta", "espresso", "baunilha"]);
  });

  test("completar os pacotes vazios com o mesmo sabor", () => {
    let s = pick(catalog, "4x250", ["bourbon"]);
    s = core.fillEmptySlots(catalog, s, "caramelo");
    assert.deepEqual(s.slots, ["bourbon", "caramelo", "caramelo", "caramelo"]);
  });

  test("próximo pacote vazio dá a volta e -1 quando completo", () => {
    assert.equal(core.nextEmptySlot([null, "a", null], 1), 2);
    assert.equal(core.nextEmptySlot([null, "a", "b"], 1), 0);
    assert.equal(core.nextEmptySlot(["a", "b"], 0), -1);
  });

  test("trocar de kit preserva os sabores e lembra os que não couberam", () => {
    let s = pick(catalog, "4x250", ["caramelo", "bourbon", "espresso", "baunilha"]);
    s = core.changeOffer(catalog, s, "2x500");
    assert.deepEqual(s.slots, ["caramelo", "bourbon"]);
    s = core.changeOffer(catalog, s, "4x250");
    assert.deepEqual(s.slots, ["caramelo", "bourbon", "espresso", "baunilha"]);
    s = core.changeOffer(catalog, s, "1x250");
    assert.deepEqual(s.slots, ["caramelo"]);
    s = core.changeOffer(catalog, s, "4x250");
    assert.deepEqual(s.slots, ["caramelo", "bourbon", "espresso", "baunilha"]);
  });

  test("sabor indisponível ou de outro peso não entra no kit", () => {
    const cat = withConfig((c) => {
      c.flavors.find((f) => f.id === "baunilha").sizes = [250];
      c.flavors.find((f) => f.id === "espresso").available = false;
    });
    let s = pick(cat, "4x250", ["baunilha", "caramelo"]);
    assert.deepEqual(s.slots, ["baunilha", "caramelo", null, null]);
    s = core.setSlot(cat, s, 2, "espresso");
    assert.equal(s.slots[2], null);
    s = core.changeOffer(cat, s, "2x500");
    assert.deepEqual(s.slots, [null, "caramelo"]);
    s = core.setSlot(cat, s, 0, "baunilha");
    assert.equal(s.slots[0], null);
  });
});

describe("pesos nunca se misturam", () => {
  test("cada kit tem um único peso", () => {
    catalog.offers.forEach((o) => {
      assert.ok([250, 500].includes(o.size));
      assert.equal(o.totalGrams, o.size * o.packs);
    });
  });

  test("todos os itens do pedido têm o peso do kit", () => {
    for (const [offerId, size] of [
      ["4x250", 250],
      ["2x500", 500],
    ]) {
      const s = pick(catalog, offerId, ["caramelo", "bourbon", "caramelo", "espresso"].slice(0, offer(offerId).packs));
      const { order } = core.buildOrder(catalog, { ...s, shippingId: "pac", extras: {} });
      order.itens.forEach((item) => assert.equal(item.peso, size));
      assert.equal(order.kit.pesoPacote, size);
    }
  });

  test("ao trocar 250g por 500g os pacotes são recriados no novo peso", () => {
    let s = pick(catalog, "4x250", ["caramelo", "bourbon", "espresso", "baunilha"]);
    s = core.changeOffer(catalog, s, "2x500");
    assert.equal(s.slots.length, 2);
    const { order } = core.buildOrder(catalog, { ...s, shippingId: "pac", extras: {} });
    assert.equal(order.tipoKit, "2x500g");
    assert.deepEqual(
      order.itens.map((i) => [i.sabor, i.peso]),
      [
        ["Caramelo", 500],
        ["Bourbon", 500],
      ],
    );
  });
});

describe("frete e totais", () => {
  const kit4 = pick(catalog, "4x250", ["caramelo", "chocolate-com-avela", "caramelo", "bourbon"]);

  test("PAC grátis é o padrão", () => {
    assert.equal(catalog.defaultShippingId, "pac");
    const t = core.computeTotals(catalog, { ...kit4, shippingId: "pac", extras: {} });
    assert.equal(t.shippingCents, 0);
    assert.equal(brl(t.totalCents), "R$ 69,90");
    assert.equal(t.shipping.days, 10);
  });

  test("SEDEX soma R$ 15,00", () => {
    const t = core.computeTotals(catalog, { ...kit4, shippingId: "sedex", extras: {} });
    assert.equal(brl(t.shippingCents), "R$ 15,00");
    assert.equal(brl(t.totalCents), "R$ 84,90");
    assert.equal(t.shipping.days, 5);
  });

  test("copinho de cookie: R$ 9,99 cada (COOKIE_PRICE) e soma ao total", () => {
    assert.equal(brl(catalog.extraById["copinho-cookie-cacau"].priceCents), "R$ 9,99");
    const t = core.computeTotals(catalog, { ...kit4, shippingId: "sedex", extras: { "copinho-cookie-cacau": 2 } });
    assert.equal(brl(t.extrasCents), "R$ 19,98");
    assert.equal(brl(t.subtotalCents), "R$ 89,88");
    assert.equal(brl(t.totalCents), "R$ 104,88");
    assert.equal(brl(t.originalCents), "R$ 183,58"); // preço normal: R$ 163,60 + R$ 19,98
  });

  test("copinho de cookie sem preço (COOKIE_PRICE = null): em breve, fora do pedido", () => {
    const cat = withConfig((c) => c.extras.forEach((e) => (e.price = null)));
    const extra = cat.extraById["copinho-cookie-cacau"];
    assert.equal(extra.priceCents, null);
    assert.equal(extra.available, false);
    const input = { ...kit4, shippingId: "pac", extras: { "copinho-cookie-cacau": 1 } };
    assert.equal(core.computeTotals(cat, input).extrasCents, 0);
    assert.equal(core.validateOrder(cat, input).ok, false);
  });

  test("biscoito xícara nos dois sabores do site oficial (Cacau e Choco Vanilla), cada um com seu card", () => {
    assert.deepEqual(
      catalog.extras.map((e) => [e.id, e.fullName, brl(e.priceCents), e.available]),
      [
        ["copinho-cookie-cacau", "Copinho de Cookie sabor Cacau — 68g", "R$ 9,99", true],
        ["copinho-cookie-choco-vanilla", "Copinho de Cookie sabor Choco Vanilla — 68g", "R$ 9,99", true],
      ],
    );
    const input = { ...kit4, shippingId: "pac", extras: { "copinho-cookie-cacau": 1, "copinho-cookie-choco-vanilla": 2 } };
    const t = core.computeTotals(catalog, input);
    assert.equal(brl(t.extrasCents), "R$ 29,97");
    assert.equal(brl(t.totalCents), "R$ 99,87");
    const { order } = core.buildOrder(catalog, input, { id: "BG-TESTE", now: new Date("2026-10-01T12:00:00Z") });
    assert.deepEqual(order.extras.map((e) => [e.id, e.quantidade, e.total]), [["copinho-cookie-cacau", 1, 9.99], ["copinho-cookie-choco-vanilla", 2, 19.98]]);
  });
});

describe("pedido", () => {
  const meta = { id: "BG-TESTE", now: new Date("2026-10-01T12:00:00Z") };

  test("objeto do pedido com PAC (formato combinado)", () => {
    const s = pick(catalog, "4x250", ["caramelo", "bourbon", "caramelo", "chocolate-com-avela"]);
    const { ok, order } = core.buildOrder(catalog, { ...s, shippingId: "pac", extras: {} }, meta);
    assert.equal(ok, true);
    assert.equal(order.tipoKit, "4x250g");
    assert.deepEqual(order.itens, [
      { sabor: "Caramelo", saborId: "caramelo", peso: 250, quantidade: 2 },
      { sabor: "Bourbon", saborId: "bourbon", peso: 250, quantidade: 1 },
      { sabor: "Chocolate com Avelã", saborId: "chocolate-com-avela", peso: 250, quantidade: 1 },
    ]);
    assert.deepEqual(order.extras, []);
    assert.equal(order.subtotal, 69.9);
    assert.deepEqual(order.shipping, { id: "pac", method: "PAC", price: 0, estimatedDays: 10 });
    assert.equal(order.total, 69.9);
    assert.equal(order.kit.preco, 69.9);
    assert.equal(order.kit.precoNormal, 163.6);
    assert.equal(order.kit.economia, 93.7);
    assert.equal(order.desconto, 93.7);
  });

  test("objeto do pedido com SEDEX e copinho de cookie", () => {
    const s = pick(catalog, "2x500", ["espresso", "espresso"]);
    const { order } = core.buildOrder(catalog, { ...s, shippingId: "sedex", extras: { "copinho-cookie-cacau": 1 } }, meta);
    assert.equal(order.tipoKit, "2x500g");
    assert.deepEqual(order.itens, [{ sabor: "Espresso", saborId: "espresso", peso: 500, quantidade: 2 }]);
    assert.deepEqual(order.extras, [{ id: "copinho-cookie-cacau", nome: "Copinho de Cookie sabor Cacau — 68g", preco: 9.99, quantidade: 1, total: 9.99 }]);
    assert.equal(order.subtotal, 79.89);
    assert.deepEqual(order.shipping, { id: "sedex", method: "SEDEX", price: 15, estimatedDays: 5 });
    assert.equal(order.total, 94.89);
  });

  test("não monta pedido com sabor faltando", () => {
    const s = pick(catalog, "4x250", ["caramelo", null, "bourbon"]);
    const result = core.buildOrder(catalog, { ...s, shippingId: "pac", extras: {} });
    assert.equal(result.ok, false);
    assert.deepEqual(
      result.errors.map((e) => e.slot),
      [1, 3],
    );
    assert.equal(result.errors[0].message, "Escolha o sabor do Pacote 2.");
  });

  test("não monta pedido com entrega ou kit inválidos", () => {
    const s = pick(catalog, "1x250", ["caramelo"]);
    assert.equal(core.buildOrder(catalog, { ...s, shippingId: "drone", extras: {} }).ok, false);
    assert.equal(core.buildOrder(catalog, { offerId: "9x999", slots: [], shippingId: "pac", extras: {} }).ok, false);
  });

  test("texto do WhatsApp e parâmetros do checkout externo", () => {
    const s = pick(catalog, "4x250", ["caramelo", "bourbon", "caramelo", "chocolate-com-avela"]);
    const { order } = core.buildOrder(catalog, { ...s, shippingId: "sedex", extras: {} }, meta);
    const text = core.orderToText(order).replace(/\u00a0/g, " ");
    assert.match(text, /\*Kit Variedade — 4×250g \(1kg\)\*/);
    assert.match(text, /• 2× Caramelo 250g/);
    assert.match(text, /Entrega: SEDEX — R\$ 15,00 \(até 5 dias úteis\)/);
    assert.match(text, /\*Total: R\$ 84,90\*/);

    const params = new URLSearchParams(core.orderToParams(order));
    assert.equal(params.get("pedido"), "BG-TESTE");
    assert.equal(params.get("kit"), "4x250");
    assert.equal(params.get("sabores"), "caramelo:2,bourbon:1,chocolate-com-avela:1");
    assert.equal(params.get("frete"), "sedex");
    assert.equal(params.get("total"), "84.90");
    assert.deepEqual(JSON.parse(core.base64UrlDecode(params.get("dados"))), order);
    assert.equal(core.appendQuery("https://loja.com/checkout?x=1#a", "kit=1"), "https://loja.com/checkout?x=1&kit=1#a");
  });

  test("referência do pedido", () => {
    const id = core.makeOrderId(new Date(2026, 9, 1), () => 0);
    assert.equal(id, "BG-261001-AAAA");
  });
});

describe("avaliações", () => {
  // Dados só de teste, para conferir as contas (não vão para a página).
  const fixture = [
    { name: "Cliente A", rating: 5, date: "2026-09-12", flavor: "caramelo", kit: "4x250", verified: true, text: "a", images: ["a.jpg", "b.jpg"] },
    { name: "Cliente B", rating: 4, date: "01/10/2026", flavor: ["Chocolate com Avelã", "bourbon"], size: "250g", text: "b", images: [] },
    { name: "Cliente C", rating: 5, date: "2026-08-03", flavor: "Café inexistente", kit: "Kit livre", text: "c" },
    { name: "Cliente D", rating: 3, date: "", flavor: "caramelo", text: "d", images: ["c.jpg"] },
    { name: "Inválida", rating: 0, text: "sem nota" },
  ];
  const list = core.normalizeReviews(fixture, catalog);

  test("ignora avaliação sem nota válida", () => {
    assert.equal(list.length, 4);
  });

  test("média, quantidade e percentuais calculados das avaliações", () => {
    const stats = core.reviewStats(list);
    assert.equal(stats.count, 4);
    assert.equal(stats.average, 4.2); // 4,25 → 4,2 (nunca arredonda para cima)
    assert.equal(stats.averageText, "4,2");
    assert.deepEqual(stats.distribution, { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 });
    assert.deepEqual(stats.percents, { 1: 0, 2: 0, 3: 25, 4: 25, 5: 50 });
    assert.equal(stats.withPhotos, 2);
    assert.deepEqual(stats.flavorCount, { caramelo: 2, "chocolate-com-avela": 1, bourbon: 1 });
  });

  test("percentuais inteiros sempre somam 100%", () => {
    const ratings = [5, 5, 5, 5, 5, 4, 4, 3].map((rating, i) => ({ name: "C" + i, rating, text: "x" }));
    const stats = core.reviewStats(core.normalizeReviews(ratings, catalog));
    assert.deepEqual(stats.percents, { 1: 0, 2: 0, 3: 12, 4: 25, 5: 63 }); // 62,5 / 25 / 12,5
    const thirds = core.reviewStats(core.normalizeReviews([5, 4, 3].map((rating) => ({ name: "x", rating })), catalog));
    assert.equal(Object.values(thirds.percents).reduce((a, b) => a + b, 0), 100);
  });

  test("sem avaliações não há números", () => {
    const stats = core.reviewStats([]);
    assert.equal(stats.count, 0);
    assert.equal(stats.averageText, "");
    assert.deepEqual(stats.percents, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  test("filtros por estrelas, fotos, sabor e mais recentes", () => {
    const names = (f) => core.filterReviews(list, f).map((r) => r.name);
    assert.deepEqual(names("all"), ["Cliente A", "Cliente B", "Cliente C", "Cliente D"]);
    assert.deepEqual(names("5"), ["Cliente A", "Cliente C"]);
    assert.deepEqual(names("4"), ["Cliente B"]);
    assert.deepEqual(names("3"), ["Cliente D"]);
    assert.deepEqual(names("photos"), ["Cliente A", "Cliente D"]);
    assert.deepEqual(names("flavor:caramelo"), ["Cliente A", "Cliente D"]);
    assert.deepEqual(names("flavor:bourbon"), ["Cliente B"]);
    assert.deepEqual(names("recent"), ["Cliente B", "Cliente A", "Cliente C", "Cliente D"]);
  });

  test("produto comprado, data e selo de compra verificada", () => {
    const [a, b, c] = list;
    assert.equal(a.product, "Caramelo • Kit 4×250g");
    assert.equal(a.dateText, "12/09/2026");
    assert.equal(a.verified, true);
    assert.equal(b.product, "Chocolate com Avelã, Bourbon • 250g");
    assert.equal(b.dateText, "01/10/2026");
    assert.equal(b.verified, false);
    assert.equal(c.product, "Café inexistente • Kit livre");
    assert.deepEqual(c.flavorIds, []);
  });

  test("fotos dos clientes vêm só das avaliações", () => {
    const photos = core.reviewPhotos(list);
    assert.deepEqual(
      photos.map((p) => [p.src, p.review.name]),
      [
        ["a.jpg", "Cliente A"],
        ["b.jpg", "Cliente A"],
        ["c.jpg", "Cliente D"],
      ],
    );
  });

  test("iniciais do avatar", () => {
    assert.equal(core.initials("Mariana S."), "MS");
    assert.equal(core.initials("joão"), "J");
    assert.equal(core.initials("[Nome do cliente]"), "NC");
  });

  test("placeholders: só estrutura, claramente identificados", () => {
    assert.ok(Array.isArray(reviewsData.reviews));
    const placeholders = core.normalizeReviews(reviewsData.reviewsPlaceholder, catalog, { placeholder: true });
    assert.ok(placeholders.length > reviewsData.settings.initialCount, "precisa de exemplos suficientes para o VER TODAS");
    placeholders.forEach((r) => {
      assert.equal(r.placeholder, true);
      assert.match(r.name, /^\[.*\]$/);
      assert.match(r.text, /^\[.*\]$/);
      assert.match(r.dateText, /^\[.*\]$/);
      assert.equal(r.verified, false);
      r.images.forEach((src) => assert.match(src, /exemplo/));
    });
  });
});

describe("textos da configuração", () => {
  const ctx = core.tokenContext(catalog, config);
  const fill = (text) => core.fillTokens(text, ctx).replace(/\u00a0/g, " ");

  test("FAQ usa os valores do frete da configuração", () => {
    const sedex = config.faq.find((f) => /mais rápida/.test(f.q));
    assert.equal(fill(sedex.a), "Sim. Você pode escolher SEDEX por mais R$ 15,00, com prazo estimado de até 5 dias úteis.");
    const pac = config.faq.find((f) => /demora o PAC/.test(f.q));
    assert.equal(fill(pac.a), "Prazo estimado de até 10 dias úteis.");
  });

  test("título com a quantidade de sabores e prova social real", () => {
    assert.match(fill(config.store.title), /^Café Baggio — 7 sabores/);
    assert.equal(fill("{vendidos}"), "+7.000 pacotes vendidos");
    assert.equal(fill("{desconhecido}"), "{desconhecido}");
  });

  test("frase da promoção com os preços da configuração", () => {
    assert.equal(fill(config.promo.topBar), "🔥 PROMOÇÃO: 250g por R$ 29,90 · 500g por R$ 39,90");
    assert.equal(fill("{precoNormal.250} → {preco.250}"), "R$ 40,90 → R$ 29,90");
    assert.equal(fill("{precoNormal.500} → {preco.500}"), "R$ 75,00 → R$ 39,90");
  });

  test("Bourbon e Espresso marcados como Blend Premiado", () => {
    const awarded = catalog.flavors.filter((f) => f.award).map((f) => f.name);
    assert.deepEqual(awarded, ["Bourbon", "Espresso"]);
    assert.equal(catalog.flavors.length, 7);
  });
});
