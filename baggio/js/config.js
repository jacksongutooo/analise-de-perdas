/* ============================================================================
   CAFÉ BAGGIO — CONFIGURAÇÃO CENTRAL DA LOJA
   ----------------------------------------------------------------------------
   Este é o arquivo para editar preços, sabores, kits, frete, extras, fotos,
   textos curtos, checkout e analytics. Nenhum outro arquivo tem preço digitado
   à mão: página, carrinho e pedido calculam tudo a partir daqui.

   • Valores em reais com PONTO decimal: 40.90 (vírgula quebra o arquivo).
   • Salvou? É só recarregar a página.
   • Avaliações dos clientes ficam em js/reviews.js.
   • Textos podem usar marcadores que a página preenche sozinha:
       {preco.250}        {preco.500}        {precoNormal.250}   {precoNormal.500}
       {frete.pac.preco}  {frete.pac.prazo}  {frete.sedex.preco} {frete.sedex.prazo}
       {sabores.total}    {vendidos}         {vendidos.curto}
   ========================================================================== */
(function () {
  "use strict";

  /* ── PREÇOS DOS CAFÉS (R$) ────────────────────────────────────────────────
     PROMOÇÃO: os pacotes estão com preço promocional.
     regular250 / regular500 = preço normal do pacote (aparece riscado, "De").
     O "De" de cada kit é a soma dos pacotes pelo preço normal; a economia e o
     percentual saem daí. Nunca escreva desconto à mão.
     Fim da promoção: iguale unit250/unit500 ao preço normal, ajuste os kits e
     mude PROMO.active para false. */
  var PRICES = {
    regular250: 40.90, // preço normal de 1 pacote de 250g (antes da promoção)
    regular500: 75.00, // preço normal de 1 pacote de 500g (antes da promoção)

    unit250: 29.90, //  1 pacote de 250g — promoção
    unit500: 39.90, //  1 pacote de 500g — promoção
    kit4x250: 69.90, // 4 pacotes de 250g (1kg) — promoção
    kit2x500: 69.90, // 2 pacotes de 500g (1kg) — promoção
    kit2x250: null, //  sem preço na promoção: kit desligado (veja OFFERS)
    kit3x250: null, //  sem preço na promoção: kit desligado (veja OFFERS)
  };

  /* ── COPINHO DE COOKIE (extra) ────────────────────────────────────────────
     Preço de cada copinho (vale para os dois sabores: Cacau e Choco Vanilla).
     Com null, eles aparecem como "em breve" e não entram no pedido. */
  var COOKIE_PRICE = 9.99;

  /* ── FRETE ────────────────────────────────────────────────────────────────
     price: valor somado ao pedido (0 = grátis).
     estimatedBusinessDays: prazo estimado em dias úteis.
     Se o PAC deixar de ser grátis, ajuste também label e badge. */
  var SHIPPING = {
    pac: {
      name: "PAC",
      label: "GRÁTIS",
      badge: "🚚 FRETE GRÁTIS",
      price: 0,
      estimatedBusinessDays: 10,
    },
    sedex: {
      name: "SEDEX",
      label: "MAIS RÁPIDO",
      badge: "⚡ RECEBA MAIS RÁPIDO",
      price: 15.00,
      estimatedBusinessDays: 5,
    },
  };
  var DEFAULT_SHIPPING = "pac"; // entrega já marcada ao abrir a página

  /* ── SABORES ──────────────────────────────────────────────────────────────
     Adicionar: copie uma linha e troque id (sem espaço/acento), nome e foto.
     Remover: apague a linha. Esgotou? available: false (aparece "Indisponível").
     award: true mostra o selo "🏅 BLEND PREMIADO".
     sizes: pesos em que o sabor existe (padrão: todos os pesos dos kits).
     image: foto do pacote de 250g; image500: foto do pacote de 500g (opcional).
     color: cor de apoio do sabor (usada enquanto a foto carrega). */
  var FLAVORS = [
    { id: "chocolate-com-avela", name: "Chocolate com Avelã", image: "img/sabores/chocolate-com-avela.svg", color: "#7b4a2d" },
    { id: "chocolate-com-menta", name: "Chocolate com Menta", image: "img/sabores/chocolate-com-menta.svg", color: "#2f7d6d" },
    { id: "chocolate-trufado", name: "Chocolate Trufado", image: "img/sabores/chocolate-trufado.svg", color: "#4a2c21" },
    { id: "caramelo", name: "Caramelo", image: "img/sabores/caramelo.svg", color: "#c47f2c" },
    { id: "baunilha", name: "Baunilha", image: "img/sabores/baunilha.svg", color: "#d9bf86" },
    { id: "bourbon", name: "Bourbon", image: "img/sabores/bourbon.svg", color: "#8c2f23", award: true },
    { id: "espresso", name: "Espresso", image: "img/sabores/espresso.svg", color: "#1f1a17", award: true },
  ];

  /* ── KITS (OFERTAS) ───────────────────────────────────────────────────────
     Cada kit tem UM único peso (size): pacotes de 250g e 500g nunca se misturam.
     id: usado no link direto (?kit=4x250) e no pedido.
     badge: selo do kit. tagline/cta: texto curto e botão da escolha de 1kg.
     upgradeTo: kit sugerido em "Por + R$ X leve mais" (mesmo peso).
     active: false esconde o kit da página (para voltar: defina o preço em
     PRICES e apague o active: false). */
  var OFFERS = [
    { id: "1x250", size: 250, packs: 1, price: PRICES.unit250, name: "1 pacote", upgradeTo: "4x250" },
    { id: "2x250", size: 250, packs: 2, price: PRICES.kit2x250, name: "Kit com 2", upgradeTo: "4x250", active: false },
    { id: "3x250", size: 250, packs: 3, price: PRICES.kit3x250, name: "Kit com 3", badge: "MAIS VENDIDO", upgradeTo: "4x250", active: false },
    {
      id: "4x250",
      size: 250,
      packs: 4,
      price: PRICES.kit4x250,
      name: "Kit Variedade",
      badge: "MELHOR OFERTA",
      tagline: "Ideal para experimentar mais sabores.",
      cta: "MONTAR KIT",
    },
    { id: "1x500", size: 500, packs: 1, price: PRICES.unit500, name: "1 pacote", upgradeTo: "2x500" },
    {
      id: "2x500",
      size: 500,
      packs: 2,
      price: PRICES.kit2x500,
      name: "Kit Favoritos",
      tagline: "Mais quantidade dos sabores que você já ama.",
      cta: "ESCOLHER SABORES",
    },
  ];

  /* Como os kits aparecem na primeira área comercial (sem mostrar várias opções de cara).
     Kits desligados (active: false) somem sozinhos destas listas. */
  var OFFER_MENU = {
    main: ["1x250", "1x500", "1kg"], // "1kg" = grupo que abre Kit Variedade e Kit Favoritos
    oneKg: { offers: ["4x250", "2x500"], name: "1KG", badge: "MELHOR OFERTA" },
    more: ["2x250", "3x250"], // ficam em "Ver mais opções" (quando ativos)
    defaultOffer: "1x250", // opção já marcada ao abrir a página
  };

  /* "Qual kit combina com você?" */
  var COMPARE = [
    { offer: "4x250", title: "QUERO EXPERIMENTAR MAIS SABORES", cta: "MONTAR KIT" },
    { offer: "2x500", title: "JÁ TENHO MEUS FAVORITOS", cta: "ESCOLHER SABORES" },
  ];

  /* ── EXTRAS ("Complete seu café") ─────────────────────────────────────────
     Cada item vira um card (ex.: um por sabor do biscoito xícara). Todos usam
     COOKIE_PRICE; para um preço diferente, troque price no item. */
  var EXTRAS = [
    {
      id: "copinho-cookie-cacau",
      name: "Copinho de Cookie sabor Cacau",
      weight: "68g",
      brand: "Muma",
      description: "Copinho de cookie sabor cacau para acompanhar o seu café.",
      image: "img/extras/copinho-cookie-cacau.svg",
      price: COOKIE_PRICE,
      maxQuantity: 10,
    },
    {
      // Segundo sabor, conforme o site oficial da Baggio (Copinho de Cookie Sabor Choco Vanilla 68g)
      id: "copinho-cookie-choco-vanilla",
      name: "Copinho de Cookie sabor Choco Vanilla",
      weight: "68g",
      brand: "Muma",
      description: "Copinho de cookie sabor chocolate com baunilha para acompanhar o seu café.",
      image: "img/extras/copinho-cookie-choco-vanilla.svg",
      price: COOKIE_PRICE,
      maxQuantity: 10,
    },
  ];

  /* ── FOTOS DA GALERIA ─────────────────────────────────────────────────────
     A primeira é a foto principal (carrega primeiro). Fotos oficiais: coloque
     em img/galeria/ (quadradas, 1200×1200, WebP ou JPG) e troque o caminho. */
  var GALLERY = [
    { src: "img/galeria/01-embalagem.svg", alt: "Embalagens do Café Baggio" },
    { src: "img/galeria/02-cafe-servido.svg", alt: "Café Baggio servido na xícara" },
    { src: "img/galeria/03-detalhes.svg", alt: "Detalhes da embalagem do Café Baggio" },
    { src: "img/galeria/04-preparo.svg", alt: "Preparo do Café Baggio" },
    { src: "img/galeria/05-sabores.svg", alt: "Os sabores do Café Baggio" },
    { src: "img/galeria/06-blends-premiados.svg", alt: "Blends Premiados Bourbon e Espresso" },
    { src: "img/galeria/07-kit-variedade.svg", alt: "Kit Variedade com 4 pacotes de 250g" },
    { src: "img/galeria/08-kit-favoritos.svg", alt: "Kit Favoritos com 2 pacotes de 500g" },
  ];

  /* ── LOJA E TEXTOS CURTOS ─────────────────────────────────────────────────
     Campos vazios aparecem como "[a preencher]" no rodapé. Não invente dados:
     preencha só com as informações reais da loja. */
  var STORE = {
    name: "Baggio Café",
    logo: "", // caminho do logo (ex.: "img/logo.svg"); vazio = logo em texto
    title: "Café Baggio — {sabores.total} sabores para montar seu kit | Pacotes de 250g e 500g",
    description: "Combine ou repita sabores do jeito que quiser e receba em casa com frete grátis no PAC.",
    // Faixa do topo: partes separadas por "•"; o que não couber na tela fica de fora
    // (com a promoção ligada, a frase de PROMO.topBar vem primeiro).
    topBar: "🚚 FRETE GRÁTIS no PAC  •  ⚡ SEDEX em até {frete.sedex.prazo} dias úteis",
    sold: "+7.000 pacotes vendidos",
    soldShort: "+7 mil pacotes vendidos",
    support: {
      whatsapp: "", // só números com DDI e DDD, ex.: "5511999999999"
      email: "",
      hours: "", // ex.: "Seg. a sex., 9h às 18h"
    },
    company: {
      legalName: "",
      cnpj: "",
      address: "",
    },
    links: {
      privacy: "", // URL da Política de Privacidade
      terms: "", // URL dos Termos de Uso
      shipping: "", // URL da Política de Entrega
      returns: "", // URL da Política de Troca e Devolução
    },
  };

  /* ── PROMOÇÃO ─────────────────────────────────────────────────────────────
     active: true mostra o selo PROMOÇÃO junto dos preços, a frase da faixa do
     topo e o quadro "de R$ X por R$ Y" de cada pacote (calculado de PRICES).
     Use SOMENTE para promoção real. Nada de contador falso: endsAt e stockLeft
     só se forem reais (o prazo e o estoque mostrados são exatamente os daqui). */
  var PROMO = {
    active: true,
    label: "PROMOÇÃO",
    topBar: "🔥 PROMOÇÃO: 250g por {preco.250} · 500g por {preco.500}",
    endsAt: "", // fim real, ex.: "2026-10-15T23:59:59-03:00" (mostra a contagem regressiva)
    stockLeft: null, // estoque real limitado, ex.: 40 (mostra "Restam 40 unidades")
  };

  /* ── BENEFÍCIOS (uma ou duas linhas cada) ─────────────────────────────── */
  var BENEFITS = [
    { icon: "☕", title: "Diversos sabores para escolher", text: "{sabores.total} opções" },
    { icon: "📦", title: "Monte seu próprio kit", text: "Combine ou repita sabores" },
    { icon: "🚚", title: "PAC grátis", text: "Até {frete.pac.prazo} dias úteis" },
    { icon: "⚡", title: "SEDEX disponível", text: "Até {frete.sedex.prazo} dias úteis por + {frete.sedex.preco}" },
    { icon: "🏅", title: "Blends premiados", text: "Bourbon e Espresso" },
    { icon: "⭐", title: "{vendidos.curto}", text: "" },
  ];

  /* ── DÚVIDAS FREQUENTES ───────────────────────────────────────────────── */
  var FAQ = [
    { q: "Posso escolher sabores diferentes no meu kit?", a: "Sim. Você pode combinar ou repetir os sabores disponíveis." },
    { q: "Posso escolher todos os pacotes do mesmo sabor?", a: "Sim." },
    {
      q: "Qual a diferença entre 4×250g e 2×500g?",
      a: "Ambos possuem 1kg. O kit 4×250g permite experimentar mais sabores. O kit 2×500g é indicado para quem quer maior quantidade dos seus favoritos.",
    },
    { q: "O frete é grátis?", a: "Sim. A entrega via PAC é grátis." },
    { q: "Quanto demora o PAC?", a: "Prazo estimado de até {frete.pac.prazo} dias úteis." },
    {
      q: "Existe entrega mais rápida?",
      a: "Sim. Você pode escolher SEDEX por mais {frete.sedex.preco}, com prazo estimado de até {frete.sedex.prazo} dias úteis.",
    },
    { q: "Os pacotes são de quantos gramas?", a: "Existem opções de 250g e 500g." },
    { q: "Posso repetir sabores?", a: "Sim." },
  ];

  /* ── CHECKOUT ─────────────────────────────────────────────────────────────
     O que acontece no botão FINALIZAR COMPRA (o pedido completo vai junto):
       "demo"     — mostra o pedido final na tela. Use enquanto o checkout não
                    estiver configurado (é o que está ligado agora).
       "link"     — abre o checkout externo em `url` (Yampi, CartPanda, Shopify,
                    Appmax...) com o pedido nos parâmetros: pedido, kit, sabores,
                    frete, extras, total e dados (pedido completo em base64url).
                    Se a plataforma pedir outro formato, use buildUrl.
       "whatsapp" — abre o WhatsApp da loja com o pedido escrito.
     buildUrl (opcional): function (pedido) { return "https://..."; } */
  var CHECKOUT = {
    mode: "demo",
    url: "",
    whatsapp: "", // só números com DDI e DDD, ex.: "5511999999999"
    buildUrl: null,
  };

  /* ── ANALYTICS ────────────────────────────────────────────────────────────
     Os eventos (view_item, select_offer, select_flavor, select_shipping,
     add_to_cart, add_upsell, view_reviews, begin_checkout, purchase) vão para
     o dataLayer (Google Tag Manager) e, se estiverem instalados no index.html,
     para gtag (GA4), Meta Pixel (fbq) e TikTok Pixel (ttq).
     debug: true (ou ?debug=1 no endereço) mostra cada evento no console. */
  var ANALYTICS = {
    debug: false,
    metaPixelEvents: {
      view_item: "ViewContent",
      add_to_cart: "AddToCart",
      add_upsell: "AddToCart",
      begin_checkout: "InitiateCheckout",
      purchase: "Purchase",
    },
    tiktokEvents: {
      view_item: "ViewContent",
      add_to_cart: "AddToCart",
      add_upsell: "AddToCart",
      begin_checkout: "InitiateCheckout",
      purchase: "CompletePayment",
    },
  };

  var config = {
    store: STORE,
    prices: PRICES,
    cookiePrice: COOKIE_PRICE,
    shipping: SHIPPING,
    defaultShipping: DEFAULT_SHIPPING,
    flavors: FLAVORS,
    offers: OFFERS,
    offerMenu: OFFER_MENU,
    compare: COMPARE,
    extras: EXTRAS,
    gallery: GALLERY,
    promo: PROMO,
    benefits: BENEFITS,
    faq: FAQ,
    checkout: CHECKOUT,
    analytics: ANALYTICS,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = config;
  else window.BAGGIO_CONFIG = config;
})();
