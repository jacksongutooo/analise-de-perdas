/* ============================================================================
   CAFÉ BAGGIO — AVALIAÇÕES DOS CLIENTES
   ----------------------------------------------------------------------------
   Coloque as avaliações reais na lista `reviews`. Assim que houver pelo menos
   uma, a página passa a usar SOMENTE as reais: nota média, quantidade de
   avaliações, percentual de cada estrela, filtros e fotos dos clientes são
   calculados automaticamente a partir delas.

   Campos de cada avaliação:
     name      nome como deve aparecer (ex.: "Mariana S.")
     avatar    foto do cliente — opcional (ex.: "img/avaliacoes/mariana.jpg")
     rating    nota de 1 a 5
     date      data da avaliação: "2026-09-12" ou "12/09/2026"
     flavor    sabor comprado: id ou nome ("caramelo" ou "Caramelo");
               mais de um sabor: ["caramelo", "bourbon"]
     size      tamanho (ex.: "250g")
     kit       kit comprado: id do kit ("4x250", "2x500", "1x250"...) ou texto livre
     verified  true SOMENTE se a compra foi confirmada (mostra "Compra verificada")
     text      texto da avaliação
     images    fotos enviadas pelo cliente, salvas em img/avaliacoes/
               (ex.: ["img/avaliacoes/mariana-1.jpg", "img/avaliacoes/mariana-2.jpg"])
   ========================================================================== */
(function () {
  "use strict";

  /* ── AVALIAÇÕES REAIS ─────────────────────────────────────────────────────
     Vazia até chegarem as avaliações reais. Modelo para copiar:
     {
       name: "",
       avatar: "",
       rating: 5,
       date: "",
       flavor: "",
       size: "250g",
       kit: "",
       verified: false,
       text: "",
       images: [],
     },
  */
  var reviews = [];

  /* ── reviewsPlaceholder — SOMENTE ESTRUTURA, NÃO SÃO AVALIAÇÕES ───────────
     Aparecem apenas enquanto `reviews` estiver vazia (e showPlaceholders for
     true), para visualizar o layout. Sem nomes, textos, datas ou fotos reais;
     a nota média, a quantidade e os percentuais ficam como "X,X", "XXX" e "XX%"
     e cada card aparece marcado como EXEMPLO. Podem ser apagados quando as
     avaliações reais forem cadastradas. */
  var reviewsPlaceholder = [
    {
      name: "[Nome do cliente]",
      rating: 5,
      date: "[data]",
      flavor: "chocolate-com-avela",
      size: "250g",
      kit: "4x250",
      verified: false,
      text: "[Texto da avaliação — aqui entra o comentário real do cliente.]",
      images: ["img/avaliacoes/exemplo-foto-cliente.svg", "img/avaliacoes/exemplo-foto-cliente.svg"],
    },
    {
      name: "[Nome do cliente]",
      rating: 5,
      date: "[data]",
      flavor: "caramelo",
      size: "250g",
      kit: "3x250",
      verified: false,
      text: "[Texto da avaliação — comentário real do cliente sobre o sabor, a entrega ou a embalagem. Textos maiores quebram em várias linhas, como neste exemplo.]",
      images: [],
    },
    {
      name: "[Nome do cliente]",
      rating: 5,
      date: "[data]",
      flavor: "bourbon",
      size: "500g",
      kit: "2x500",
      verified: false,
      text: "[Texto da avaliação]",
      images: ["img/avaliacoes/exemplo-foto-cliente.svg"],
    },
    {
      name: "[Nome do cliente]",
      rating: 5,
      date: "[data]",
      flavor: "espresso",
      size: "250g",
      kit: "1x250",
      verified: false,
      text: "[Texto da avaliação]",
      images: [],
    },
    {
      name: "[Nome do cliente]",
      rating: 5,
      date: "[data]",
      flavor: "chocolate-trufado",
      size: "250g",
      kit: "4x250",
      verified: false,
      text: "[Texto da avaliação]",
      images: ["img/avaliacoes/exemplo-foto-cliente.svg"],
    },
    {
      name: "[Nome do cliente]",
      rating: 5,
      date: "[data]",
      flavor: "baunilha",
      size: "250g",
      kit: "2x250",
      verified: false,
      text: "[Texto da avaliação]",
      images: [],
    },
  ];

  var settings = {
    showPlaceholders: true, // false = sem exemplos (use se publicar antes de ter avaliações reais)
    initialCount: 4, // quantas avaliações aparecem antes de "VER TODAS AS AVALIAÇÕES"
    pageSize: 10, // quantas a mais aparecem a cada "VER MAIS AVALIAÇÕES"
  };

  var data = { reviews: reviews, reviewsPlaceholder: reviewsPlaceholder, settings: settings };
  if (typeof module !== "undefined" && module.exports) module.exports = data;
  else window.BAGGIO_REVIEWS = data;
})();
