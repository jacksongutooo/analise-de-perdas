/* Café Baggio — regras da loja, sem DOM: preços, kits, pedido e avaliações.
   Roda no navegador (window.BaggioCore) e no Node (require), para os testes.
   Todo valor em dinheiro é calculado em centavos inteiros; só o objeto do
   pedido sai em reais (99.99). Números e textos vêm de js/config.js. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BaggioCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ───────────────────────────── Dinheiro ───────────────────────────── */

  /** Reais (40.9) → centavos (4090). Vazio ou inválido → null. */
  function toCents(value) {
    if (value === null || value === undefined || value === "") return null;
    var n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    if (!isFinite(n)) return null;
    return Math.round(n * 100);
  }

  /** Centavos (9999) → reais (99.99). */
  function fromCents(cents) {
    return Math.round(cents) / 100;
  }

  /** Centavos → "R$ 40,90" (com espaço que não quebra linha). */
  function formatBRL(cents) {
    var negative = cents < 0;
    var abs = Math.abs(Math.round(cents || 0));
    var reais = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    var cent = String(abs % 100);
    if (cent.length < 2) cent = "0" + cent;
    return (negative ? "-" : "") + "R$\u00a0" + reais + "," + cent;
  }

  /** Arredonda para o centavo mais próximo; empate (x,5) para baixo, para nunca anunciar preço por pacote maior. */
  function roundHalfDown(x) {
    return Math.ceil(x - 0.5);
  }

  /** 250 → "250g"; 1000 → "1kg"; 1500 → "1,5kg". */
  function formatWeight(grams) {
    if (grams >= 1000) {
      var kg = grams / 1000;
      return String(kg).replace(".", ",") + "kg";
    }
    return grams + "g";
  }

  function plural(n, one, many) {
    return n === 1 ? one : many;
  }

  /* ───────────────────────────── Catálogo ───────────────────────────── */

  function warn(message) {
    if (typeof console !== "undefined" && console.warn) console.warn("[Baggio] " + message);
  }

  /** Organiza a configuração (js/config.js) com os valores derivados de cada kit. */
  function createCatalog(config) {
    var prices = config.prices || {};
    var unitBySize = {};
    Object.keys(prices).forEach(function (key) {
      var m = /^unit(\d+)$/.exec(key);
      if (m) unitBySize[m[1]] = toCents(prices[key]);
    });

    var offers = [];
    var offerById = {};
    (config.offers || []).forEach(function (o) {
      var size = Number(o.size);
      var packs = Number(o.packs);
      var priceCents = toCents(o.price);
      var unitCents = unitBySize[size];
      if (!o.id || !size || !(packs >= 1) || priceCents === null || priceCents <= 0) {
        warn("Kit ignorado (confira id, size, packs e price): " + JSON.stringify(o));
        return;
      }
      if (!unitCents) {
        warn("Kit " + o.id + ": falta o preço do pacote avulso de " + size + "g (prices.unit" + size + ").");
        return;
      }
      var separateCents = unitCents * packs;
      var savingsCents = Math.max(0, separateCents - priceCents);
      var kitLabel = packs + "×" + size + "g";
      var offer = {
        id: String(o.id),
        size: size,
        packs: packs,
        name: o.name || (packs === 1 ? "1 pacote" : "Kit com " + packs),
        badge: o.badge || "",
        tagline: o.tagline || "",
        cta: o.cta || "",
        upgradeTo: o.upgradeTo || "",
        priceCents: priceCents,
        unitCents: unitCents,
        separateCents: savingsCents > 0 ? separateCents : priceCents,
        savingsCents: savingsCents,
        discountPercent: savingsCents > 0 ? Math.floor((savingsCents * 100) / separateCents) : 0,
        perPackCents: roundHalfDown(priceCents / packs),
        perPackExact: priceCents % packs === 0,
        totalGrams: size * packs,
        kitLabel: kitLabel, // "4×250g"
        tipoKit: packs + "x" + size + "g", // "4x250g" (objeto do pedido)
        detail: packs === 1 ? "1 pacote de " + size + "g" : packs + " pacotes de " + size + "g",
        displayName: packs === 1 ? "1 pacote — " + size + "g" : (o.name || "Kit") + " — " + kitLabel,
      };
      if (offerById[offer.id]) {
        warn("Kit com id repetido: " + offer.id);
        return;
      }
      offers.push(offer);
      offerById[offer.id] = offer;
    });

    var sizes = [];
    offers.forEach(function (o) {
      if (sizes.indexOf(o.size) === -1) sizes.push(o.size);
    });

    var flavors = [];
    var flavorById = {};
    (config.flavors || []).forEach(function (f) {
      if (!f.id || !f.name) {
        warn("Sabor ignorado (falta id ou name): " + JSON.stringify(f));
        return;
      }
      var flavor = {
        id: String(f.id),
        name: String(f.name),
        image: f.image || "",
        image500: f.image500 || "",
        color: f.color || "#7a4a2e",
        award: !!f.award,
        sizes: Array.isArray(f.sizes) && f.sizes.length ? f.sizes.map(Number) : sizes.slice(),
        available: f.available !== false,
      };
      if (flavorById[flavor.id]) {
        warn("Sabor com id repetido: " + flavor.id);
        return;
      }
      flavors.push(flavor);
      flavorById[flavor.id] = flavor;
    });

    var shipping = [];
    var shippingById = {};
    Object.keys(config.shipping || {}).forEach(function (id) {
      var s = config.shipping[id] || {};
      var option = {
        id: id,
        name: s.name || id.toUpperCase(),
        label: s.label || "",
        badge: s.badge || "",
        priceCents: toCents(s.price) || 0,
        days: Number(s.estimatedBusinessDays) || null,
      };
      shipping.push(option);
      shippingById[id] = option;
    });
    var defaultShippingId = shippingById[config.defaultShipping] ? config.defaultShipping : shipping[0] ? shipping[0].id : null;

    var extras = [];
    var extraById = {};
    (config.extras || []).forEach(function (e) {
      if (!e.id || !e.name) return;
      var priceCents = toCents(e.price);
      var extra = {
        id: String(e.id),
        name: String(e.name),
        weight: e.weight || "",
        brand: e.brand || "",
        description: e.description || "",
        image: e.image || "",
        priceCents: priceCents !== null && priceCents > 0 ? priceCents : null,
        maxQuantity: Number(e.maxQuantity) > 0 ? Number(e.maxQuantity) : 10,
        fullName: e.weight ? e.name + " — " + e.weight : e.name,
      };
      extra.available = extra.priceCents !== null && e.available !== false;
      extras.push(extra);
      extraById[extra.id] = extra;
    });

    var menu = config.offerMenu || {};
    var keep = function (ids) {
      return (ids || []).filter(function (id) {
        return offerById[id];
      });
    };
    var groupIds = keep(menu.oneKg && menu.oneKg.offers);
    var main = (menu.main || []).filter(function (id) {
      return id === "1kg" ? groupIds.length > 0 : !!offerById[id];
    });
    var listed = main.concat(groupIds, keep(menu.more));
    // Kits que existem mas não foram listados no menu entram em "Ver mais opções".
    var more = keep(menu.more).concat(
      offers
        .filter(function (o) {
          return listed.indexOf(o.id) === -1;
        })
        .map(function (o) {
          return o.id;
        }),
    );
    var defaultOfferId = offerById[menu.defaultOffer] ? menu.defaultOffer : main[0] && main[0] !== "1kg" ? main[0] : offers[0] && offers[0].id;

    return {
      offers: offers,
      offerById: offerById,
      flavors: flavors,
      flavorById: flavorById,
      sizes: sizes,
      shipping: shipping,
      shippingById: shippingById,
      defaultShippingId: defaultShippingId,
      extras: extras,
      extraById: extraById,
      menu: {
        main: main,
        more: more,
        oneKg: groupIds.length
          ? { offers: groupIds, name: (menu.oneKg && menu.oneKg.name) || "1KG", badge: (menu.oneKg && menu.oneKg.badge) || "" }
          : null,
        defaultOfferId: defaultOfferId,
      },
    };
  }

  /** Resumo do grupo 1KG: menor preço e maior economia entre as opções. */
  function groupSummary(catalog, ids) {
    var offers = ids
      .map(function (id) {
        return catalog.offerById[id];
      })
      .filter(Boolean);
    if (!offers.length) return null;
    var minPrice = Infinity;
    var maxSavings = 0;
    var maxPercent = 0;
    offers.forEach(function (o) {
      minPrice = Math.min(minPrice, o.priceCents);
      maxSavings = Math.max(maxSavings, o.savingsCents);
      maxPercent = Math.max(maxPercent, o.discountPercent);
    });
    var samePrice = offers.every(function (o) {
      return o.priceCents === offers[0].priceCents;
    });
    return { offers: offers, minPriceCents: minPrice, samePrice: samePrice, maxSavingsCents: maxSavings, maxDiscountPercent: maxPercent };
  }

  /** Sugestão "Por + R$ X leve mais" (mesmo peso, mais pacotes). */
  function upgradeFor(catalog, offerId) {
    var offer = catalog.offerById[offerId];
    var target = offer && offer.upgradeTo ? catalog.offerById[offer.upgradeTo] : null;
    if (!target || target.size !== offer.size || target.packs <= offer.packs || target.priceCents <= offer.priceCents) return null;
    return { offer: target, extraCents: target.priceCents - offer.priceCents, extraPacks: target.packs - offer.packs };
  }

  /* ─────────────────────── Seleção de kit e sabores ─────────────────────── */

  /** O sabor existe, está disponível e tem pacote desse peso? */
  function flavorFits(catalog, flavorId, size) {
    var f = flavorId ? catalog.flavorById[flavorId] : null;
    return !!f && f.available && f.sizes.indexOf(size) !== -1;
  }

  function mergeMemory(memory, slots) {
    var out = (memory || []).slice();
    (slots || []).forEach(function (id, i) {
      if (id) out[i] = id;
    });
    return out;
  }

  /**
   * Troca o kit preservando os sabores já escolhidos (pela posição do pacote).
   * Cada kit tem um único peso: os pacotes são recriados para o novo peso e só
   * entram sabores que existem nesse peso. Escolhas que não cabem no kit novo
   * ficam guardadas (memory) e voltam se o cliente retornar a um kit maior.
   */
  function changeOffer(catalog, selection, offerId) {
    var offer = catalog.offerById[offerId];
    if (!offer) return selection;
    var prev = selection || { slots: [], memory: [] };
    var memory = mergeMemory(prev.memory, prev.slots);
    var slots = [];
    for (var i = 0; i < offer.packs; i++) {
      var candidate = memory[i] || null;
      slots.push(candidate && flavorFits(catalog, candidate, offer.size) ? candidate : null);
    }
    return { offerId: offer.id, slots: slots, memory: memory };
  }

  /** Define (ou limpa, com null) o sabor de um pacote. */
  function setSlot(catalog, selection, index, flavorId) {
    var offer = catalog.offerById[selection.offerId];
    if (!offer || index < 0 || index >= offer.packs) return selection;
    if (flavorId !== null && !flavorFits(catalog, flavorId, offer.size)) return selection;
    var slots = selection.slots.slice();
    var memory = (selection.memory || []).slice();
    slots[index] = flavorId;
    memory[index] = flavorId;
    return { offerId: selection.offerId, slots: slots, memory: memory };
  }

  /** Coloca o sabor em todos os pacotes ainda vazios. */
  function fillEmptySlots(catalog, selection, flavorId) {
    var offer = catalog.offerById[selection.offerId];
    if (!offer || !flavorFits(catalog, flavorId, offer.size)) return selection;
    var next = selection;
    selection.slots.forEach(function (id, i) {
      if (!id) next = setSlot(catalog, next, i, flavorId);
    });
    return next;
  }

  /** Próximo pacote vazio a partir de `from` (dá a volta). -1 = kit completo. */
  function nextEmptySlot(slots, from) {
    var n = slots.length;
    for (var k = 0; k < n; k++) {
      var i = (((from || 0) + k) % n + n) % n;
      if (!slots[i]) return i;
    }
    return -1;
  }

  function selectionStatus(catalog, selection) {
    var offer = selection ? catalog.offerById[selection.offerId] : null;
    if (!offer) return { offer: null, total: 0, filled: 0, remaining: 0, complete: false, missing: [] };
    var missing = [];
    var filled = 0;
    for (var i = 0; i < offer.packs; i++) {
      if (flavorFits(catalog, selection.slots[i], offer.size)) filled++;
      else missing.push(i);
    }
    return { offer: offer, total: offer.packs, filled: filled, remaining: offer.packs - filled, complete: missing.length === 0, missing: missing };
  }

  /** Agrupa os pacotes por sabor: [{flavor, quantity}], mais repetidos primeiro. */
  function groupFlavors(catalog, slots) {
    var groups = [];
    var byId = {};
    (slots || []).forEach(function (id, i) {
      var flavor = id ? catalog.flavorById[id] : null;
      if (!flavor) return;
      if (!byId[id]) {
        byId[id] = { flavor: flavor, quantity: 0, first: i };
        groups.push(byId[id]);
      }
      byId[id].quantity++;
    });
    return groups.sort(function (a, b) {
      return b.quantity - a.quantity || a.first - b.first;
    });
  }

  /** Quantos pacotes de cada sabor há no kit: {caramelo: 2, bourbon: 1}. */
  function flavorCounts(slots) {
    var counts = {};
    (slots || []).forEach(function (id) {
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }

  /* ───────────────────────────── Pedido ───────────────────────────── */

  /**
   * Totais do pedido. input = { offerId, slots, shippingId, extras: {id: quantidade} }.
   * subtotal = kit + extras; total = subtotal + frete.
   */
  function computeTotals(catalog, input) {
    var offer = catalog.offerById[input.offerId] || null;
    var kitCents = offer ? offer.priceCents : 0;
    var extras = [];
    var extrasCents = 0;
    Object.keys(input.extras || {}).forEach(function (id) {
      var quantity = Math.max(0, Math.floor(Number(input.extras[id]) || 0));
      var extra = catalog.extraById[id];
      if (!quantity || !extra || !extra.available) return;
      quantity = Math.min(quantity, extra.maxQuantity);
      extras.push({ extra: extra, quantity: quantity, totalCents: extra.priceCents * quantity });
      extrasCents += extra.priceCents * quantity;
    });
    var shipping = catalog.shippingById[input.shippingId] || catalog.shippingById[catalog.defaultShippingId] || null;
    var shippingCents = shipping ? shipping.priceCents : 0;
    var subtotalCents = kitCents + extrasCents;
    return {
      offer: offer,
      kitCents: kitCents,
      separateCents: offer ? offer.separateCents : 0,
      savingsCents: offer ? offer.savingsCents : 0,
      extras: extras,
      extrasCents: extrasCents,
      originalCents: (offer ? offer.separateCents : 0) + extrasCents, // produtos a preço cheio
      subtotalCents: subtotalCents,
      shipping: shipping,
      shippingCents: shippingCents,
      totalCents: subtotalCents + shippingCents,
    };
  }

  /** Confere tudo antes do checkout: kit, sabores de todos os pacotes, entrega e extras. */
  function validateOrder(catalog, input) {
    var errors = [];
    var offer = catalog.offerById[input.offerId];
    if (!offer) {
      errors.push({ code: "offer", message: "Escolha um kit." });
      return { ok: false, errors: errors, status: selectionStatus(catalog, null) };
    }
    if (!input.slots || input.slots.length !== offer.packs) {
      errors.push({ code: "slots", message: "Os pacotes não conferem com o kit escolhido." });
    }
    var status = selectionStatus(catalog, input);
    status.missing.forEach(function (i) {
      errors.push({
        code: "flavor",
        slot: i,
        message: offer.packs === 1 ? "Escolha o sabor do seu café." : "Escolha o sabor do Pacote " + (i + 1) + ".",
      });
    });
    if (!catalog.shippingById[input.shippingId]) errors.push({ code: "shipping", message: "Escolha a entrega." });
    Object.keys(input.extras || {}).forEach(function (id) {
      var quantity = Number(input.extras[id]) || 0;
      if (quantity <= 0) return;
      var extra = catalog.extraById[id];
      if (!extra || !extra.available) errors.push({ code: "extra", id: id, message: "Item indisponível no momento." });
      else if (quantity > extra.maxQuantity) errors.push({ code: "extra", id: id, message: "Quantidade máxima: " + extra.maxQuantity + "." });
    });
    return { ok: errors.length === 0, errors: errors, status: status };
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  /** Referência do pedido: BG-AAMMDD-XXXX. */
  function makeOrderId(date, random) {
    var d = date || new Date();
    var r = typeof random === "function" ? random : Math.random;
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var suffix = "";
    for (var i = 0; i < 4; i++) suffix += chars.charAt(Math.floor(r() * chars.length));
    return "BG-" + String(d.getFullYear()).slice(2) + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "-" + suffix;
  }

  /**
   * Monta o objeto do pedido (valores em reais) depois de validar tudo.
   * Retorna { ok: true, order } ou { ok: false, errors }.
   */
  function buildOrder(catalog, input, meta) {
    var check = validateOrder(catalog, input);
    if (!check.ok) return { ok: false, errors: check.errors, status: check.status };
    var t = computeTotals(catalog, input);
    var offer = t.offer;
    var now = (meta && meta.now) || new Date();
    var order = {
      id: (meta && meta.id) || makeOrderId(now),
      criadoEm: now.toISOString(),
      moeda: "BRL",
      tipoKit: offer.tipoKit,
      kit: {
        id: offer.id,
        nome: offer.name,
        descricao: offer.displayName,
        pacotes: offer.packs,
        pesoPacote: offer.size,
        pesoTotal: offer.totalGrams,
        preco: fromCents(offer.priceCents),
        precoSeparado: fromCents(offer.separateCents),
        economia: fromCents(offer.savingsCents),
      },
      itens: groupFlavors(catalog, input.slots).map(function (g) {
        return { sabor: g.flavor.name, saborId: g.flavor.id, peso: offer.size, quantidade: g.quantity };
      }),
      extras: t.extras.map(function (e) {
        return { id: e.extra.id, nome: e.extra.fullName, preco: fromCents(e.extra.priceCents), quantidade: e.quantity, total: fromCents(e.totalCents) };
      }),
      subtotal: fromCents(t.subtotalCents),
      desconto: fromCents(t.savingsCents),
      shipping: { id: t.shipping.id, method: t.shipping.name, price: fromCents(t.shippingCents), estimatedDays: t.shipping.days },
      total: fromCents(t.totalCents),
    };
    return { ok: true, order: order };
  }

  function centsOf(reais) {
    return Math.round(reais * 100);
  }

  /** Texto do pedido para o WhatsApp. */
  function orderToText(order, storeName) {
    var lines = ["Olá! Quero fazer este pedido" + (storeName ? " na " + storeName : "") + ":", ""];
    var weight = formatWeight(order.kit.pesoTotal);
    lines.push("*" + order.kit.descricao + (order.kit.pacotes > 1 ? " (" + weight + ")" : "") + "*");
    order.itens.forEach(function (item) {
      lines.push("• " + item.quantidade + "× " + item.sabor + " " + item.peso + "g");
    });
    order.extras.forEach(function (e) {
      lines.push("• " + e.quantidade + "× " + e.nome);
    });
    lines.push("");
    lines.push("Produtos: " + formatBRL(centsOf(order.subtotal)));
    lines.push(
      "Entrega: " +
        order.shipping.method +
        " — " +
        (order.shipping.price ? formatBRL(centsOf(order.shipping.price)) : "GRÁTIS") +
        (order.shipping.estimatedDays ? " (até " + order.shipping.estimatedDays + " dias úteis)" : ""),
    );
    lines.push("*Total: " + formatBRL(centsOf(order.total)) + "*");
    lines.push("");
    lines.push("Pedido: " + order.id);
    return lines.join("\n");
  }

  function base64UrlEncode(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64UrlDecode(text) {
    var b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /** Parâmetros do pedido para o checkout externo (modo "link"). */
  function orderToParams(order) {
    return [
      ["pedido", order.id],
      ["kit", order.kit.id],
      [
        "sabores",
        order.itens
          .map(function (i) {
            return i.saborId + ":" + i.quantidade;
          })
          .join(","),
      ],
      ["frete", order.shipping.id],
      [
        "extras",
        order.extras
          .map(function (e) {
            return e.id + ":" + e.quantidade;
          })
          .join(","),
      ],
      ["total", order.total.toFixed(2)],
      ["dados", base64UrlEncode(JSON.stringify(order))],
    ]
      .filter(function (p) {
        return p[1] !== "";
      })
      .map(function (p) {
        return encodeURIComponent(p[0]) + "=" + encodeURIComponent(p[1]);
      })
      .join("&");
  }

  function appendQuery(url, query) {
    if (!query) return url;
    var hash = "";
    var i = url.indexOf("#");
    if (i !== -1) {
      hash = url.slice(i);
      url = url.slice(0, i);
    }
    return url + (url.indexOf("?") === -1 ? "?" : "&") + query + hash;
  }

  /* ─────────────────────────── Avaliações ─────────────────────────── */

  /** "2026-09-12" ou "12/09/2026" → {y, m, d, key, text}. Outro formato → null. */
  function parseReviewDate(value) {
    if (!value) return null;
    var s = String(value).trim();
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    var y, mo, d;
    if (m) {
      y = +m[1];
      mo = +m[2];
      d = +m[3];
    } else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) {
      d = +m[1];
      mo = +m[2];
      y = +m[3];
    } else {
      return null;
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { y: y, m: mo, d: d, key: y * 10000 + mo * 100 + d, text: pad2(d) + "/" + pad2(mo) + "/" + y };
  }

  function simplify(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  /** Acha o sabor pelo id ("caramelo") ou pelo nome ("Caramelo", "chocolate com avela"). */
  function matchFlavor(catalog, value) {
    if (!value) return null;
    if (catalog.flavorById[value]) return catalog.flavorById[value];
    var key = simplify(value);
    for (var i = 0; i < catalog.flavors.length; i++) {
      var f = catalog.flavors[i];
      if (simplify(f.name) === key || simplify(f.id) === key) return f;
    }
    return null;
  }

  function toList(value) {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }

  /** Padroniza as avaliações cadastradas (js/reviews.js) para a página. */
  function normalizeReviews(list, catalog, options) {
    var placeholder = !!(options && options.placeholder);
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (r, index) {
      if (!r) return;
      var rating = Math.round(Number(r.rating));
      if (!(rating >= 1 && rating <= 5)) {
        warn("Avaliação ignorada (nota de 1 a 5 obrigatória): " + JSON.stringify(r));
        return;
      }
      var flavorIds = [];
      var flavorNames = [];
      toList(r.flavor).forEach(function (v) {
        var f = matchFlavor(catalog, v);
        if (f && flavorIds.indexOf(f.id) === -1) flavorIds.push(f.id);
        flavorNames.push(f ? f.name : String(v));
      });
      var offer = r.kit ? catalog.offerById[r.kit] : null;
      var kitLabel = offer ? (offer.packs === 1 ? "1 pacote " + offer.size + "g" : "Kit " + offer.kitLabel) : r.kit ? String(r.kit) : "";
      var size = r.size ? String(r.size) : "";
      var date = parseReviewDate(r.date);
      out.push({
        index: index,
        name: String(r.name || "").trim(),
        avatar: r.avatar || "",
        rating: rating,
        date: date,
        dateText: date ? date.text : r.date ? String(r.date) : "",
        flavorIds: flavorIds,
        flavorLabel: flavorNames.join(", "),
        size: size,
        kitLabel: kitLabel,
        product: [flavorNames.join(", "), kitLabel || size]
          .filter(function (s) {
            return s;
          })
          .join(" • "),
        verified: r.verified === true,
        text: String(r.text || "").trim(),
        images: toList(r.images).filter(function (s) {
          return typeof s === "string" && s.trim();
        }),
        placeholder: placeholder,
      });
    });
    return out;
  }

  /** Nota média, quantidade e percentual de cada estrela — sempre calculados das avaliações cadastradas. */
  function reviewStats(list) {
    var distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    var sum = 0;
    var withPhotos = 0;
    var flavorCount = {};
    list.forEach(function (r) {
      distribution[r.rating]++;
      sum += r.rating;
      if (r.images.length) withPhotos++;
      r.flavorIds.forEach(function (id) {
        flavorCount[id] = (flavorCount[id] || 0) + 1;
      });
    });
    var count = list.length;
    // Uma casa decimal, arredondada para baixo: a média nunca aparece maior do que é.
    var average = count ? Math.floor((sum * 10) / count) / 10 : 0;
    return {
      count: count,
      average: average,
      exactAverage: count ? sum / count : 0,
      averageText: count ? average.toFixed(1).replace(".", ",") : "",
      distribution: distribution,
      percents: wholePercents(distribution, count),
      withPhotos: withPhotos,
      flavorCount: flavorCount,
    };
  }

  /** Percentual inteiro de cada estrela somando exatamente 100 (método do maior resto). */
  function wholePercents(distribution, count) {
    var percents = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (!count) return percents;
    var rows = [];
    var used = 0;
    for (var s = 5; s >= 1; s--) {
      var exact = (distribution[s] * 100) / count;
      percents[s] = Math.floor(exact);
      used += percents[s];
      rows.push({ star: s, rest: exact - percents[s] });
    }
    rows.sort(function (a, b) {
      return b.rest - a.rest || b.star - a.star;
    });
    for (var i = 0; i < 100 - used; i++) percents[rows[i].star]++;
    return percents;
  }

  /** Filtros: "all", "5".."1", "photos", "recent", "flavor:<id>". */
  function filterReviews(list, filter) {
    var f = filter || "all";
    var out = list.slice();
    if (/^[1-5]$/.test(f)) {
      out = out.filter(function (r) {
        return r.rating === Number(f);
      });
    } else if (f === "photos") {
      out = out.filter(function (r) {
        return r.images.length > 0;
      });
    } else if (f.indexOf("flavor:") === 0) {
      var id = f.slice(7);
      out = out.filter(function (r) {
        return r.flavorIds.indexOf(id) !== -1;
      });
    } else if (f === "recent") {
      out.sort(function (a, b) {
        return (b.date ? b.date.key : -1) - (a.date ? a.date.key : -1) || a.index - b.index;
      });
    }
    return out;
  }

  /** Todas as fotos das avaliações, na ordem: [{src, review, photoIndex}]. */
  function reviewPhotos(list) {
    var photos = [];
    list.forEach(function (r) {
      r.images.forEach(function (src, i) {
        photos.push({ src: src, review: r, photoIndex: i });
      });
    });
    return photos;
  }

  function initials(name) {
    var words = String(name || "")
      .replace(/[^A-Za-zÀ-ÿ\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return "?";
    var first = words[0].charAt(0);
    var last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
  }

  /* ───────────────────────────── Textos ───────────────────────────── */

  /** Valores que os textos da configuração podem usar entre chaves. */
  function tokenContext(catalog, config) {
    var store = (config && config.store) || {};
    var ctx = {
      "sabores.total": String(catalog.flavors.length),
      vendidos: store.sold || "",
      "vendidos.curto": store.soldShort || store.sold || "",
    };
    catalog.shipping.forEach(function (s) {
      ctx["frete." + s.id + ".preco"] = formatBRL(s.priceCents);
      ctx["frete." + s.id + ".prazo"] = s.days === null ? "" : String(s.days);
    });
    return ctx;
  }

  function fillTokens(text, ctx) {
    return String(text === null || text === undefined ? "" : text).replace(/\{([\w.]+)\}/g, function (all, key) {
      return Object.prototype.hasOwnProperty.call(ctx, key) ? ctx[key] : all;
    });
  }

  return {
    toCents: toCents,
    fromCents: fromCents,
    formatBRL: formatBRL,
    formatWeight: formatWeight,
    roundHalfDown: roundHalfDown,
    plural: plural,
    createCatalog: createCatalog,
    groupSummary: groupSummary,
    upgradeFor: upgradeFor,
    flavorFits: flavorFits,
    changeOffer: changeOffer,
    setSlot: setSlot,
    fillEmptySlots: fillEmptySlots,
    nextEmptySlot: nextEmptySlot,
    selectionStatus: selectionStatus,
    groupFlavors: groupFlavors,
    flavorCounts: flavorCounts,
    computeTotals: computeTotals,
    validateOrder: validateOrder,
    buildOrder: buildOrder,
    makeOrderId: makeOrderId,
    orderToText: orderToText,
    orderToParams: orderToParams,
    appendQuery: appendQuery,
    base64UrlEncode: base64UrlEncode,
    base64UrlDecode: base64UrlDecode,
    parseReviewDate: parseReviewDate,
    matchFlavor: matchFlavor,
    normalizeReviews: normalizeReviews,
    reviewStats: reviewStats,
    filterReviews: filterReviews,
    reviewPhotos: reviewPhotos,
    initials: initials,
    tokenContext: tokenContext,
    fillTokens: fillTokens,
  };
});
