/* Café Baggio — página de retorno do checkout (obrigado.html).
   Mostra o último pedido montado na loja e dispara "purchase" uma única vez
   por pedido. Use como URL de retorno da plataforma de pagamento SOMENTE
   depois do pagamento aprovado. */
(function () {
  "use strict";

  var core = window.BaggioCore;
  var analytics = window.BaggioAnalytics;
  var box = document.getElementById("obrigado-pedido");
  var order = null;
  try {
    order = JSON.parse(window.localStorage.getItem("baggio:ultimo-pedido") || "null");
  } catch (e) {
    order = null;
  }

  // Se o checkout devolver ?pedido=BG-..., só vale o pedido com essa referência.
  var ref = new URLSearchParams(window.location.search).get("pedido");
  if (!order || !order.id || !order.kit || (ref && ref !== order.id)) return;

  var esc = function (value) {
    return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var money = function (reais) {
    return core.formatBRL(Math.round(reais * 100));
  };

  var items = order.itens
    .map(function (i) {
      return "<li>" + i.quantidade + "× " + esc(i.sabor) + " " + i.peso + "g</li>";
    })
    .concat(
      order.extras.map(function (e) {
        return "<li>" + e.quantidade + "× " + esc(e.nome) + "</li>";
      }),
    )
    .join("");

  box.innerHTML =
    '<p class="done__ref">Pedido ' +
    esc(order.id) +
    "</p>" +
    '<div class="done__box"><p><b>' +
    esc(order.kit.descricao) +
    "</b></p><ul>" +
    items +
    '</ul><dl class="ctotals"><div><dt>Produtos</dt><dd>' +
    money(order.subtotal) +
    "</dd></div><div><dt>Entrega " +
    esc(order.shipping.method) +
    "</dt><dd>" +
    (order.shipping.price ? money(order.shipping.price) : '<b class="free">GRÁTIS</b>') +
    "</dd></div>" +
    (order.shipping.estimatedDays ? "<div><dt>Prazo estimado</dt><dd>até " + esc(order.shipping.estimatedDays) + " dias úteis</dd></div>" : "") +
    '<div class="is-total"><dt>TOTAL</dt><dd>' +
    money(order.total) +
    "</dd></div></dl></div>";

  if (analytics) analytics.purchase(order);

  // Pedido concluído: o carrinho da loja volta vazio.
  try {
    var saved = JSON.parse(window.localStorage.getItem("baggio:pedido:v1") || "null");
    if (saved) {
      saved.inCart = false;
      window.localStorage.setItem("baggio:pedido:v1", JSON.stringify(saved));
    }
  } catch (e) {
    /* sem armazenamento */
  }
})();
