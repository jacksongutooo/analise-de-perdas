# Café Baggio — página de vendas

Página de produto no estilo marketplace (TikTok Shop, Shopee, Mercado Livre), feita primeiro para o celular,
para vender os cafés Baggio em kits. É HTML, CSS e JavaScript puro: sem framework, sem dependências e sem etapa
de build. Abre direto no navegador (duplo clique em `index.html`) e pode ser publicada em qualquer hospedagem
estática.

> Esta pasta é independente do resto do repositório (o site Análise de Perdas, em Next.js). Ela não usa nem
> altera nenhum arquivo de lá, e o deploy do Next.js não publica esta pasta.

## O que tem na página

- **Primeira dobra de marketplace:** galeria (deslizar no celular, miniaturas no computador, foto ampliada ao
  tocar), selo 🔥 PROMOÇÃO, preço normal riscado, desconto, preço grande, preço por pacote, economia, frete
  grátis, estrelas, "Ver avaliações" e "+7.000 pacotes vendidos".
- **Promoção bem clara:** a faixa do topo avisa "🔥 PROMOÇÃO: 250g por R$ 29,90 · 500g por R$ 39,90" e, logo
  acima dos kits, um quadro mostra "Pacote de 250g: de ~~R$ 40,90~~ por R$ 29,90" e "Pacote de 500g: de
  ~~R$ 75,00~~ por R$ 39,90". Todos os preços aparecem como "De (riscado) / Por".
