/* Café Baggio — eventos de rastreamento.
   Cada evento vai para o dataLayer (Google Tag Manager) e, quando estiverem
   instalados no index.html, também para gtag (GA4), Meta Pixel (fbq) e
   TikTok Pixel (ttq). Nada aqui instala ou remove scripts de terceiros.
   Eventos: view_item, select_offer, select_flavor, select_shipping, add_to_cart,
   add_upsell, view_reviews, begin_checkout, purchase. */
(function () {
  "use strict";

  var settings = (window.BAGGIO_CONFIG && window.BAGGIO_CONFIG.analytics) || {};
  var debug = !!settings.debug || /[?&]debug=1(&|$)/.test(window.location.search);
  var metaEvents = settings.metaPixelEvents || {};
  var tiktokEvents = settings.tiktokEvents || {};
  var history = [];

  window.dataLayer = window.dataLayer || [];

  function log() {
    if (debug && window.console) console.log.apply(console, ["[analytics]"].concat([].slice.call(arguments)));
  }

  /** Itens no formato do GA4 → conteúdos do Meta e do TikTok. */
  function contentsOf(ecommerce) {
    return ((ecommerce && ecommerce.items) || []).map(function (item) {
      return { id: item.item_id, content_id: item.item_id, content_name: item.item_name, quantity: item.quantity || 1, price: item.price };
    });
  }

  /**
   * track("add_to_cart", { ecommerce: { currency, value, items: [...] }, ...extras })
   * `ecommerce` segue o padrão de comércio eletrônico do GA4.
   */
  function track(name, params) {
    params = params || {};
    var ecommerce = params.ecommerce || null;
    var extra = {};
    Object.keys(params).forEach(function (key) {
      if (key !== "ecommerce") extra[key] = params[key];
    });
    history.push({ event: name, params: params, at: Date.now() });

    // Google Tag Manager
    try {
      if (ecommerce) window.dataLayer.push({ ecommerce: null });
      var entry = { event: name };
      Object.keys(extra).forEach(function (key) {
        entry[key] = extra[key];
      });
      if (ecommerce) entry.ecommerce = ecommerce;
      window.dataLayer.push(entry);
    } catch (e) {
      log("dataLayer", e);
    }

    // Google Analytics 4 (gtag.js)
    try {
      if (typeof window.gtag === "function") {
        var gaParams = {};
        Object.keys(extra).forEach(function (key) {
          gaParams[key] = extra[key];
        });
        if (ecommerce) {
          Object.keys(ecommerce).forEach(function (key) {
            gaParams[key] = ecommerce[key];
          });
        }
        window.gtag("event", name, gaParams);
      }
    } catch (e) {
      log("gtag", e);
    }

    var contents = contentsOf(ecommerce);
    var value = ecommerce && typeof ecommerce.value === "number" ? ecommerce.value : undefined;

    // Meta Pixel: só os eventos mapeados em config.js (analytics.metaPixelEvents)
    try {
      if (typeof window.fbq === "function" && metaEvents[name]) {
        var metaParams = { currency: (ecommerce && ecommerce.currency) || "BRL", content_type: "product" };
        if (value !== undefined) metaParams.value = value;
        if (contents.length) {
          metaParams.content_ids = contents.map(function (c) {
            return c.id;
          });
          metaParams.contents = contents.map(function (c) {
            return { id: c.id, quantity: c.quantity };
          });
        }
        if (params.transaction_id) {
          window.fbq("track", metaEvents[name], metaParams, { eventID: String(params.transaction_id) });
        } else {
          window.fbq("track", metaEvents[name], metaParams);
        }
      }
    } catch (e) {
      log("fbq", e);
    }

    // TikTok Pixel: só os eventos mapeados em config.js (analytics.tiktokEvents)
    try {
      if (window.ttq && typeof window.ttq.track === "function" && tiktokEvents[name]) {
        var ttParams = { currency: (ecommerce && ecommerce.currency) || "BRL", content_type: "product" };
        if (value !== undefined) ttParams.value = value;
        if (contents.length) {
          ttParams.contents = contents.map(function (c) {
            return { content_id: c.content_id, content_name: c.content_name, quantity: c.quantity, price: c.price };
          });
        }
        window.ttq.track(tiktokEvents[name], ttParams);
      }
    } catch (e) {
      log("ttq", e);
    }

    log(name, params);
  }

  /** Itens do GA4 a partir do objeto do pedido (js/core.js → buildOrder). */
  function orderItems(order) {
    var items = [
      {
        item_id: order.kit.id,
        item_name: "Café Baggio — " + order.kit.descricao,
        item_brand: "Baggio",
        item_category: "Café",
        item_variant: order.itens
          .map(function (i) {
            return i.quantidade + "× " + i.sabor;
          })
          .join(", ")
          .slice(0, 100),
        price: order.kit.preco,
        quantity: 1,
      },
    ];
    order.extras.forEach(function (e) {
      items.push({ item_id: e.id, item_name: e.nome, item_category: "Extras", price: e.preco, quantity: e.quantidade });
    });
    return items;
  }

  /** Dispara "purchase" uma única vez por pedido (usado em obrigado.html). */
  function purchase(order) {
    if (!order || !order.id) return false;
    var key = "baggio:purchase:" + order.id;
    try {
      if (window.localStorage.getItem(key)) return false;
      window.localStorage.setItem(key, "1");
    } catch (e) {
      /* sem armazenamento: dispara mesmo assim */
    }
    track("purchase", {
      transaction_id: order.id,
      ecommerce: {
        transaction_id: order.id,
        currency: order.moeda || "BRL",
        value: order.total,
        shipping: order.shipping ? order.shipping.price : 0,
        items: orderItems(order),
      },
    });
    return true;
  }

  window.BaggioAnalytics = { track: track, orderItems: orderItems, purchase: purchase, history: history, debug: debug };
})();
