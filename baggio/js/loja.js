/* Café Baggio — interface da página: galeria, kits, monte seu kit, entrega,
   extras, resumo, barra fixa, carrinho, avaliações e checkout.
   Regras de preço e pedido: js/core.js · números e textos: js/config.js ·
   avaliações: js/reviews.js · eventos: js/analytics.js */
(function () {
  "use strict";

  const config = window.BAGGIO_CONFIG;
  const core = window.BaggioCore;
  if (!config || !core) {
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML =
        '<p class="fatal">Não foi possível carregar a loja. Confira se o arquivo js/config.js foi salvo sem erros (preços com ponto: 40.90).</p>';
    }
    document.documentElement.classList.add("is-ready");
    return;
  }

  const analytics = window.BaggioAnalytics || { track() {}, orderItems: () => [] };
  const reviewsData = window.BAGGIO_REVIEWS || { reviews: [], reviewsPlaceholder: [], settings: {} };
  const reviewSettings = reviewsData.settings || {};
  const catalog = core.createCatalog(config);
  const store = config.store || {};
  const tokens = core.tokenContext(catalog, config);
  const fill = (text) => core.fillTokens(text, tokens);
  const money = core.formatBRL;
  const motion = () => !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const freeShipping = catalog.shipping.filter((s) => s.priceCents === 0)[0] || null;

  /* ───────────────────────────── Utilidades ───────────────────────────── */

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (value) => String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g, (c) => ESC[c]);
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.prototype.slice.call((root || document).querySelectorAll(selector));
  const digits = (value) => String(value || "").replace(/\D/g, "");

  const ICON = {
    check:
      '<svg class="i" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close:
      '<svg class="i" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    left: '<svg class="i" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right:
      '<svg class="i" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg class="i" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg class="i" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    swap: '<svg class="i" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M7 7h12l-3-3M17 17H5l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash:
      '<svg class="i" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /** Estrelas com preenchimento proporcional à nota (0 a 5). */
  function stars(value, size) {
    const pct = Math.max(0, Math.min(100, (value / 5) * 100));
    return (
      '<span class="stars' +
      (size ? " stars--" + size : "") +
      '" aria-hidden="true"><span class="stars__bg">★★★★★</span><span class="stars__fg" style="width:' +
      pct.toFixed(1) +
      '%">★★★★★</span></span>'
    );
  }

  /** Troca o conteúdo só quando ele muda, devolvendo o foco ao mesmo controle. */
  function patch(el, html) {
    if (!el || el._html === html) return false;
    const active = document.activeElement;
    const key = active && el.contains(active) ? active.getAttribute("data-key") : null;
    el.innerHTML = html;
    el._html = html;
    if (key) {
      const next = $$("[data-key]", el).filter((n) => n.getAttribute("data-key") === key)[0];
      if (next) next.focus({ preventScroll: true });
    }
    return true;
  }

  let toastTimer = 0;
  function toast(message) {
    const el = $("#aviso");
    el.textContent = message;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2600);
  }

  function flash(el) {
    if (!el) return;
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  }

  function scrollToEl(el, block) {
    if (el) el.scrollIntoView({ behavior: motion() ? "smooth" : "auto", block: block || "start" });
  }

  let locks = 0;
  function lockScroll(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    document.documentElement.classList.toggle("is-locked", locks > 0);
  }

  function readStorage(key) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "null");
    } catch (e) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* navegação privada sem armazenamento: segue sem salvar */
    }
  }

  /* ───────────────────────────── Estado ───────────────────────────── */

  const STORAGE_KEY = "baggio:pedido:v1";
  const LAST_ORDER_KEY = "baggio:ultimo-pedido";

  const state = {
    selection: core.changeOffer(catalog, null, catalog.menu.defaultOfferId),
    activeSlot: 0,
    lastFlavor: null,
    shippingId: catalog.defaultShippingId,
    extras: {},
    inCart: false,
    moreOpen: false,
    cartOpen: false,
    cartSwitchOpen: false,
    demoOrder: null,
    reviewFilter: "all",
    reviewsShown: 0,
    trackedCart: "",
    viewedReviews: false,
  };

  function restore() {
    const saved = readStorage(STORAGE_KEY);
    if (saved && saved.v === 1) {
      if (catalog.offerById[saved.offerId]) {
        let selection = core.changeOffer(catalog, { slots: [], memory: Array.isArray(saved.memory) ? saved.memory : [] }, saved.offerId);
        (Array.isArray(saved.slots) ? saved.slots : []).forEach((id, i) => {
          if (id) selection = core.setSlot(catalog, selection, i, id);
        });
        state.selection = selection;
      }
      if (catalog.shippingById[saved.shippingId]) state.shippingId = saved.shippingId;
      if (saved.extras && typeof saved.extras === "object") {
        Object.keys(saved.extras).forEach((id) => {
          const extra = catalog.extraById[id];
          const quantity = Math.floor(Number(saved.extras[id]) || 0);
          if (extra && extra.available && quantity > 0) state.extras[id] = Math.min(quantity, extra.maxQuantity);
        });
      }
      state.inCart = saved.inCart === true;
    }
    // Link direto para um kit (ex.: anúncio): ?kit=4x250
    const kit = new URLSearchParams(window.location.search).get("kit");
    if (kit && catalog.offerById[kit]) state.selection = core.changeOffer(catalog, state.selection, kit);
    state.activeSlot = core.nextEmptySlot(state.selection.slots, 0);
  }

  function save() {
    writeStorage(STORAGE_KEY, {
      v: 1,
      offerId: state.selection.offerId,
      slots: state.selection.slots,
      memory: state.selection.memory,
      shippingId: state.shippingId,
      extras: state.extras,
      inCart: state.inCart,
    });
  }

  const offer = () => catalog.offerById[state.selection.offerId];
  const status = () => core.selectionStatus(catalog, state.selection);
  const orderInput = () => ({ offerId: state.selection.offerId, slots: state.selection.slots, shippingId: state.shippingId, extras: state.extras });
  const totals = () => core.computeTotals(catalog, orderInput());
  const flavorImage = (flavor, size) => (size === 500 && flavor.image500) || flavor.image;
  /** Sabores que existem neste peso (ex.: 500g só Bourbon e Espresso). */
  const flavorsForSize = (size) => catalog.flavors.filter((f) => f.sizes.indexOf(size) !== -1);
  /** "Bourbon e Espresso" quando só alguns sabores existem no peso; vazio quando todos existem. */
  const sizeFlavorsText = (size) => {
    const list = flavorsForSize(size);
    if (list.length === catalog.flavors.length) return "";
    const names = list.map((f) => f.name);
    return names.length > 1 ? names.slice(0, -1).join(", ") + " e " + names[names.length - 1] : names.join("");
  };
  const perPack = (o) => (o.perPackExact ? "" : "≈ ") + money(o.perPackCents);
  const badgeClass = (text) => (/VENDIDO/i.test(text) ? "badge--hot" : "badge--best");
  const extrasCount = () => Object.keys(state.extras).reduce((sum, id) => sum + (state.extras[id] || 0), 0);

  function flavorsText(slots) {
    return core
      .groupFlavors(catalog, slots)
      .map((g) => g.quantity + "× " + g.flavor.name)
      .join(", ");
  }

  /* ───────────────────────────── Analytics ───────────────────────────── */

  function offerItem(o, slots) {
    const item = {
      item_id: o.id,
      item_name: "Café Baggio — " + o.displayName,
      item_brand: "Baggio",
      item_category: "Café",
      price: core.fromCents(o.priceCents),
      quantity: 1,
    };
    const variant = slots ? flavorsText(slots) : "";
    if (variant) item.item_variant = variant.slice(0, 100);
    return item;
  }

  function selectionEcommerce() {
    const t = totals();
    const items = [offerItem(t.offer, state.selection.slots)];
    t.extras.forEach((e) => {
      items.push({ item_id: e.extra.id, item_name: e.extra.fullName, item_category: "Extras", price: core.fromCents(e.extra.priceCents), quantity: e.quantity });
    });
    return { currency: "BRL", value: core.fromCents(t.subtotalCents), items: items };
  }

  /* ───────────────────────────── Faixa e logo ───────────────────────────── */

  /** Promoção ligada em config.js (e dentro do prazo, se houver prazo). */
  function activePromo() {
    const p = config.promo;
    if (!p || !p.active) return null;
    if (p.endsAt) {
      const end = Date.parse(p.endsAt);
      if (!isFinite(end) || end <= Date.now()) return null;
    }
    return p;
  }

  /** Selo de promoção ao lado de um preço com desconto. */
  function promoTag(o) {
    const promo = activePromo();
    return promo && o.savingsCents > 0 ? '<span class="promo-tag">🔥 ' + esc(promo.label || "PROMOÇÃO") + "</span>" : "";
  }

  function countdown(endsAt) {
    let s = Math.max(0, Math.floor((Date.parse(endsAt) - Date.now()) / 1000));
    const d = Math.floor(s / 86400);
    s -= d * 86400;
    const two = (n) => (n < 10 ? "0" : "") + n;
    return "termina em " + (d ? d + "d " : "") + two(Math.floor(s / 3600)) + ":" + two(Math.floor((s % 3600) / 60)) + ":" + two(s % 60);
  }

  let promoTimer = 0;
  function renderTopbar() {
    const el = $("#faixa");
    const promo = activePromo();
    // Partes separadas por "•" (a frase da promoção primeiro); as que não cabem na tela ficam de fora.
    const parts = [];
    if (promo && promo.topBar) parts.push(fill(promo.topBar).trim());
    fill(store.topBar || "")
      .split("•")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => parts.push(part));
    let html = parts.map((part) => '<span class="topbar__part">' + esc(part) + "</span>").join("");
    if (promo && promo.endsAt) html += ' <span class="topbar__timer" data-countdown>' + esc(countdown(promo.endsAt)) + "</span>";
    if (promo && promo.stockLeft) html += ' <span class="topbar__stock">Restam ' + esc(promo.stockLeft) + " unidades</span>";
    el.innerHTML = html;
    el.hidden = !html;
    fitTopbar();
    clearInterval(promoTimer);
    if (promo && promo.endsAt) {
      promoTimer = setInterval(() => {
        if (!activePromo()) return renderTopbar();
        const timer = $("[data-countdown]", el);
        if (timer) timer.textContent = countdown(promo.endsAt);
      }, 1000);
    }
  }

  /** Faixa do topo em uma linha: esconde as últimas frases que não cabem; se nem a
   *  primeira couber, diminui a letra (até 10px) e, em último caso, quebra a linha. */
  function fitTopbar() {
    const el = $("#faixa");
    const parts = $$(".topbar__part", el);
    const overflows = () => el.scrollWidth > el.clientWidth;
    el.style.fontSize = "";
    el.classList.remove("is-wrap");
    parts.forEach((part) => (part.hidden = false));
    for (let i = parts.length - 1; i > 0 && overflows(); i--) parts[i].hidden = true;
    for (let size = 11.5; size >= 10 && overflows(); size -= 0.5) el.style.fontSize = size + "px";
    if (overflows()) el.classList.add("is-wrap");
  }

  let fitTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitTopbar, 150);
  });

  function renderLogo() {
    if (!store.logo) return;
    $("#logo").innerHTML = '<img src="' + esc(store.logo) + '" alt="' + esc(store.name) + '" height="32">';
  }

  /* ───────────────────────────── Galeria ───────────────────────────── */

  const galleryItems = (config.gallery || []).filter((g) => g && g.src);
  let galleryIndex = 0;

  function renderGallery() {
    const el = $("#galeria");
    if (!galleryItems.length) {
      el.hidden = true;
      return;
    }
    const n = galleryItems.length;
    const slides = galleryItems
      .map(
        (g, i) =>
          '<li class="gallery__slide"><button type="button" class="gallery__zoom" data-action="zoom-gallery" data-index="' +
          i +
          '" aria-label="Ampliar foto ' +
          (i + 1) +
          " de " +
          n +
          '"><img src="' +
          esc(g.src) +
          '" alt="' +
          esc(g.alt || store.name) +
          '" width="1200" height="1200" decoding="async"' +
          (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') +
          "></button></li>",
      )
      .join("");
    const thumbs = galleryItems
      .map(
        (g, i) =>
          '<li><button type="button" class="gallery__thumb' +
          (i === 0 ? " is-active" : "") +
          '" data-action="gallery-go" data-index="' +
          i +
          '" aria-label="Ver foto ' +
          (i + 1) +
          '"' +
          (i === 0 ? ' aria-current="true"' : "") +
          '><img src="' +
          esc(g.thumb || g.src) +
          '" alt="" width="72" height="72" loading="lazy" decoding="async"></button></li>',
      )
      .join("");
    const nav =
      n > 1
        ? '<button type="button" class="gallery__nav gallery__nav--prev" data-action="gallery-prev" aria-label="Foto anterior">' +
          ICON.left +
          '</button><button type="button" class="gallery__nav gallery__nav--next" data-action="gallery-next" aria-label="Próxima foto">' +
          ICON.right +
          '</button><span class="gallery__count" aria-hidden="true"><b data-count>1</b>/' +
          n +
          "</span>"
        : "";
    el.innerHTML =
      '<div class="gallery__main"><ul class="gallery__track" data-track>' +
      slides +
      "</ul>" +
      nav +
      "</div>" +
      (n > 1 ? '<ul class="gallery__thumbs" aria-label="Miniaturas">' + thumbs + "</ul>" : "");

    const track = $("[data-track]", el);
    let ticking = false;
    track.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          setGalleryIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
        });
      },
      { passive: true },
    );
  }

  function setGalleryIndex(i) {
    if (i === galleryIndex || i < 0 || i >= galleryItems.length) return;
    galleryIndex = i;
    const el = $("#galeria");
    const count = $("[data-count]", el);
    if (count) count.textContent = String(i + 1);
    $$(".gallery__thumb", el).forEach((b, k) => {
      b.classList.toggle("is-active", k === i);
      if (k === i) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
  }

  function galleryGo(i) {
    const track = $("#galeria [data-track]");
    if (!track) return;
    const n = galleryItems.length;
    const index = ((i % n) + n) % n;
    track.scrollTo({ left: index * track.clientWidth, behavior: motion() ? "smooth" : "auto" });
    setGalleryIndex(index);
  }

  /* ─────────────────────── Informações do produto ─────────────────────── */

  const realReviews = core.normalizeReviews(reviewsData.reviews, catalog);
  const placeholderReviews = core.normalizeReviews(reviewsData.reviewsPlaceholder, catalog, { placeholder: true });
  const reviewsMode = realReviews.length ? "real" : reviewSettings.showPlaceholders !== false && placeholderReviews.length ? "placeholder" : "empty";
  const activeReviews = reviewsMode === "real" ? realReviews : reviewsMode === "placeholder" ? placeholderReviews : [];
  const reviewStats = core.reviewStats(activeReviews);

  function shippingInfoHTML() {
    const fast = catalog.shipping
      .filter((s) => s !== freeShipping && s.days)
      .sort((a, b) => a.days - b.days)[0];
    let html = '<div class="shipinfo">';
    if (freeShipping) {
      html +=
        '<p class="shipinfo__free"><b>' +
        esc(freeShipping.badge || "🚚 FRETE GRÁTIS") +
        "</b> <span>Entrega grátis via " +
        esc(freeShipping.name) +
        (freeShipping.days ? " · até " + freeShipping.days + " dias úteis" : "") +
        "</span></p>";
    }
    if (fast) {
      html +=
        '<p class="shipinfo__fast"><span aria-hidden="true">⚡</span> ' +
        esc(fast.name) +
        ": receba em até " +
        fast.days +
        " dias úteis por + " +
        money(fast.priceCents) +
        "</p>";
    }
    return html + "</div>";
  }

  function renderInfo() {
    let rating = "";
    if (reviewsMode === "real") {
      rating =
        '<a class="rating" href="#avaliacoes" data-action="go-reviews">' +
        stars(reviewStats.exactAverage) +
        "<b>" +
        esc(reviewStats.averageText) +
        '</b><span class="rating__count">(' +
        reviewStats.count +
        ')</span><span class="rating__link">Ver avaliações</span></a>';
    } else if (reviewsMode === "placeholder") {
      rating = '<a class="rating" href="#avaliacoes" data-action="go-reviews">' + stars(5) + '<span class="rating__link">Ver avaliações</span></a>';
    }
    const sold = store.sold ? '<span class="sold">' + esc(store.sold) + "</span>" : "";
    // No celular o preço vem logo abaixo da foto (como nos marketplaces); no computador, depois do título.
    $("#info").innerHTML =
      '<div class="price" id="preco"></div>' +
      '<h1 class="pinfo__title">' +
      esc(fill(store.title)) +
      "</h1>" +
      '<div class="pinfo__social">' +
      rating +
      sold +
      "</div>" +
      '<p class="pinfo__desc">' +
      esc(fill(store.description)) +
      "</p>" +
      (store.facts && store.facts.length
        ? '<ul class="pinfo__facts" aria-label="Características">' + store.facts.map((t) => "<li>" + esc(fill(t)) + "</li>").join("") + "</ul>"
        : "") +
      shippingInfoHTML();
  }

  function renderPrice() {
    const o = offer();
    let html = "";
    if (o.savingsCents > 0) {
      html +=
        '<p class="price__old">' +
        promoTag(o) +
        '<span class="sr-only">De </span><s>' +
        money(o.referenceCents) +
        '</s><span class="off">-' +
        o.discountPercent +
        "%</span></p>";
    }
    html +=
      '<p class="price__now"><span class="sr-only">Por </span><span class="price__value">' +
      money(o.priceCents) +
      "</span>" +
      (o.packs > 1 ? '<span class="price__unit">' + perPack(o) + " por pacote</span>" : "") +
      "</p>";
    const what = o.packs === 1 ? o.detail : o.name + " · " + o.detail + (o.totalGrams >= 1000 ? " · " + core.formatWeight(o.totalGrams) : "");
    html +=
      '<p class="price__what">' +
      esc(what) +
      (o.savingsCents > 0 ? ' · <b class="save">Você economiza ' + money(o.savingsCents) + "</b>" : "") +
      "</p>";
    patch($("#preco"), html);
  }

  /* ───────────────────────────── Ofertas ───────────────────────────── */

  function offerRow(o, checked) {
    const side =
      (o.savingsCents > 0 ? '<s class="opt__old"><span class="sr-only">De </span>' + money(o.referenceCents) + "</s>" : "") +
      '<span class="opt__price">' +
      (o.savingsCents > 0 ? '<span class="sr-only">Por </span>' : "") +
      money(o.priceCents) +
      "</span>" +
      (o.packs > 1
        ? '<span class="opt__unit">' + perPack(o) + "/pacote</span>"
        : freeShipping
          ? '<span class="opt__unit opt__unit--free">Frete grátis</span>'
          : "");
    return (
      '<label class="opt' +
      (checked ? " is-selected" : "") +
      '"><input class="opt__input" type="radio" name="kit" value="' +
      esc(o.id) +
      '" data-key="kit-' +
      esc(o.id) +
      '"' +
      (checked ? " checked" : "") +
      '><span class="opt__radio" aria-hidden="true"></span><span class="opt__main"><span class="opt__title">' +
      esc(o.packs === 1 ? "1 pacote" : o.name) +
      (o.badge ? ' <span class="badge ' + badgeClass(o.badge) + '">' + esc(o.badge) + "</span>" : "") +
      '</span><span class="opt__sub">' +
      esc(o.packs === 1 ? o.size + "g" + (o.grind ? " " + o.grind : "") : o.detail) +
      (o.discountPercent ? ' <span class="off off--sm">-' + o.discountPercent + "%</span>" : "") +
      "</span>" +
      (o.savingsCents > 0 ? '<span class="opt__save">Economize ' + money(o.savingsCents) + "</span>" : "") +
      '</span><span class="opt__side">' +
      side +
      "</span></label>"
    );
  }

  function oneKgChoices() {
    const g = catalog.menu.oneKg;
    const summary = core.groupSummary(catalog, g.offers);
    const sameWeight = summary.offers.every((o) => o.totalGrams === summary.offers[0].totalGrams);
    const cards = summary.offers
      .map((o) => {
        const selected = o.id === state.selection.offerId;
        return (
          '<div class="kg' +
          (selected ? " is-selected" : "") +
          '" data-action="offer" data-offer="' +
          esc(o.id) +
          '">' +
          (selected ? '<span class="kg__check" aria-hidden="true">' + ICON.check + "</span>" : "") +
          '<p class="kg__name">' +
          esc(o.name.toUpperCase()) +
          "</p>" +
          '<p class="kg__packs">' +
          esc(o.detail) +
          "</p>" +
          (sizeFlavorsText(o.size) ? '<p class="kg__flavors">' + esc(sizeFlavorsText(o.size)) + "</p>" : "") +
          '<p class="kg__total">Total: <b>' +
          core.formatWeight(o.totalGrams) +
          "</b></p>" +
          '<p class="kg__price">' +
          money(o.priceCents) +
          "</p>" +
          (o.savingsCents ? '<p class="kg__old"><s>' + money(o.referenceCents) + '</s> <span class="off off--sm">-' + o.discountPercent + "%</span></p>" : "") +
          (o.tagline ? '<p class="kg__tag">' + esc(o.tagline) + "</p>" : "") +
          '<button type="button" class="btn btn--sm btn--block ' +
          (selected ? "btn--cta" : "btn--outline") +
          '" data-action="offer-go" data-offer="' +
          esc(o.id) +
          '" data-key="kg-' +
          esc(o.id) +
          '">' +
          esc(o.cta || "ESCOLHER") +
          "</button></div>"
        );
      })
      .join("");
    const note =
      summary.samePrice && sameWeight
        ? "As " +
          (summary.offers.length === 2 ? "duas" : summary.offers.length) +
          " opções têm " +
          core.formatWeight(summary.offers[0].totalGrams) +
          " e o mesmo preço."
        : "";
    return (
      '<div class="kgs" role="group" aria-label="Escolha como quer seu ' +
      esc(g.name) +
      '"><p class="kgs__ask">Escolha como quer seu ' +
      esc(g.name.toLowerCase()) +
      ":</p>" +
      '<div class="kgs__grid">' +
      cards +
      "</div>" +
      (note ? '<p class="kgs__note">' + esc(note) + "</p>" : "") +
      "</div>"
    );
  }

  function groupRow(checked) {
    const g = catalog.menu.oneKg;
    const summary = core.groupSummary(catalog, g.offers);
    const sub = summary.offers.map((o) => o.kitLabel).join(" ou ");
    return (
      '<label class="opt opt--hero' +
      (checked ? " is-selected" : "") +
      '"><input class="opt__input" type="radio" name="kit" value="1kg" data-key="kit-1kg"' +
      (checked ? " checked" : "") +
      '><span class="opt__radio" aria-hidden="true"></span><span class="opt__main"><span class="opt__title">' +
      esc(g.name) +
      (g.badge ? ' <span class="badge badge--best">' + esc(g.badge) + "</span>" : "") +
      '</span><span class="opt__sub">' +
      esc(sub) +
      (summary.maxDiscountPercent ? ' <span class="off off--sm">até -' + summary.maxDiscountPercent + "%</span>" : "") +
      "</span>" +
      (summary.maxSavingsCents ? '<span class="opt__save">Economize até ' + money(summary.maxSavingsCents) + "</span>" : "") +
      '</span><span class="opt__side"><span class="opt__price">' +
      (summary.samePrice ? "" : '<small>a partir de </small>') +
      money(summary.minPriceCents) +
      '</span><span class="opt__unit">' +
      esc(summary.offers.length > 1 ? summary.offers.length + " opções" : "") +
      "</span></span></label>" +
      (checked ? oneKgChoices() : "")
    );
  }

  /** Quadro da promoção: "Pacote de 250g: de R$ 40,90 por R$ 29,90" (de PRICES.regular / unit). */
  function promoBoxHTML() {
    const promo = activePromo();
    if (!promo || !catalog.packPromos.length) return "";
    return (
      '<div class="promo-box"><p class="promo-box__title">🔥 ' +
      esc(promo.label || "PROMOÇÃO") +
      '</p><ul class="promo-box__list">' +
      catalog.packPromos
        .map(
          (p) =>
            "<li>Pacote de " +
            p.size +
            "g" +
            (catalog.grindBySize[p.size] ? " " + esc(catalog.grindBySize[p.size]) : "") +
            (sizeFlavorsText(p.size) ? " (" + esc(sizeFlavorsText(p.size)) + ")" : "") +
            ": de <s>" +
            money(p.regularCents) +
            "</s> por <b>" +
            money(p.priceCents) +
            "</b></li>",
        )
        .join("") +
      "</ul></div>"
    );
  }

  function nudgeHTML(o) {
    const up = core.upgradeFor(catalog, o.id);
    if (!up) return "";
    const target = up.offer;
    const weight = target.totalGrams >= 1000 ? " (" + core.formatWeight(target.totalGrams) + ")" : "";
    return (
      '<div class="nudge"><span class="nudge__icon" aria-hidden="true">💡</span><p>Por <b>+ ' +
      money(up.extraCents) +
      "</b> leve " +
      target.packs +
      " pacotes" +
      weight +
      ": <b>" +
      perPack(target) +
      '</b> cada.</p><button type="button" class="btn btn--xs btn--outline" data-action="offer" data-offer="' +
      esc(target.id) +
      '" data-key="nudge">Quero</button></div>'
    );
  }

  function renderOffers() {
    const o = offer();
    const menu = catalog.menu;
    const inGroup = !!menu.oneKg && menu.oneKg.offers.indexOf(o.id) !== -1;
    const moreSelected = menu.more.indexOf(o.id) !== -1;
    const moreOpen = state.moreOpen || moreSelected;
    let rows = menu.main.map((id) => (id === "1kg" ? groupRow(inGroup) : offerRow(catalog.offerById[id], o.id === id))).join("");
    if (moreOpen) rows += menu.more.map((id) => offerRow(catalog.offerById[id], o.id === id)).join("");
    let toggle = "";
    if (menu.more.length && !moreSelected) {
      const hint = menu.more.map((id) => catalog.offerById[id].detail).join(" · ");
      toggle =
        '<button type="button" class="more" data-action="more-toggle" data-key="more" aria-expanded="' +
        moreOpen +
        '">' +
        (moreOpen ? "Ver menos opções" : "Ver mais opções") +
        (moreOpen ? "" : ' <span class="more__hint">(' + esc(hint) + ")</span>") +
        ICON.down +
        "</button>";
    }
    patch(
      $("#ofertas"),
      '<div class="block__head"><h2 class="block__title" id="ofertas-titulo">ESCOLHA SEU KIT</h2>' +
        (freeShipping ? '<span class="block__aside block__aside--free">🚚 Frete grátis no ' + esc(freeShipping.name) + "</span>" : "") +
        "</div>" +
        promoBoxHTML() +
        '<fieldset class="opts"><legend class="sr-only">Escolha seu kit</legend>' +
        rows +
        "</fieldset>" +
        toggle +
        nudgeHTML(o),
    );
  }

  function selectOffer(id, scroll) {
    if (!catalog.offerById[id]) return;
    if (id !== state.selection.offerId) {
      state.selection = core.changeOffer(catalog, state.selection, id);
      state.activeSlot = core.nextEmptySlot(state.selection.slots, 0);
      const o = offer();
      analytics.track("select_offer", {
        offer_id: o.id,
        offer_name: o.displayName,
        price: core.fromCents(o.priceCents),
        currency: "BRL",
      });
      update();
    }
    if (scroll) scrollToEl($("#montar"));
  }

  /* ───────────────────────────── Monte seu kit ───────────────────────────── */

  let builderKey = "";

  function renderBuilder() {
    const o = offer();
    const el = $("#montar");
    const key = o.id + "|" + catalog.flavors.map((f) => f.id + (core.flavorFits(catalog, f.id, o.size) ? "" : "!")).join(",");
    if (key !== builderKey) {
      builderKey = key;
      const single = o.packs === 1;
      let slots = "";
      if (!single) {
        for (let i = 0; i < o.packs; i++) {
          slots +=
            '<button type="button" class="slot" data-action="slot" data-slot="' +
            i +
            '" data-key="slot-' +
            i +
            '"><span class="slot__img"><img alt="" width="96" height="96" decoding="async" hidden><span class="slot__plus" aria-hidden="true">+</span></span><span class="slot__label">Pacote ' +
            (i + 1) +
            '</span><span class="slot__name"></span></button>';
        }
        slots = '<div class="slots" style="--n:' + o.packs + '">' + slots + "</div>";
      }
      const cards = flavorsForSize(o.size)
        .map((f) => {
          const fits = core.flavorFits(catalog, f.id, o.size);
          return (
            '<button type="button" class="flavor' +
            (fits ? "" : " is-off") +
            '" data-action="flavor" data-flavor="' +
            esc(f.id) +
            '" data-key="flavor-' +
            esc(f.id) +
            '"' +
            (fits ? "" : " disabled") +
            ' aria-pressed="false"><span class="flavor__img" style="--c:' +
            esc(f.color) +
            '"><img src="' +
            esc(flavorImage(f, o.size)) +
            '" alt="" width="300" height="300" loading="lazy" decoding="async">' +
            (f.award ? '<span class="award"><span aria-hidden="true">🏅</span> BLEND PREMIADO</span>' : "") +
            '<span class="flavor__count" aria-hidden="true"></span></span><span class="flavor__name">' +
            esc(f.name) +
            '</span><span class="flavor__meta">' +
            (fits ? o.size + "g" : "Indisponível") +
            "</span></button>"
          );
        })
        .join("");
      el.innerHTML =
        '<div class="block__head"><h2 class="block__title" id="montar-titulo">' +
        (single ? "ESCOLHA SEU SABOR" : "MONTE SEU KIT") +
        '</h2><span class="block__aside">' +
        esc(single ? o.detail : o.name + " · " + o.kitLabel + (o.grind ? " " + o.grind : "")) +
        "</span></div>" +
        (single
          ? ""
          : '<div class="progress"><p class="progress__text" data-progress></p><div class="progress__bar"><span data-progress-bar></span></div></div>') +
        slots +
        '<p class="ask" data-ask></p>' +
        '<div class="flavors" role="group" aria-label="Sabores">' +
        cards +
        "</div>" +
        '<div class="tools" data-tools></div>';
    }
    syncBuilder();
  }

  /** Atualiza o kit sem recriar fotos: pacotes, contadores, progresso e dicas. */
  function syncBuilder() {
    const el = $("#montar");
    const o = offer();
    const st = status();
    const slots = state.selection.slots;
    const counts = core.flavorCounts(slots);
    const single = o.packs === 1;

    const progress = $("[data-progress]", el);
    if (progress) {
      progress.innerHTML = st.complete
        ? '<b class="ok">Seu kit está pronto ✓</b>'
        : "<b>" + st.filled + " de " + st.total + "</b> sabores escolhidos";
      $("[data-progress-bar]", el).style.width = (st.filled / st.total) * 100 + "%";
      progress.parentNode.classList.toggle("is-done", st.complete);
    }

    $$(".slot", el).forEach((btn, i) => {
      const flavor = slots[i] ? catalog.flavorById[slots[i]] : null;
      const active = i === state.activeSlot;
      btn.classList.toggle("is-filled", !!flavor);
      btn.classList.toggle("is-active", active);
      const img = $("img", btn);
      if (flavor) {
        const src = flavorImage(flavor, o.size);
        if (img.getAttribute("src") !== src) img.setAttribute("src", src);
        img.hidden = false;
      } else {
        img.hidden = true;
      }
      $(".slot__name", btn).textContent = flavor ? flavor.name : active ? "Escolhendo…" : "Escolher";
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        "Pacote " + (i + 1) + ": " + (flavor ? flavor.name : "sem sabor") + (active ? " — escolhendo agora" : ", toque para trocar"),
      );
    });

    const ask = $("[data-ask]", el);
    if (single) {
      ask.innerHTML = slots[0] ? "Sabor escolhido: <b>" + esc(catalog.flavorById[slots[0]].name) + " ✓</b>" : "Toque no sabor que você quer:";
    } else if (state.activeSlot >= 0) {
      ask.innerHTML =
        "Escolha o sabor do <b>Pacote " + (state.activeSlot + 1) + "</b>" + (slots[state.activeSlot] ? " (toque em outro sabor para trocar)" : "") + ":";
    } else {
      ask.innerHTML = "Quer trocar? Toque no pacote e depois no novo sabor.";
    }

    $$(".flavor", el).forEach((btn) => {
      const id = btn.getAttribute("data-flavor");
      const n = counts[id] || 0;
      const flavor = catalog.flavorById[id];
      btn.classList.toggle("is-selected", n > 0);
      btn.setAttribute("aria-pressed", n > 0 ? "true" : "false");
      $(".flavor__count", btn).textContent = n > 1 ? n + "×" : n === 1 ? "✓" : "";
      btn.setAttribute(
        "aria-label",
        flavor.name +
          (flavor.award ? ", Blend Premiado" : "") +
          ", " +
          o.size +
          "g" +
          (n ? " — " + n + (n === 1 ? " pacote no kit" : " pacotes no kit") : ""),
      );
    });

    const tools = $("[data-tools]", el);
    let html = "";
    if (!single && !st.complete && st.filled > 0 && state.lastFlavor && core.flavorFits(catalog, state.lastFlavor, o.size)) {
      const f = catalog.flavorById[state.lastFlavor];
      html =
        '<button type="button" class="linkbtn" data-action="repeat" data-flavor="' +
        esc(f.id) +
        '" data-key="repeat">↻ Usar ' +
        esc(f.name) +
        (st.remaining === 1 ? " no pacote restante" : " nos " + st.remaining + " pacotes restantes") +
        "</button>";
    }
    patch(tools, html);
  }

  function pickFlavor(flavorId) {
    const o = offer();
    if (!core.flavorFits(catalog, flavorId, o.size)) return;
    let index;
    if (o.packs === 1) index = 0;
    else if (state.activeSlot >= 0) index = state.activeSlot;
    else {
      toast("Seu kit já está completo. Toque no pacote que quer trocar.");
      flash($("#montar .slots"));
      return;
    }
    const wasComplete = status().complete;
    state.selection = core.setSlot(catalog, state.selection, index, flavorId);
    state.lastFlavor = flavorId;
    state.activeSlot = o.packs === 1 ? 0 : core.nextEmptySlot(state.selection.slots, index + 1);
    const st = status();
    analytics.track("select_flavor", {
      flavor_id: flavorId,
      flavor_name: catalog.flavorById[flavorId].name,
      package_number: index + 1,
      kit_id: o.id,
      size: o.size,
      kit_complete: st.complete,
    });
    if (st.complete && !wasComplete && o.packs > 1) toast("Seu kit está pronto ✓");
    update();
  }

  function repeatFlavor(flavorId) {
    const o = offer();
    state.selection = core.fillEmptySlots(catalog, state.selection, flavorId);
    state.activeSlot = core.nextEmptySlot(state.selection.slots, 0);
    analytics.track("select_flavor", {
      flavor_id: flavorId,
      flavor_name: catalog.flavorById[flavorId].name,
      package_number: 0,
      kit_id: o.id,
      size: o.size,
      kit_complete: status().complete,
      repeat: true,
    });
    if (status().complete) toast("Seu kit está pronto ✓");
    update();
  }

  /** Leva o cliente ao primeiro pacote sem sabor. */
  function guideToMissing() {
    const st = status();
    if (st.complete) return;
    const first = st.missing[0];
    state.activeSlot = first;
    syncBuilder();
    const o = offer();
    toast(o.packs === 1 ? "Escolha o sabor do seu café" : "Escolha o sabor do Pacote " + (first + 1));
    scrollToEl($("#montar"));
    flash($('#montar .slot[data-slot="' + first + '"]') || $("#montar .flavors"));
  }

  /* ───────────────────────────── Entrega ───────────────────────────── */

  function shippingHTML(name) {
    const rows = catalog.shipping
      .map((s) => {
        const selected = s.id === state.shippingId;
        const free = s.priceCents === 0;
        return (
          '<label class="opt ship' +
          (selected ? " is-selected" : "") +
          '"><input class="opt__input" type="radio" name="' +
          name +
          '" value="' +
          esc(s.id) +
          '" data-key="' +
          name +
          "-" +
          esc(s.id) +
          '"' +
          (selected ? " checked" : "") +
          '><span class="opt__radio" aria-hidden="true"></span><span class="opt__main"><span class="opt__title">' +
          esc(s.name) +
          (s.label ? " — " + esc(s.label) : "") +
          "</span>" +
          (s.badge ? '<span class="ship__badge ' + (free ? "is-free" : "is-fast") + '">' + esc(s.badge) + "</span>" : "") +
          '<span class="opt__sub">' +
          (s.days ? "Até " + s.days + " dias úteis" : "") +
          '</span></span><span class="opt__side"><span class="opt__price' +
          (free ? " is-free" : "") +
          '">' +
          (free ? money(0) : "+ " + money(s.priceCents)) +
          "</span></span></label>"
        );
      })
      .join("");
    return '<fieldset class="opts"><legend class="block__title">ESCOLHA SUA ENTREGA</legend>' + rows + "</fieldset>";
  }

  function selectShipping(id) {
    if (!catalog.shippingById[id] || id === state.shippingId) return;
    state.shippingId = id;
    const s = catalog.shippingById[id];
    analytics.track("select_shipping", {
      shipping_method: s.name,
      shipping_price: core.fromCents(s.priceCents),
      estimated_days: s.days,
      currency: "BRL",
    });
    update();
  }

  /* ───────────────────────────── Extras ───────────────────────────── */

  function extraControls(extra, variant) {
    const quantity = state.extras[extra.id] || 0;
    const key = variant + "-" + extra.id;
    if (!extra.available) {
      return '<button type="button" class="btn btn--sm btn--muted" disabled>Disponível em breve</button>';
    }
    if (!quantity) {
      return (
        '<button type="button" class="btn btn--sm btn--outline" data-action="extra-add" data-extra="' +
        esc(extra.id) +
        '" data-key="extra-add-' +
        esc(key) +
        '">Adicionar ao pedido por + ' +
        money(extra.priceCents) +
        "</button>"
      );
    }
    return (
      '<div class="added"><span class="added__ok">' +
      ICON.check +
      " Adicionado</span>" +
      '<div class="stepper" role="group" aria-label="Quantidade de ' +
      esc(extra.name) +
      '"><button type="button" data-action="extra-dec" data-extra="' +
      esc(extra.id) +
      '" data-key="extra-dec-' +
      esc(key) +
      '" aria-label="Diminuir ' +
      esc(extra.name) +
      '">−</button><span aria-live="polite">' +
      quantity +
      '</span><button type="button" data-action="extra-inc" data-extra="' +
      esc(extra.id) +
      '" data-key="extra-inc-' +
      esc(key) +
      '" aria-label="Aumentar ' +
      esc(extra.name) +
      '"' +
      (quantity >= extra.maxQuantity ? " disabled" : "") +
      ">+</button></div></div>"
    );
  }

  function extraCardHTML(extra) {
    return (
      '<div class="extra"><span class="extra__img"><img src="' +
      esc(extra.image) +
      '" alt="' +
      esc(extra.fullName) +
      '" width="160" height="160" loading="lazy" decoding="async"></span><div class="extra__body">' +
      (extra.brand ? '<p class="extra__brand">' + esc(extra.brand) + "</p>" : "") +
      '<p class="extra__name">' +
      esc(extra.fullName) +
      "</p>" +
      (extra.description ? '<p class="extra__desc">' + esc(extra.description) + "</p>" : "") +
      '<p class="extra__price">' +
      (extra.priceCents !== null ? money(extra.priceCents) : '<span class="muted">Preço em breve</span>') +
      "</p>" +
      extraControls(extra, "page") +
      "</div></div>"
    );
  }

  /** "Complete seu café": um card por item de EXTRAS (ex.: cada sabor do biscoito xícara). */
  function renderExtra() {
    const el = $("#extra");
    if (!catalog.extras.length) {
      el.hidden = true;
      return;
    }
    patch(el, '<h2 class="block__title" id="extra-titulo">COMPLETE SEU CAFÉ 🍪</h2>' + catalog.extras.map(extraCardHTML).join(""));
  }

  function changeExtra(id, delta) {
    const extra = catalog.extraById[id];
    if (!extra || !extra.available) return;
    const before = state.extras[id] || 0;
    const next = Math.max(0, Math.min(extra.maxQuantity, before + delta));
    if (next === before) return;
    if (next) state.extras[id] = next;
    else delete state.extras[id];
    if (next > before) {
      analytics.track("add_upsell", {
        ecommerce: {
          currency: "BRL",
          value: core.fromCents(extra.priceCents * (next - before)),
          items: [{ item_id: extra.id, item_name: extra.fullName, item_category: "Extras", price: core.fromCents(extra.priceCents), quantity: next - before }],
        },
      });
      if (!before) toast(extra.name + " adicionado ao pedido ✓");
    }
    update();
  }

  /* ───────────────────────────── Resumo ───────────────────────────── */

  function pendingLabel(st) {
    if (st.total === 1) return "ESCOLHA SEU SABOR";
    return st.remaining === 1 ? "ESCOLHA MAIS 1 SABOR" : "ESCOLHA MAIS " + st.remaining + " SABORES";
  }

  function renderSummary() {
    const o = offer();
    const st = status();
    const t = totals();
    const ship = t.shipping;
    let lines = core
      .groupFlavors(catalog, state.selection.slots)
      .map((g) => "<li><b>" + g.quantity + "×</b> " + esc(g.flavor.name) + ' <span class="muted">' + o.size + "g</span></li>")
      .join("");
    st.missing.forEach((i) => {
      lines += '<li class="is-missing">' + (o.packs === 1 ? "Escolha o sabor" : "Pacote " + (i + 1) + ": escolha o sabor") + "</li>";
    });
    t.extras.forEach((e) => {
      lines += "<li><b>" + e.quantity + "×</b> " + esc(e.extra.fullName) + ' <span class="muted">+ ' + money(e.totalCents) + "</span></li>";
    });
    let nums = "";
    if (o.packs > 1) nums += "<div><dt>Total</dt><dd>" + core.formatWeight(o.totalGrams) + " (" + o.packs + " pacotes)</dd></div>";
    if (o.savingsCents > 0) {
      nums += "<div><dt>De</dt><dd><s>" + money(o.referenceCents) + "</s></dd></div>";
      nums += "<div><dt>Por</dt><dd><b>" + money(o.priceCents) + "</b></dd></div>";
      nums += '<div class="is-save"><dt>Você economiza</dt><dd>' + money(o.savingsCents) + "</dd></div>";
    } else {
      nums += "<div><dt>Produto</dt><dd>" + money(o.priceCents) + "</dd></div>";
    }
    if (t.extrasCents) nums += "<div><dt>Extras</dt><dd>+ " + money(t.extrasCents) + "</dd></div>";
    nums +=
      "<div><dt>Entrega " +
      esc(ship.name) +
      (ship.days ? ' <span class="muted">(até ' + ship.days + " dias úteis)</span>" : "") +
      "</dt><dd>" +
      (ship.priceCents ? "+ " + money(ship.priceCents) : '<b class="free">GRÁTIS</b>') +
      "</dd></div>";
    nums += '<div class="is-total"><dt>TOTAL</dt><dd>' + money(t.totalCents) + "</dd></div>";
    const shipNote =
      ship.priceCents === 0
        ? '<p class="summary__ship">🚚 Frete grátis disponível</p>'
        : freeShipping
          ? '<p class="summary__ship summary__ship--alt">Prefere economizar? O ' + esc(freeShipping.name) + " é grátis.</p>"
          : "";
    patch(
      $("#resumo-dados"),
      '<h2 class="block__title" id="resumo-titulo">' +
        (o.packs === 1 ? "SEU PEDIDO" : "SEU KIT") +
        "</h2>" +
        '<p class="summary__kit">' +
        esc(o.displayName) +
        "</p>" +
        '<ul class="summary__list">' +
        lines +
        "</ul>" +
        '<dl class="summary__nums">' +
        nums +
        "</dl>" +
        shipNote,
    );
    // Incompleto, o botão não compra: leva até o pacote que falta (por isso não fica desabilitado).
    const cta = $("#cta-principal");
    cta.textContent = st.complete ? "COMPRAR AGORA" : pendingLabel(st);
    cta.classList.toggle("is-pending", !st.complete);
    const hint = $("#resumo-dica");
    hint.textContent = st.complete ? "" : "Escolha " + (st.total === 1 ? "o sabor" : "os sabores de todos os pacotes") + " para continuar.";
    hint.hidden = st.complete;
  }

  /* ───────────────────────────── Barra fixa ───────────────────────────── */

  function renderBar() {
    const o = offer();
    const st = status();
    const t = totals();
    const ship = t.shipping;
    const sub = ship.priceCents === 0 ? "🚚 " + ship.name + " grátis" : "com " + ship.name + " (+ " + money(ship.priceCents) + ")";
    $("[data-bar-value]").textContent = money(t.totalCents);
    const subEl = $("[data-bar-sub]");
    subEl.textContent = sub;
    subEl.classList.toggle("is-free", ship.priceCents === 0);
    $("[data-bar-kit]").textContent =
      o.displayName + " — " + (st.complete ? flavorsText(state.selection.slots) : st.filled + " de " + st.total + (st.total === 1 ? " sabor" : " sabores"));
    const btn = $("[data-bar-btn]");
    btn.textContent = st.complete ? "COMPRAR AGORA" : st.total === 1 ? "ESCOLHER SABOR" : "ESCOLHER SABORES";
    btn.setAttribute("data-action", st.complete ? "buy" : "pick-flavors");
  }

  function setupBar() {
    const bar = $("#barra");
    bar.innerHTML =
      '<div class="bar__in"><div class="bar__price"><span class="bar__kit" data-bar-kit></span><span class="bar__value" data-bar-value></span><span class="bar__sub" data-bar-sub></span></div>' +
      '<button type="button" class="btn btn--cta bar__btn" data-bar-btn data-action="buy"></button></div>';
    let ctaVisible = false;
    const apply = () => {
      const show = !ctaVisible && !state.cartOpen && !lightbox;
      bar.classList.toggle("is-on", show);
      bar.setAttribute("aria-hidden", show ? "false" : "true");
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          ctaVisible = entry.isIntersecting;
        });
        apply();
      }).observe($("#cta-principal"));
    }
    setupBar.apply = apply;
    apply();
  }

  /* ───────────────────────────── Carrinho ───────────────────────────── */

  function renderCartBadge() {
    const n = state.inCart ? offer().packs + extrasCount() : 0;
    const badge = $("#carrinho-qtd");
    badge.hidden = !n;
    badge.textContent = n ? String(n) : "";
    $("#btn-carrinho").setAttribute("aria-label", n ? "Abrir carrinho (" + n + (n === 1 ? " item)" : " itens)") : "Abrir carrinho");
  }

  function cartSignature() {
    return JSON.stringify([state.selection.offerId, state.selection.slots, state.extras]);
  }

  function handleBuy(trigger) {
    if (!status().complete) {
      guideToMissing();
      return;
    }
    const signature = cartSignature();
    if (!state.inCart || state.trackedCart !== signature) {
      state.trackedCart = signature;
      analytics.track("add_to_cart", { ecommerce: selectionEcommerce() });
    }
    state.inCart = true;
    save();
    renderCartBadge();
    openCart(trigger);
  }

  function switchChips() {
    const o = offer();
    return catalog.sizes
      .map((size) => {
        const chips = catalog.offers
          .filter((x) => x.size === size)
          .map(
            (x) =>
              '<button type="button" class="chip chip--kit' +
              (x.id === o.id ? " is-on" : "") +
              '" data-action="offer" data-offer="' +
              esc(x.id) +
              '" data-key="switch-' +
              esc(x.id) +
              '" aria-pressed="' +
              (x.id === o.id) +
              '"><b>' +
              (x.packs === 1 ? "1 pacote" : x.packs + " pacotes") +
              "</b>" +
              (x.totalGrams >= 1000 ? " · " + core.formatWeight(x.totalGrams) : "") +
              "<span>" +
              money(x.priceCents) +
              "</span></button>",
          )
          .join("");
        return '<p class="switch__size">Pacotes de ' + size + "g</p><div class=\"switch__row\">" + chips + "</div>";
      })
      .join("");
  }

  function cartItemHTML() {
    const o = offer();
    const st = status();
    const groups = core.groupFlavors(catalog, state.selection.slots);
    const firstFlavor = groups[0] ? groups[0].flavor : null;
    const thumb = firstFlavor ? flavorImage(firstFlavor, o.size) : galleryItems[0] ? galleryItems[0].src : "";
    let flavors = groups.map((g) => "<li>" + g.quantity + "× " + esc(g.flavor.name) + " " + o.size + "g</li>").join("");
    if (!st.complete) {
      flavors += '<li class="is-missing">' + (st.remaining === 1 ? "Falta escolher 1 sabor" : "Faltam " + st.remaining + " sabores") + "</li>";
    }
    return (
      '<div class="citem">' +
      '<span class="citem__img">' +
      (thumb ? '<img src="' + esc(thumb) + '" alt="" width="120" height="120" decoding="async">' : "") +
      "</span>" +
      '<div class="citem__body"><p class="citem__name">' +
      esc(o.displayName) +
      "</p>" +
      '<p class="citem__meta">' +
      (o.packs > 1 ? "Total: " + core.formatWeight(o.totalGrams) + " · " : "") +
      o.packs +
      (o.packs === 1 ? " pacote" : " pacotes") +
      " de " +
      o.size +
      "g</p>" +
      '<ul class="citem__flavors">' +
      flavors +
      "</ul>" +
      '<p class="citem__price">' +
      (o.savingsCents ? "<s>" + money(o.referenceCents) + "</s> " : "") +
      "<b>" +
      money(o.priceCents) +
      "</b></p>" +
      '<div class="citem__actions">' +
      '<button type="button" class="linkbtn" data-action="cart-edit" data-key="cart-edit">' +
      ICON.edit +
      " Editar sabores</button>" +
      '<button type="button" class="linkbtn" data-action="cart-switch" data-key="cart-switch" aria-expanded="' +
      state.cartSwitchOpen +
      '">' +
      ICON.swap +
      " Trocar kit</button>" +
      '<button type="button" class="linkbtn linkbtn--danger" data-action="cart-remove" data-key="cart-remove">' +
      ICON.trash +
      " Remover</button>" +
      "</div></div></div>" +
      (state.cartSwitchOpen ? '<div class="switch">' + switchChips() + '<p class="switch__note">Os sabores escolhidos são mantidos.</p></div>' : "")
    );
  }

  function cartExtrasHTML() {
    let titled = false; // "COMPLETE SEU CAFÉ" uma vez só, no primeiro item ainda não adicionado
    return catalog.extras
      .map((extra) => {
        const quantity = state.extras[extra.id] || 0;
        if (!quantity && !extra.available) return "";
        const title = !quantity && !titled;
        if (title) titled = true;
        return (
          '<div class="cextra' +
          (quantity ? " is-added" : "") +
          '"><span class="cextra__img"><img src="' +
          esc(extra.image) +
          '" alt="" width="96" height="96" loading="lazy" decoding="async"></span><div class="cextra__body">' +
          (title ? '<p class="cextra__title">COMPLETE SEU CAFÉ 🍪</p>' : "") +
          '<p class="cextra__name">' +
          esc(extra.fullName) +
          "</p>" +
          (quantity ? '<p class="cextra__price">' + money(extra.priceCents * quantity) + "</p>" : "") +
          extraControls(extra, "cart") +
          (quantity
            ? '<button type="button" class="linkbtn linkbtn--danger" data-action="extra-remove" data-extra="' +
              esc(extra.id) +
              '" data-key="extra-remove-' +
              esc(extra.id) +
              '">' +
              ICON.trash +
              " Remover</button>"
            : "") +
          "</div></div>"
        );
      })
      .join("");
  }

  function cartTotalsHTML() {
    const t = totals();
    const ship = t.shipping;
    const o = t.offer;
    let rows =
      "<div><dt>" +
      (t.savingsCents ? "Preço normal" : "Subtotal") +
      ' <span class="muted">(' +
      o.packs +
      (o.packs === 1 ? " pacote" : " pacotes") +
      (t.extras.length ? " + extras" : "") +
      ")</span></dt><dd>" +
      money(t.originalCents) +
      "</dd></div>";
    if (t.savingsCents) {
      rows +=
        '<div class="is-save"><dt>Desconto' +
        (activePromo() ? " da promoção" : "") +
        "</dt><dd>- " +
        money(t.savingsCents) +
        "</dd></div>";
    }
    rows += "<div><dt>Produtos</dt><dd>" + money(t.subtotalCents) + "</dd></div>";
    rows += "<div><dt>Entrega " + esc(ship.name) + "</dt><dd>" + (ship.priceCents ? money(ship.priceCents) : '<b class="free">GRÁTIS</b>') + "</dd></div>";
    if (ship.days) rows += "<div><dt>Prazo</dt><dd>até " + ship.days + " dias úteis</dd></div>";
    rows += '<div class="is-total"><dt>TOTAL</dt><dd>' + money(t.totalCents) + "</dd></div>";
    return '<dl class="ctotals">' + rows + "</dl>";
  }

  function demoResultHTML(order) {
    const lines = order.itens.map((i) => "<li>" + i.quantidade + "× " + esc(i.sabor) + " " + i.peso + "g</li>").join("");
    const extras = order.extras.map((e) => "<li>" + e.quantidade + "× " + esc(e.nome) + "</li>").join("");
    const cents = (reais) => Math.round(reais * 100);
    return (
      '<div class="done"><p class="done__icon" aria-hidden="true">' +
      ICON.check +
      '</p><p class="done__title">Pedido pronto para o pagamento</p>' +
      '<p class="done__ref">Pedido ' +
      esc(order.id) +
      "</p>" +
      '<div class="done__box"><p><b>' +
      esc(order.kit.descricao) +
      "</b></p><ul>" +
      lines +
      extras +
      "</ul>" +
      '<dl class="ctotals"><div><dt>Produtos</dt><dd>' +
      money(cents(order.subtotal)) +
      "</dd></div><div><dt>Entrega " +
      esc(order.shipping.method) +
      "</dt><dd>" +
      (order.shipping.price ? money(cents(order.shipping.price)) : '<b class="free">GRÁTIS</b>') +
      "</dd></div><div><dt>Prazo</dt><dd>até " +
      esc(order.shipping.estimatedDays) +
      ' dias úteis</dd></div><div class="is-total"><dt>TOTAL</dt><dd>' +
      money(cents(order.total)) +
      "</dd></div></dl></div>" +
      '<p class="done__note"><b>Modo demonstração.</b> O checkout ainda não foi configurado (js/config.js → CHECKOUT). Na versão final, o cliente segue daqui direto para o pagamento com este pedido.</p>' +
      '<details class="done__json"><summary>Ver dados do pedido (integração)</summary><pre>' +
      esc(JSON.stringify(order, null, 2)) +
      "</pre></details>" +
      '<button type="button" class="btn btn--outline btn--block" data-action="demo-back" data-key="demo-back">Voltar ao pedido</button></div>'
    );
  }

  function renderCart() {
    const el = $("#carrinho");
    if (!state.cartOpen) return;
    const st = status();
    let body;
    let foot = "";
    if (state.demoOrder) {
      body = demoResultHTML(state.demoOrder);
    } else if (!state.inCart) {
      body =
        '<div class="empty"><p class="empty__title">Seu carrinho está vazio</p><p>Escolha o kit e os sabores do seu café.</p>' +
        '<button type="button" class="btn btn--cta btn--block" data-action="cart-shop" data-key="cart-shop">ESCOLHER MEU CAFÉ</button></div>';
    } else {
      body =
        cartItemHTML() +
        cartExtrasHTML() +
        '<div class="cship">' +
        shippingHTML("frete-carrinho") +
        "</div>" +
        cartTotalsHTML();
      const t = totals();
      foot =
        '<div class="sheet__total"><span>TOTAL</span><b>' +
        money(t.totalCents) +
        "</b></div>" +
        (st.complete
          ? '<button type="button" class="btn btn--cta btn--block btn--lg" data-action="checkout" data-key="checkout">FINALIZAR COMPRA</button>'
          : '<button type="button" class="btn btn--cta btn--block btn--lg is-pending" data-action="cart-edit" data-key="checkout-pending">' +
            pendingLabel(st) +
            "</button>");
    }
    patch($("[data-cart-body]", el), body);
    patch($("[data-cart-foot]", el), foot);
    $("[data-cart-foot]", el).hidden = !foot;
  }

  let cartOpener = null;

  function openCart(trigger) {
    const el = $("#carrinho");
    state.cartOpen = true;
    state.demoOrder = null;
    cartOpener = trigger || document.activeElement;
    if (!el._built) {
      el._built = true;
      el.innerHTML =
        '<div class="sheet__backdrop" data-action="cart-close"></div>' +
        '<div class="sheet__panel"><div class="sheet__head"><h2 class="sheet__title" id="carrinho-titulo">SEU PEDIDO</h2>' +
        '<button type="button" class="iconbtn" data-action="cart-close" aria-label="Fechar carrinho">' +
        ICON.close +
        "</button></div>" +
        '<div class="sheet__body" data-cart-body></div><div class="sheet__foot" data-cart-foot></div></div>';
    }
    el.hidden = false;
    lockScroll(true);
    renderCart();
    if (setupBar.apply) setupBar.apply();
    requestAnimationFrame(() => {
      el.classList.add("is-open");
      const close = $(".sheet__head .iconbtn", el);
      if (close) close.focus({ preventScroll: true });
    });
  }

  function closeCart(restoreFocus) {
    const el = $("#carrinho");
    if (!state.cartOpen) return;
    state.cartOpen = false;
    state.cartSwitchOpen = false;
    state.demoOrder = null;
    el.classList.remove("is-open");
    setTimeout(
      () => {
        if (!state.cartOpen) el.hidden = true;
      },
      motion() ? 220 : 0,
    );
    lockScroll(false);
    if (setupBar.apply) setupBar.apply();
    if (restoreFocus !== false && cartOpener && cartOpener.focus && document.contains(cartOpener)) cartOpener.focus({ preventScroll: true });
  }

  /* ───────────────────────────── Checkout ───────────────────────────── */

  function handleCheckout() {
    const result = core.buildOrder(catalog, orderInput());
    if (!result.ok) {
      if (result.errors.some((e) => e.code === "flavor" || e.code === "slots")) {
        closeCart(false);
        guideToMissing();
      } else {
        toast(result.errors[0].message);
      }
      return;
    }
    const order = result.order;
    analytics.track("begin_checkout", {
      ecommerce: { currency: "BRL", value: order.total, items: analytics.orderItems(order) },
    });
    writeStorage(LAST_ORDER_KEY, order);
    window.BaggioStore.lastOrder = order;
    sendToCheckout(order);
  }

  function sendToCheckout(order) {
    const c = config.checkout || {};
    if (c.mode === "link") {
      let url = "";
      try {
        url = typeof c.buildUrl === "function" ? c.buildUrl(order) : c.url ? core.appendQuery(c.url, core.orderToParams(order)) : "";
      } catch (e) {
        if (window.console) console.error("[Baggio] checkout.buildUrl falhou:", e);
      }
      if (url) {
        toast("Indo para o pagamento…");
        setTimeout(() => window.location.assign(url), 250);
        return;
      }
      if (window.console) console.warn("[Baggio] CHECKOUT.mode = \"link\" sem url: mostrando o pedido (demonstração).");
    } else if (c.mode === "whatsapp" && digits(c.whatsapp)) {
      const url = "https://wa.me/" + digits(c.whatsapp) + "?text=" + encodeURIComponent(core.orderToText(order, store.name));
      // Sem "noopener" no window.open: com ele o navegador devolve null e a página abriria o WhatsApp duas vezes.
      const win = window.open(url, "_blank");
      if (win) {
        try {
          win.opener = null;
        } catch (e) {
          /* outra origem: nada a fazer */
        }
      } else {
        window.location.assign(url);
      }
      return;
    }
    state.demoOrder = order;
    renderCart();
    const body = $("#carrinho [data-cart-body]");
    if (body) body.scrollTop = 0;
  }

  /* ───────────────────────────── Avaliações ───────────────────────────── */

  function reviewCard(r) {
    const avatar = r.avatar
      ? '<img class="avatar" src="' + esc(r.avatar) + '" alt="" width="40" height="40" loading="lazy" decoding="async">'
      : '<span class="avatar" aria-hidden="true">' + esc(core.initials(r.name)) + "</span>";
    const photos = r.images.length
      ? '<div class="review__photos">' +
        r.images
          .map(
            (src, k) =>
              '<button type="button" class="review__photo" data-action="zoom-review" data-review="' +
              r.index +
              '" data-photo="' +
              k +
              '" aria-label="Ampliar foto ' +
              (k + 1) +
              " da avaliação de " +
              esc(r.name) +
              '"><img src="' +
              esc(src) +
              '" alt="" width="160" height="160" loading="lazy" decoding="async"></button>',
          )
          .join("") +
        "</div>"
      : "";
    return (
      '<article class="review">' +
      '<div class="review__head">' +
      avatar +
      '<div class="review__who"><p class="review__name">' +
      esc(r.name || "Cliente") +
      (r.placeholder ? ' <span class="tag-ex">EXEMPLO</span>' : "") +
      '</p><p class="review__stars">' +
      stars(r.rating, "sm") +
      '<span class="sr-only">Nota ' +
      r.rating +
      " de 5</span></p></div></div>" +
      (r.product ? '<p class="review__product">' + esc(r.product) + "</p>" : "") +
      (r.verified ? '<p class="review__verified">' + ICON.check + " Compra verificada</p>" : "") +
      (r.text ? '<p class="review__text">' + esc(r.text) + "</p>" : "") +
      photos +
      (r.dateText ? '<p class="review__date">' + esc(r.dateText) + "</p>" : "") +
      "</article>"
    );
  }

  function renderReviews() {
    const el = $("#avaliacoes");
    const placeholder = reviewsMode === "placeholder";
    const stats = reviewStats;
    let html =
      '<div class="section__head"><h2 class="section__title" id="avaliacoes-titulo">AVALIAÇÕES DOS CLIENTES</h2>' +
      (store.sold ? '<span class="section__aside">' + esc(store.sold) + "</span>" : "") +
      "</div>";
    if (reviewsMode === "empty") {
      patch(el, html + '<p class="reviews-empty">As avaliações dos clientes aparecem aqui em breve.</p>');
      return;
    }
    if (placeholder) {
      html +=
        '<p class="ph-note"><b>Prévia do layout.</b> Avaliações de EXEMPLO, sem dados reais: as avaliações reais entram em js/reviews.js e substituem estas automaticamente.</p>';
    }

    const bars = [5, 4, 3, 2, 1]
      .map(
        (s) =>
          '<li><button type="button" class="rbar' +
          (state.reviewFilter === String(s) ? " is-on" : "") +
          '" data-action="review-filter" data-filter="' +
          s +
          '" data-key="rbar-' +
          s +
          '"><span class="rbar__label">' +
          s +
          (s === 1 ? " estrela" : " estrelas") +
          '</span><span class="rbar__track"><span class="rbar__fill" style="width:' +
          (placeholder ? 0 : stats.percents[s]) +
          '%"></span></span><span class="rbar__pct">' +
          (placeholder ? "XX%" : stats.percents[s] + "%") +
          "</span></button></li>",
      )
      .join("");
    html +=
      '<div class="rsum"><div class="rsum__score"><p class="rsum__avg"><b>' +
      (placeholder ? "X,X" : esc(stats.averageText)) +
      "</b><span>/ 5</span></p>" +
      stars(placeholder ? 5 : stats.exactAverage, "lg") +
      '<p class="rsum__count">' +
      (placeholder ? "XXX avaliações" : stats.count + (stats.count === 1 ? " avaliação" : " avaliações")) +
      "</p></div>" +
      '<ul class="rsum__bars" aria-label="Distribuição das notas">' +
      bars +
      "</ul></div>";

    const count = (n) => (placeholder ? "" : " (" + n + ")");
    const chips = [["all", "Todas" + count(stats.count)]];
    [5, 4, 3, 2, 1].forEach((s) => {
      if (s >= 3 || stats.distribution[s]) chips.push([String(s), s + (s === 1 ? " estrela" : " estrelas") + count(stats.distribution[s])]);
    });
    chips.push(["photos", "Com fotos" + count(stats.withPhotos)]);
    chips.push(["recent", "Mais recentes"]);
    catalog.flavors.forEach((f) => {
      if (stats.flavorCount[f.id]) chips.push(["flavor:" + f.id, f.name + count(stats.flavorCount[f.id])]);
    });
    html +=
      '<div class="chips" role="group" aria-label="Filtrar avaliações">' +
      chips
        .map(
          (c) =>
            '<button type="button" class="chip' +
            (state.reviewFilter === c[0] ? " is-on" : "") +
            '" data-action="review-filter" data-filter="' +
            esc(c[0]) +
            '" data-key="chip-' +
            esc(c[0]) +
            '" aria-pressed="' +
            (state.reviewFilter === c[0]) +
            '">' +
            esc(c[1]) +
            "</button>",
        )
        .join("") +
      "</div>";

    const photos = core.reviewPhotos(activeReviews);
    if (photos.length) {
      html +=
        '<div class="cphotos"><p class="cphotos__title">FOTOS DOS CLIENTES' +
        (placeholder ? "" : " (" + photos.length + ")") +
        '</p><ul class="cphotos__strip">' +
        photos
          .map(
            (p, i) =>
              '<li><button type="button" class="cphotos__item" data-action="zoom-photos" data-index="' +
              i +
              '" aria-label="Ampliar foto ' +
              (i + 1) +
              " de " +
              photos.length +
              '"><img src="' +
              esc(p.src) +
              '" alt="" width="160" height="160" loading="lazy" decoding="async"></button></li>',
          )
          .join("") +
        "</ul></div>";
    }

    const filtered = core.filterReviews(activeReviews, state.reviewFilter);
    const initial = Math.max(1, Number(reviewSettings.initialCount) || 4);
    const shown = Math.min(filtered.length, state.reviewsShown || initial);
    html += '<div class="reviews" aria-live="polite">';
    html += filtered.length
      ? filtered.slice(0, shown).map(reviewCard).join("")
      : '<p class="reviews-empty">Nenhuma avaliação com este filtro ainda.</p>';
    html += "</div>";
    if (shown < filtered.length) {
      const first = !state.reviewsShown || state.reviewsShown <= initial;
      html +=
        '<button type="button" class="btn btn--outline btn--block" data-action="reviews-more" data-key="reviews-more">' +
        (first
          ? "VER TODAS AS AVALIAÇÕES" + (placeholder ? "" : " (" + filtered.length + ")")
          : "VER MAIS AVALIAÇÕES (" + (filtered.length - shown) + ")") +
        "</button>";
    }
    patch(el, html);
  }

  function markReviewsViewed(source) {
    if (state.viewedReviews) return;
    state.viewedReviews = true;
    analytics.track("view_reviews", { source: source, reviews_count: reviewsMode === "real" ? reviewStats.count : 0, reviews_mode: reviewsMode });
  }

  /* ───────────────────────────── Visualizador de fotos ───────────────────────────── */

  let lightbox = null;

  function openLightbox(items, index, opener) {
    const el = $("#visualizador");
    lightbox = { items: items, index: index, opener: opener };
    el.innerHTML =
      '<div class="lightbox__top"><span class="lightbox__count" data-lb-count></span><button type="button" class="iconbtn iconbtn--light" data-action="lb-close" aria-label="Fechar fotos">' +
      ICON.close +
      "</button></div>" +
      '<ul class="lightbox__track" data-lb-track>' +
      items
        .map(
          (it, i) =>
            '<li class="lightbox__slide"><img src="' +
            esc(it.src) +
            '" alt="' +
            esc(it.alt || "") +
            '" decoding="async"' +
            (Math.abs(i - index) > 1 ? ' loading="lazy"' : "") +
            "></li>",
        )
        .join("") +
      "</ul>" +
      (items.length > 1
        ? '<button type="button" class="lightbox__nav lightbox__nav--prev" data-action="lb-prev" aria-label="Foto anterior">' +
          ICON.left +
          '</button><button type="button" class="lightbox__nav lightbox__nav--next" data-action="lb-next" aria-label="Próxima foto">' +
          ICON.right +
          "</button>"
        : "") +
      '<div class="lightbox__caption" data-lb-caption></div>';
    el.hidden = false;
    lockScroll(true);
    if (setupBar.apply) setupBar.apply();
    const track = $("[data-lb-track]", el);
    track.scrollLeft = index * track.clientWidth;
    let ticking = false;
    track.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
          if (lightbox && i !== lightbox.index) {
            lightbox.index = i;
            syncLightbox();
          }
        });
      },
      { passive: true },
    );
    syncLightbox();
    $('[data-action="lb-close"]', el).focus({ preventScroll: true });
  }

  function syncLightbox() {
    if (!lightbox) return;
    const el = $("#visualizador");
    const item = lightbox.items[lightbox.index];
    $("[data-lb-count]", el).textContent = lightbox.items.length > 1 ? lightbox.index + 1 + " / " + lightbox.items.length : "";
    $("[data-lb-caption]", el).innerHTML = item && item.caption ? item.caption : "";
  }

  function lightboxGo(delta) {
    if (!lightbox) return;
    const n = lightbox.items.length;
    const index = (lightbox.index + delta + n) % n;
    const track = $("#visualizador [data-lb-track]");
    track.scrollTo({ left: index * track.clientWidth, behavior: motion() ? "smooth" : "auto" });
    lightbox.index = index;
    syncLightbox();
  }

  function closeLightbox() {
    if (!lightbox) return;
    const opener = lightbox.opener;
    lightbox = null;
    const el = $("#visualizador");
    el.hidden = true;
    el.innerHTML = "";
    lockScroll(false);
    if (setupBar.apply) setupBar.apply();
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  function reviewCaption(r) {
    return (
      '<p class="lbcap__head"><b>' +
      esc(r.name || "Cliente") +
      "</b> " +
      stars(r.rating, "sm") +
      (r.placeholder ? ' <span class="tag-ex">EXEMPLO</span>' : "") +
      "</p>" +
      (r.product ? '<p class="lbcap__product">' + esc(r.product) + "</p>" : "") +
      (r.text ? '<p class="lbcap__text">' + esc(r.text) + "</p>" : "")
    );
  }

  function photoItems() {
    return core.reviewPhotos(activeReviews).map((p) => ({ src: p.src, alt: "Foto enviada por " + (p.review.name || "cliente"), caption: reviewCaption(p.review) }));
  }

  /* ───────────────────────── Seções de apoio ───────────────────────── */

  function renderBenefits() {
    const list = config.benefits || [];
    const el = $("#beneficios");
    if (!list.length) {
      el.hidden = true;
      return;
    }
    el.innerHTML =
      '<h2 class="sr-only">Benefícios</h2><ul class="benefits">' +
      list
        .map(
          (b) =>
            '<li><span class="benefits__icon" aria-hidden="true">' +
            esc(b.icon) +
            "</span><span><b>" +
            esc(fill(b.title)) +
            "</b>" +
            (b.text ? "<small>" + esc(fill(b.text)) + "</small>" : "") +
            "</span></li>",
        )
        .join("") +
      "</ul>";
  }

  /** "Conheça os sabores": descrição de cada sabor e ficha técnica (textos do site oficial). */
  function renderAbout() {
    const el = $("#sabores");
    const about = config.about || {};
    const list = catalog.flavors.filter((f) => f.description || f.notes || f.tagline);
    if (!list.length) {
      el.hidden = true;
      return;
    }
    const row = (label, value) => (value ? "<div><dt>" + esc(label) + ":</dt><dd>" + esc(fill(value)) + "</dd></div>" : "");
    const items = list
      .map(
        (f) =>
          '<details class="flavinfo__item" data-flavor="' +
          esc(f.id) +
          '"><summary><span class="flavinfo__img"><img src="' +
          esc(f.image) +
          '" alt="" width="64" height="64" loading="lazy" decoding="async"></span><span class="flavinfo__head"><b>' +
          esc(f.name) +
          "</b>" +
          (f.award ? '<span class="flavinfo__award">🏅 BLEND PREMIADO</span>' : "") +
          "<small>" +
          esc(f.tagline || (f.notes ? "Notas: " + f.notes : "")) +
          "</small></span></summary>" +
          '<div class="flavinfo__body">' +
          (f.description ? "<p>" + esc(fill(f.description)) + "</p>" : "") +
          "<dl>" +
          row("Notas", f.tagline ? f.notes : "") + // sem tagline, as notas já aparecem no título
          row("Combina com", f.pairing) +
          row("Origem", f.origin) +
          "</dl></div></details>",
      )
      .join("");
    const specs = (about.specs || []).map((item) => row(item.label, item.value)).join("");
    el.innerHTML =
      '<div class="section__head"><h2 class="section__title" id="sabores-titulo">' +
      esc(about.title || "CONHEÇA OS SABORES") +
      "</h2></div>" +
      (about.intro ? '<p class="section__intro">' + esc(fill(about.intro)) + "</p>" : "") +
      '<div class="flavinfo">' +
      items +
      "</div>" +
      (specs ? '<h3 class="specs__title">' + esc(about.specsTitle || "Ficha técnica") + '</h3><dl class="specs">' + specs + "</dl>" : "") +
      (about.source ? '<p class="about__source">' + esc(fill(about.source)) + "</p>" : "");
  }

  function renderCompare() {
    const el = $("#kits");
    const items = (config.compare || []).filter((c) => catalog.offerById[c.offer]);
    if (!items.length) {
      el.hidden = true;
      return;
    }
    const cards = items
      .map((c) => {
        const o = catalog.offerById[c.offer];
        return (
          '<div class="cmp"><p class="cmp__title">' +
          esc(c.title) +
          '</p><p class="cmp__kit">' +
          esc(o.kitLabel) +
          '</p><ul class="cmp__list"><li>' +
          ICON.check +
          " Até " +
          o.packs +
          (o.packs === 1 ? " sabor" : " sabores") +
          "</li><li>" +
          ICON.check +
          " " +
          core.formatWeight(o.totalGrams) +
          " total</li>" +
          (o.grind ? "<li>" + ICON.check + " Café " + esc(o.grind) + "</li>" : "") +
          (sizeFlavorsText(o.size) ? "<li>" + ICON.check + " " + esc(sizeFlavorsText(o.size)) + "</li>" : "") +
          (freeShipping ? "<li>" + ICON.check + " " + esc(freeShipping.name) + " grátis</li>" : "") +
          '</ul><p class="cmp__price">' +
          money(o.priceCents) +
          "</p>" +
          (o.savingsCents ? '<p class="cmp__old"><s>' + money(o.referenceCents) + "</s></p>" : "") +
          '<button type="button" class="btn btn--cta btn--block btn--sm" data-action="offer-go" data-offer="' +
          esc(o.id) +
          '">' +
          esc(c.cta || o.cta || "ESCOLHER") +
          "</button></div>"
        );
      })
      .join("");
    el.innerHTML =
      '<div class="section__head"><h2 class="section__title" id="kits-titulo">QUAL KIT COMBINA COM VOCÊ?</h2></div><div class="cmps">' + cards + "</div>";
  }

  function renderFaq() {
    const el = $("#duvidas");
    const list = config.faq || [];
    if (!list.length) {
      el.hidden = true;
      return;
    }
    el.innerHTML =
      '<div class="section__head"><h2 class="section__title" id="duvidas-titulo">DÚVIDAS FREQUENTES</h2></div><div class="faq">' +
      list
        .map((f) => '<details class="faq__item"><summary>' + esc(fill(f.q)) + "</summary><p>" + esc(fill(f.a)) + "</p></details>")
        .join("") +
      "</div>";
  }

  function renderFooter() {
    const support = store.support || {};
    const company = store.company || {};
    const links = store.links || {};
    const value = (v) => (v ? esc(v) : '<span class="tbd">[a preencher]</span>');
    const link = (url, label) =>
      url ? '<a href="' + esc(url) + '">' + esc(label) + "</a>" : '<a href="#rodape" data-action="soon">' + esc(label) + "</a>";
    const whatsapp = digits(support.whatsapp)
      ? '<a href="https://wa.me/' + esc(digits(support.whatsapp)) + '" target="_blank" rel="noopener">' + esc(support.whatsapp) + "</a>"
      : value("");
    const email = support.email ? '<a href="mailto:' + esc(support.email) + '">' + esc(support.email) + "</a>" : value("");
    $("#rodape").innerHTML =
      '<div class="footer__in">' +
      '<div class="footer__brand"><p class="logo logo--light"><span class="logo__name">Baggio</span><span class="logo__tag">CAFÉ</span></p>' +
      (store.sold ? "<p>" + esc(store.sold) + "</p>" : "") +
      "</div>" +
      '<div class="footer__col"><h2>Atendimento</h2><ul><li>WhatsApp: ' +
      whatsapp +
      "</li><li>E-mail: " +
      email +
      "</li><li>Horário: " +
      value(support.hours) +
      "</li></ul></div>" +
      '<div class="footer__col"><h2>Políticas</h2><ul><li>' +
      link(links.privacy, "Política de privacidade") +
      "</li><li>" +
      link(links.terms, "Termos de uso") +
      "</li><li>" +
      link(links.shipping, "Política de entrega") +
      "</li><li>" +
      link(links.returns, "Trocas e devoluções") +
      "</li></ul></div>" +
      '<div class="footer__col"><h2>Dados da loja</h2><ul><li>Razão social: ' +
      value(company.legalName) +
      "</li><li>CNPJ: " +
      value(company.cnpj) +
      "</li><li>Endereço: " +
      value(company.address) +
      "</li></ul></div></div>" +
      '<p class="footer__copy">© ' +
      new Date().getFullYear() +
      " " +
      esc(store.name) +
      "</p>";
  }

  /* ───────────────────────────── Atualização ───────────────────────────── */

  function update() {
    save();
    renderPrice();
    renderOffers();
    renderBuilder();
    patch($("#entrega"), shippingHTML("frete"));
    renderExtra();
    renderSummary();
    renderBar();
    renderCartBadge();
    if (state.cartOpen) renderCart();
  }

  /* ───────────────────────────── Eventos ───────────────────────────── */

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || target.disabled) return;
    const action = target.getAttribute("data-action");
    const offerId = target.getAttribute("data-offer");
    const extraId = target.getAttribute("data-extra");
    switch (action) {
      case "offer":
        selectOffer(offerId, false);
        break;
      case "offer-go":
        selectOffer(offerId, true);
        if (state.cartOpen) closeCart(false);
        break;
      case "more-toggle":
        state.moreOpen = !state.moreOpen;
        renderOffers();
        break;
      case "slot":
        state.activeSlot = Number(target.getAttribute("data-slot"));
        syncBuilder();
        break;
      case "flavor":
        pickFlavor(target.getAttribute("data-flavor"));
        break;
      case "repeat":
        repeatFlavor(target.getAttribute("data-flavor"));
        break;
      case "buy":
        handleBuy(target);
        break;
      case "pick-flavors":
        guideToMissing();
        break;
      case "cart-open":
        openCart(target);
        break;
      case "cart-close":
        closeCart();
        break;
      case "cart-shop":
        closeCart(false);
        scrollToEl($("#ofertas"));
        break;
      case "cart-edit":
        closeCart(false);
        if (status().complete) {
          scrollToEl($("#montar"));
          flash($("#montar"));
        } else {
          guideToMissing();
        }
        break;
      case "cart-switch":
        state.cartSwitchOpen = !state.cartSwitchOpen;
        renderCart();
        break;
      case "cart-remove":
        state.inCart = false;
        state.trackedCart = "";
        save();
        renderCartBadge();
        renderCart();
        toast("Kit removido do carrinho");
        break;
      case "extra-add":
      case "extra-inc":
        changeExtra(extraId, 1);
        break;
      case "extra-dec":
        changeExtra(extraId, -1);
        break;
      case "extra-remove":
        changeExtra(extraId, -(state.extras[extraId] || 0));
        break;
      case "checkout":
        handleCheckout();
        break;
      case "demo-back":
        state.demoOrder = null;
        renderCart();
        break;
      case "go-reviews":
        markReviewsViewed("link");
        break;
      case "review-filter": {
        const filter = target.getAttribute("data-filter");
        state.reviewFilter = state.reviewFilter === filter && filter !== "all" ? "all" : filter;
        state.reviewsShown = 0;
        renderReviews();
        break;
      }
      case "reviews-more": {
        const initial = Math.max(1, Number(reviewSettings.initialCount) || 4);
        const page = Math.max(1, Number(reviewSettings.pageSize) || 10);
        state.reviewsShown = (state.reviewsShown || initial) + page;
        renderReviews();
        break;
      }
      case "zoom-gallery":
        openLightbox(
          galleryItems.map((g) => ({ src: g.src, alt: g.alt })),
          Number(target.getAttribute("data-index")) || 0,
          target,
        );
        break;
      case "zoom-photos":
        openLightbox(photoItems(), Number(target.getAttribute("data-index")) || 0, target);
        break;
      case "zoom-review": {
        const reviewIndex = Number(target.getAttribute("data-review"));
        const photoIndex = Number(target.getAttribute("data-photo"));
        const all = core.reviewPhotos(activeReviews);
        const start = all.findIndex((p) => p.review.index === reviewIndex && p.photoIndex === photoIndex);
        openLightbox(photoItems(), Math.max(0, start), target);
        break;
      }
      case "lb-close":
        closeLightbox();
        break;
      case "lb-prev":
        lightboxGo(-1);
        break;
      case "lb-next":
        lightboxGo(1);
        break;
      case "gallery-prev":
        galleryGo(galleryIndex - 1);
        break;
      case "gallery-next":
        galleryGo(galleryIndex + 1);
        break;
      case "gallery-go":
        galleryGo(Number(target.getAttribute("data-index")) || 0);
        break;
      case "soon":
        event.preventDefault();
        toast("Página em preparação");
        break;
      default:
        break;
    }
  });

  document.addEventListener("change", (event) => {
    const input = event.target;
    if (!input || input.type !== "radio") return;
    if (input.name === "kit") {
      if (input.value === "1kg") {
        const group = catalog.menu.oneKg;
        if (group && group.offers.indexOf(state.selection.offerId) === -1) selectOffer(group.offers[0], false);
      } else {
        selectOffer(input.value, false);
      }
    } else if (input.name === "frete" || input.name === "frete-carrinho") {
      selectShipping(input.value);
    }
  });

  /** Com o carrinho ou as fotos abertos, o Tab circula só dentro deles. */
  function trapFocus(event, container) {
    const items = $$('button:not([disabled]), [href], input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])', container).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (!container.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener("keydown", (event) => {
    if (lightbox) {
      if (event.key === "Escape") closeLightbox();
      else if (event.key === "ArrowLeft") lightboxGo(-1);
      else if (event.key === "ArrowRight") lightboxGo(1);
      else if (event.key === "Tab") trapFocus(event, $("#visualizador"));
      return;
    }
    if (state.cartOpen) {
      if (event.key === "Escape") closeCart();
      else if (event.key === "Tab") trapFocus(event, $("#carrinho .sheet__panel"));
    }
  });

  // Foto que não carregou (caminho errado): mostra a cor de fundo no lugar do ícone quebrado.
  document.addEventListener(
    "error",
    (event) => {
      const el = event.target;
      if (el && el.tagName === "IMG") el.classList.add("img-error");
    },
    true,
  );

  /* ───────────────────────────── Início ───────────────────────────── */

  function setupReviewsObserver() {
    const el = $("#avaliacoes");
    if (!("IntersectionObserver" in window) || reviewsMode === "empty") return;
    // Conta como vista quando a seção chega a 40% da altura da tela (qualquer tamanho de seção).
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          markReviewsViewed("scroll");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -60% 0px" },
    );
    io.observe(el);
  }

  function init() {
    try {
      restore();
      const summary = $("#resumo");
      summary.innerHTML =
        '<div id="resumo-dados"></div>' +
        '<button type="button" class="btn btn--cta btn--block btn--lg" id="cta-principal" data-action="buy">COMPRAR AGORA</button>' +
        '<p class="summary__hint" id="resumo-dica" hidden></p>';
      renderTopbar();
      renderLogo();
      renderGallery();
      renderInfo();
      renderBenefits();
      renderAbout();
      renderCompare();
      renderReviews();
      renderFaq();
      renderFooter();
      setupBar();
      update();
      setupReviewsObserver();
    } finally {
      // Mostra a página mesmo se algo acima falhar (o erro continua no console).
      document.documentElement.classList.add("is-ready");
    }
    const o = offer();
    analytics.track("view_item", {
      ecommerce: { currency: "BRL", value: core.fromCents(o.priceCents), items: [offerItem(o)] },
    });
  }

  // Acesso para integrações e testes (somente leitura do pedido).
  window.BaggioStore = {
    catalog: catalog,
    state: state,
    lastOrder: null,
    buildOrder: () => core.buildOrder(catalog, orderInput()),
  };

  init();
})();