- **Escolha do kit sem confusão:** de cara só aparecem *1 pacote de 250g*, *1 pacote de 500g* e *1KG (MELHOR
  OFERTA)*. O 1KG abre *Kit Variedade (4×250g)* e *Kit Favoritos (2×500g)*, com o aviso de que os dois têm 1kg e
  o mesmo preço. Uma sugestão calculada mostra quanto falta para o kit de 1kg ("Por + R$ 40,00 leve 4
  pacotes (1kg): ≈ R$ 17,47 cada").
- **Monte seu kit:** pacotes numerados com a foto do sabor escolhido e cards de sabor com foto, nome, peso,
  borda de destaque e ✓ (ou 2×, 3×…). No pacote avulso é só tocar no sabor (tocar em outro troca). Nos kits dá
  para repetir, usar o mesmo sabor em todos ("Usar Caramelo nos 3 pacotes restantes") e trocar qualquer
  pacote. A página mostra "3 de 4 sabores escolhidos" e depois "Seu kit
  está pronto ✓". Bourbon e Espresso levam o selo **🏅 BLEND PREMIADO**.
- **250g e 500g nunca se misturam:** cada kit tem um peso só. Ao trocar de kit, os sabores já escolhidos são
  mantidos (e voltam se o cliente retornar a um kit maior).
- **Entrega:** PAC grátis já marcado e SEDEX por + R$ 15,00. O total muda na hora, sem recarregar.
- **Copinho de Cookie Muma (COMPLETE SEU CAFÉ 🍪)** nos dois sabores do site oficial, **Cacau** e **Choco
  Vanilla** (68g), por **R$ 9,99 cada**, cada um com o seu card e "Adicionar ao pedido por + R$ 9,99". Cada sabor é
  um item de `EXTRAS`.
- **Resumo do kit** com "De / Por / Você economiza" e o total.
- **Barra fixa no rodapé** com preço, frete e o botão (ESCOLHER SABOR/SABORES enquanto falta sabor, COMPRAR
  AGORA com o pedido pronto).
- **Carrinho** (gaveta de baixo no celular, lateral no computador): editar sabores, trocar o kit, remover,
  mudar a entrega, extras, subtotal, desconto, prazo e total, e o botão FINALIZAR COMPRA.
- **Avaliações estilo marketplace:** nota média, distribuição por estrelas, filtros (todas, 5/4/3 estrelas,
  com fotos, mais recentes e por sabor), faixa "FOTOS DOS CLIENTES" com visualização ampliada, cards com
  sabor, kit, data e "Compra verificada", e o botão "VER TODAS AS AVALIAÇÕES".
- **Qual kit combina com você?**, benefícios, dúvidas frequentes e rodapé.
- **Checkout** por link externo, por WhatsApp ou em modo demonstração, e a página `obrigado.html` para a volta
  do pagamento.
- O pedido em andamento fica salvo no navegador: recarregar a página não perde nada.

## Onde editar

Quase tudo fica em **`js/config.js`**. Nenhum preço está digitado em outro arquivo.

| O quê | Onde |
|---|---|
| Preços dos cafés (normal e promoção) | `js/config.js` → `PRICES` |
| Promoção (selo, quadro e faixa do topo) | `js/config.js` → `PROMO` |
| Preço do copinho de cookie (R$ 9,99, vale para os dois sabores) | `js/config.js` → `COOKIE_PRICE` |
| Copinho de cookie e outros sabores do biscoito xícara | `js/config.js` → `EXTRAS` |
| Sabores (adicionar, remover, esgotado, Blend Premiado, fotos) | `js/config.js` → `FLAVORS` |
| Kits, selos, kits ligados/desligados e o que aparece de cara | `js/config.js` → `OFFERS` e `OFFER_MENU` |
| Frete (PAC, SEDEX, preço e prazo) | `js/config.js` → `SHIPPING` |
| Fotos da galeria | `js/config.js` → `GALLERY` |
| Título, descrição, faixa do topo, "+7.000 pacotes vendidos", rodapé | `js/config.js` → `STORE` |
| Benefícios e dúvidas frequentes | `js/config.js` → `BENEFITS` e `FAQ` |
| Checkout | `js/config.js` → `CHECKOUT` |
| Eventos de analytics | `js/config.js` → `ANALYTICS` |
| **Avaliações** | **`js/reviews.js`** |
| Cores e espaçamentos | `css/loja.css` (variáveis no começo do arquivo) |

Os valores são em reais com **ponto** decimal (`40.90`). Depois de salvar, é só recarregar a página. Se o
`config.js` tiver um erro de digitação, a página mostra um aviso no lugar do conteúdo.

## Preços e promoção

| Oferta | De (preço normal) | Por (promoção) | Por pacote | Economia | Selo |
|---|---|---|---|---|---|
| 1 pacote 250g | R$ 40,90 | **R$ 29,90** | — | R$ 11,00 (-26%) | 🔥 PROMOÇÃO |
| 1 pacote 500g | R$ 75,00 | **R$ 39,90** | — | R$ 35,10 (-46%) | 🔥 PROMOÇÃO |
| Kit Variedade (4×250g, 1kg) | R$ 163,60 | **R$ 69,90** | ≈ R$ 17,47 | R$ 93,70 (-57%) | MELHOR OFERTA |
| Kit Favoritos (2×500g, 1kg) | R$ 150,00 | **R$ 69,90** | R$ 34,95 | R$ 80,10 (-53%) | |

Em `PRICES` ficam o preço normal de cada pacote (`regular250`, `regular500`) e os preços da promoção
(`unit250`, `unit500`, `kit4x250`, `kit2x500`). O "De" de qualquer oferta é sempre a quantidade de pacotes vezes o
preço normal do mesmo peso, e a economia é a diferença; nada disso é digitado. Quando a divisão não é exata, o
preço por pacote aparece com "≈", arredondado sem nunca aumentar. O percentual de desconto é arredondado para
baixo.

**Kit com 2 e Kit com 3 (250g) estão desligados** (`active: false` em `OFFERS`) porque ainda não têm preço na
promoção: não aparecem na página, no carrinho nem pelo link `?kit=`. Para religar, coloque o preço em
`PRICES.kit2x250`/`kit3x250`, apague o `active: false` do kit e, se quiser que ele apareça de cara, inclua o id em
`OFFER_MENU.main` (ou deixe em `OFFER_MENU.more` para ficar em "Ver mais opções").

**Promoção** (`PROMO`): com `active: true` aparecem o selo 🔥 PROMOÇÃO, o quadro "de/por" acima dos kits, a frase
de `PROMO.topBar` na faixa do topo e "Desconto da promoção" no carrinho. A frase aceita `{preco.250}`,
`{preco.500}`, `{precoNormal.250}` e `{precoNormal.500}`, preenchidos a partir de `PRICES`. Para encerrar a
promoção: `active: false` e os preços de venda de volta ao normal. `endsAt` (data de término real) e `stockLeft`
(estoque real) só aparecem se forem preenchidos — nunca com números inventados.

No celular, a faixa do topo mostra primeiro a promoção; as frases seguintes só aparecem se couberem na largura
da tela.

## Imagens oficiais

Hoje a página usa imagens provisórias (SVG) marcadas com **FOTO PROVISÓRIA**. Para trocar, salve a foto oficial
na pasta indicada e mude o caminho correspondente em `js/config.js`:

| Imagem | Pasta | Onde trocar o caminho | Tamanho sugerido |
|---|---|---|---|
| Galeria (embalagem, café servido, detalhes, preparo, sabores, blends, kits) | `img/galeria/` | `GALLERY` | 1200×1200, quadrada |
| Foto de cada sabor (pacote 250g) | `img/sabores/` | `FLAVORS` → `image` | 600×600, quadrada |
| Foto do pacote de 500g (opcional) | `img/sabores/` | `FLAVORS` → `image500` | 600×600, quadrada |
| Copinho de Cookie (Cacau e Choco Vanilla) | `img/extras/` | `EXTRAS` → `image` | 600×600, quadrada |
| Fotos dos clientes | `img/avaliacoes/` | `js/reviews.js` → `images` | até 1080px no lado maior |
| Logo (opcional) | `img/` | `STORE` → `logo` | SVG ou PNG com 64px de altura |
| Compartilhamento (WhatsApp, Facebook) | `img/og-image.png` | `index.html` | 1200×630 |

Exemplo: salve `img/sabores/caramelo.webp` e troque `image: "img/sabores/caramelo.svg"` por
`image: "img/sabores/caramelo.webp"`.

Use WebP ou JPG comprimido (ideal: menos de 150 KB por foto da galeria e menos de 60 KB por foto de sabor). A
primeira foto da galeria carrega antes das outras; as demais e as das avaliações só carregam quando aparecem na
tela. Os SVGs provisórios podem ser apagados depois da troca.

## Avaliações

As avaliações ficam em **`js/reviews.js`**:

- `reviews` — avaliações **reais**. Está vazia.
- `reviewsPlaceholder` — somente estrutura, para visualizar o layout. Os exemplos não têm nome, texto, data ou
  foto reais, a nota média, a quantidade e os percentuais aparecem como `X,X`, `XXX` e `XX%`, e cada card vem
  marcado como **EXEMPLO**.

Para adicionar uma avaliação real, copie o modelo que está no arquivo para dentro de `reviews`:

```js
var reviews = [
  {
    name: "[nome como deve aparecer]",
    avatar: "",                      // foto do cliente (opcional)
    rating: 5,                       // 1 a 5
    date: "2026-09-12",              // ou "12/09/2026"
    flavor: "chocolate-com-avela",   // id ou nome do sabor; vários: ["caramelo", "bourbon"]
    size: "250g",
    kit: "4x250",                    // id do kit (1x250, 4x250, 1x500, 2x500) ou texto livre
    verified: true,                  // true SOMENTE se a compra foi confirmada
    text: "[texto da avaliação]",
    images: ["img/avaliacoes/cliente-1.jpg"],
  },
];
```

Com uma avaliação real cadastrada, os exemplos somem sozinhos. Nota média, quantidade, percentual de cada estrela
(sempre somando 100%), contagem dos filtros, filtros por sabor e fotos dos clientes passam a ser calculados das
avaliações reais. A média tem uma casa decimal e é arredondada para baixo. Nenhum número é digitado à mão.

Outras opções em `settings`: `showPlaceholders: false` esconde os exemplos (use se publicar antes de ter
avaliações reais; nesse caso o topo da página mostra só "+7.000 pacotes vendidos", sem estrelas), e
`initialCount` define quantas avaliações aparecem antes de "VER TODAS AS AVALIAÇÕES".

## Checkout

O botão FINALIZAR COMPRA confere se todos os pacotes têm sabor, monta o pedido e segue conforme
`CHECKOUT.mode` em `js/config.js`:

- **`"demo"`** (ligado agora): mostra o pedido final na tela, com os dados técnicos. Serve para testar enquanto o
  checkout não está definido.
- **`"link"`**: abre o checkout externo em `CHECKOUT.url` (Yampi, CartPanda, Shopify, Appmax…) com o pedido nos
  parâmetros: `pedido`, `kit`, `sabores` (`caramelo:2,bourbon:1`), `frete`, `extras`, `total` e `dados` (o pedido
  completo em JSON, codificado em base64url). Se a plataforma pedir outro formato de link, use
  `CHECKOUT.buildUrl`:

  ```js
  buildUrl: function (pedido) {
    return "https://minhaloja.exemplo/checkout?ref=" + pedido.id + "&total=" + pedido.total;
  },
  ```

- **`"whatsapp"`**: abre o WhatsApp de `CHECKOUT.whatsapp` (só números, com DDI e DDD) com o pedido escrito.

Objeto do pedido (também salvo no navegador como `baggio:ultimo-pedido`):

```js
{
  id: "BG-261001-K7QX",
  tipoKit: "4x250g",
  kit: { id: "4x250", nome: "Kit Variedade", descricao: "Kit Variedade — 4×250g", pacotes: 4,
         pesoPacote: 250, pesoTotal: 1000, preco: 69.9, precoNormal: 163.6, economia: 93.7 },
  itens: [
    { sabor: "Caramelo", saborId: "caramelo", peso: 250, quantidade: 2 },
    { sabor: "Bourbon", saborId: "bourbon", peso: 250, quantidade: 1 },
    { sabor: "Chocolate com Avelã", saborId: "chocolate-com-avela", peso: 250, quantidade: 1 }
  ],
  extras: [],
  subtotal: 69.9,
  desconto: 93.7,
  shipping: { id: "pac", method: "PAC", price: 0, estimatedDays: 10 },
  total: 69.9,
  moeda: "BRL",
  criadoEm: "2026-10-01T12:00:00.000Z"
}
```

**Página de obrigado:** configure `obrigado.html` como URL de retorno da plataforma de pagamento (somente
depois do pagamento aprovado). Ela mostra o pedido, dispara o evento `purchase` uma única vez por pedido e
esvazia o carrinho. Se a plataforma devolver `?pedido=BG-…`, só vale o pedido com essa referência.

## Analytics e pixels

Cole os códigos-base (Google Tag Manager, GA4, Meta Pixel, TikTok Pixel) no lugar indicado no `<head>` de
`index.html` e de `obrigado.html`. Os eventos já saem para o `dataLayer` e, quando os pixels estão instalados,
para `gtag`, `fbq` e `ttq`:

| Evento | Quando |
|---|---|
| `view_item` | ao abrir a página |
| `select_offer` | ao trocar o kit |
| `select_flavor` | a cada sabor escolhido |
| `select_shipping` | ao trocar PAC/SEDEX |
| `add_to_cart` | COMPRAR AGORA com o kit pronto |
| `add_upsell` | ao adicionar o copinho de cookie |
| `view_reviews` | ao chegar nas avaliações ou tocar em "Ver avaliações" |
| `begin_checkout` | FINALIZAR COMPRA |
| `purchase` | em `obrigado.html` |

No Meta e no TikTok vão só os eventos padrão (ViewContent, AddToCart, InitiateCheckout, Purchase /
CompletePayment), mapeados em `ANALYTICS`. Adicione `?debug=1` ao endereço para ver os eventos no console.

## Link direto para um kit

`index.html?kit=4x250` já abre a página com o Kit Variedade marcado (vale para `1x250`, `4x250`, `1x500` e
`2x500`, e para os kits que forem religados). É útil em anúncios.

## Publicar

- **Vercel:** novo projeto apontando para este repositório → *Root Directory* `baggio` → *Framework Preset*
  "Other", sem comando de build.
- **Netlify / Cloudflare Pages:** pasta de publicação `baggio`, sem comando de build.
- **Qualquer hospedagem:** envie o conteúdo da pasta `baggio`.

Essas hospedagens já entregam os arquivos compactados (gzip/brotli): a página inteira fica em torno de 58 KB
na primeira visita, sem contar as fotos oficiais.

## Antes de publicar

- [ ] Fotos oficiais no lugar das imagens "FOTO PROVISÓRIA" (galeria, sabores e os dois copinhos de cookie).
- [ ] Preços do Kit com 2 e do Kit com 3, se forem voltar (hoje desligados).
- [ ] Avaliações reais em `js/reviews.js` (ou `showPlaceholders: false`).
- [ ] `CHECKOUT` configurado (`"link"` ou `"whatsapp"`); no modo `"demo"` o cliente não chega ao pagamento.
- [ ] Rodapé em `STORE`: WhatsApp, e-mail, horário, razão social, CNPJ, endereço e os links das políticas
      (os campos vazios aparecem como "[a preencher]").
- [ ] Pixels/GA colados em `index.html` e `obrigado.html`.
- [ ] Em `index.html`, `og:image` e `canonical` com o endereço completo do domínio.
- [ ] Conferir se todos os sabores existem em 250g e 500g. Se algum não existir, use `sizes: [250]` nele.

## Testes

```bash
node --test baggio/tests/core.test.js
```

Esse comando não precisa instalar nada. Ele confere preços, preço por pacote, economia, descontos, kits sem
mistura de pesos, preço normal × promoção, kits desligados, troca de kit preservando sabores, frete, copinho
de cookie, objeto do pedido, link do checkout, mensagem do WhatsApp e as contas das avaliações.

Teste de ponta a ponta no navegador (Chromium, celular e computador; precisa do Playwright):

```bash
npm i --no-save playwright && npx playwright install chromium
node baggio/tests/e2e.mjs
```

## Arquivos

```
baggio/
├── index.html            página de vendas
├── obrigado.html         retorno do checkout (dispara "purchase")
├── css/loja.css          estilos
├── js/config.js          ★ preços, sabores, kits, frete, extras, fotos, textos, checkout, analytics
├── js/reviews.js         ★ avaliações (reais e placeholders)
├── js/core.js            regras: preços, kits, pedido e contas das avaliações
├── js/loja.js            interface da página
├── js/analytics.js       eventos (dataLayer, gtag, fbq, ttq)
├── js/obrigado.js        página de obrigado
├── img/                  imagens (provisórias por enquanto)
└── tests/                core.test.js (lógica) e e2e.mjs (navegador)
```
