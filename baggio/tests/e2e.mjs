// Teste de ponta a ponta da página (Chromium, celular e desktop): kits, sabores,
// pesos, frete, barra fixa, CTAs, carrinho, avaliações, galeria, copinho de cookie,
// checkout, analytics, acessibilidade básica e performance.
//
// Precisa do Playwright com o Chromium (não faz parte do site). Na raiz do repositório:
//   npm i --no-save playwright && npx playwright install chromium
//   node baggio/tests/e2e.mjs          (com --shots salva capturas em ./baggio-e2e-shots)
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const { chromium, devices } = await import(process.env.PLAYWRIGHT_MODULE || "playwright").catch(() => {
  console.error("Playwright não encontrado. Instale com: npm i --no-save playwright && npx playwright install chromium");
  process.exit(2);
});

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SHOTS = path.resolve(process.env.SHOTS_DIR || "baggio-e2e-shots") + path.sep;
const takeShots = process.argv.includes("--shots");
if (takeShots) mkdirSync(SHOTS, { recursive: true });

/** Servidor estático da pasta baggio/, contando os bytes entregues (teste de performance). */
function startServer(root) {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
  const stats = { requests: [] };
  const server = http.createServer(async (req, res) => {
    let file = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (file.endsWith("/")) file += "index.html";
    const full = path.join(root, file);
    if (!full.startsWith(root + path.sep)) return res.writeHead(403).end();
    try {
      const body = await readFile(full);
      stats.requests.push({ path: file, bytes: body.length });
      res.writeHead(200, { "content-type": types[path.extname(full)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(body);
    } catch {
      stats.requests.push({ path: file, bytes: 0, missing: true });
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, stats, url: "http://127.0.0.1:" + server.address().port })));
}

const { server, url, stats } = await startServer(ROOT);
const browser = await chromium.launch();
const results = [];
const MOBILE = { ...devices["iPhone 13"] };
const DESKTOP = { viewport: { width: 1366, height: 860 } };
const configSource = readFileSync(path.join(ROOT, "js/config.js"), "utf8");
const reviewsSource = readFileSync(path.join(ROOT, "js/reviews.js"), "utf8");
const nb = (s) => String(s).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

async function check(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log("✔", name);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log("✘", name, "\n   ", String(error && error.message).split("\n").slice(0, 6).join("\n    "));
  }
}

async function open(device, { config, reviews, path = "/index.html", init } = {}) {
  const ctx = await browser.newContext(device);
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") page.errors.push(m.text());
  });
  if (config) await page.route("**/js/config.js", (route) => route.fulfill({ contentType: "text/javascript", body: config(configSource) }));
  if (reviews) await page.route("**/js/reviews.js", (route) => route.fulfill({ contentType: "text/javascript", body: reviews(reviewsSource) }));
  if (init) await page.addInitScript(init);
  await page.goto(url + path, { waitUntil: "networkidle" });
  return { ctx, page };
}

const text = async (page, sel) => nb(await page.locator(sel).first().innerText());
const shot = async (page, name) => {
  if (takeShots) await page.screenshot({ path: SHOTS + name + ".png" });
};
const events = (page) => page.evaluate(() => window.dataLayer.filter((e) => e.event).map((e) => e.event));
const pickFlavors = async (page, ids) => {
  for (const id of ids) await page.locator(`#montar .flavor[data-flavor="${id}"]`).click();
};
const order = (page) => page.evaluate(() => window.BaggioStore.buildOrder());
const barVisible = (page) => page.evaluate(() => document.getElementById("barra").classList.contains("is-on"));

// ─────────────────────────────────────────────────────────────────────────

await check("01 responsividade: sem rolagem horizontal em 320/360/390/768/1024/1366px", async () => {
  for (const width of [320, 360, 390, 768, 1024, 1366]) {
    const mobile = width < 900;
    const { ctx, page } = await open({ viewport: { width, height: 800 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const { sw, vw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    assert.equal(sw, vw, `largura ${width}: scrollWidth ${sw} > ${vw}`);
    const btn = await page.locator("[data-bar-btn]").evaluate((el) => ({ fits: el.scrollWidth <= el.clientWidth, h: el.getBoundingClientRect().height }));
    assert.ok(btn.fits && btn.h <= 52, `largura ${width}: botão da barra quebrou (${JSON.stringify(btn)})`);
    const strip = await page.locator("#faixa").evaluate((el) => el.scrollWidth <= el.clientWidth);
    assert.ok(strip, `largura ${width}: texto da faixa do topo cortado`);
    assert.match(await text(page, "#faixa .topbar__part"), /PROMOÇÃO: 250g por R\$ 29,90 · 500g por R\$ 39,90/, `largura ${width}: promoção some da faixa`);
    assert.deepEqual(page.errors, []);
    await ctx.close();
  }
});

await check("02 celular: primeira tela mostra foto, preço, desconto e barra com preço + botão", async () => {
  const { ctx, page } = await open(MOBILE);
  await shot(page, "m-fold");
  const vh = page.viewportSize().height;
  for (const sel of ["#galeria img", "#preco .price__value", "#preco .off", ".pinfo__title"]) {
    const box = await page.locator(sel).first().boundingBox();
    assert.ok(box && box.y < vh, `${sel} fora da primeira tela (y=${box && box.y})`);
  }
  // Abre em 1 pacote de 250g na promoção: preço normal riscado e preço promocional
  assert.equal(await text(page, "#preco .price__value"), "R$ 29,90");
  assert.equal(await text(page, "#preco s"), "R$ 40,90");
  assert.equal(await text(page, "#preco .off"), "-26%");
  assert.match(await text(page, "#preco"), /🔥 PROMOÇÃO De R\$ 40,90 -26% Por R\$ 29,90 1 pacote de 250g moído · Você economiza R\$ 11,00/);
  assert.match(await text(page, "#faixa"), /🔥 PROMOÇÃO: 250g por R\$ 29,90 · 500g por R\$ 39,90/);
  assert.ok(await barVisible(page), "barra fixa deve aparecer de início no celular");
  assert.equal(await text(page, "[data-bar-value]"), "R$ 29,90");
  assert.equal(await text(page, "[data-bar-btn]"), "ESCOLHER SABOR");
  assert.match(await text(page, ".pinfo__social"), /\+7\.000 pacotes vendidos/);
  assert.match(await text(page, ".shipinfo"), /FRETE GRÁTIS.*PAC.*10 dias úteis/);
  // Botões grandes o suficiente para o dedo
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("#ofertas .opt, #montar .flavor, #montar .slot, #entrega .opt, #cta-principal, [data-bar-btn]")]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width && (r.height < 44 || r.width < 44)).length,
  );
  assert.equal(small, 0, "alvos de toque menores que 44px");
  await ctx.close();
});

await check("03 seleção de kit, preços da promoção (De/Por) e kits sem preço escondidos", async () => {
  const { ctx, page } = await open(MOBILE);
  const visible = await page.locator('#ofertas input[name="kit"]').evaluateAll((els) => els.map((e) => e.value));
  assert.deepEqual(visible, ["1x250", "1x500", "1kg"]);
  // Kits de 2 e 3 pacotes estão sem preço (active: false): nem aparecem, nem em "Ver mais opções"
  assert.equal(await page.locator('#ofertas [data-action="more-toggle"]').count(), 0);
  assert.equal(await page.locator('#ofertas input[value="2x250"], #ofertas input[value="3x250"]').count(), 0);
  assert.match(await text(page, "#ofertas .promo-box"), /🔥 PROMOÇÃO Pacote de 250g moído: de R\$ 40,90 por R\$ 29,90 Pacote de 500g em grãos \(Bourbon e Espresso\): de R\$ 75,00 por R\$ 39,90/);
  assert.match(await text(page, "#ofertas .opt.is-selected"), /^1 pacote 250g moído -26% Economize R\$ 11,00 De R\$ 40,90 Por R\$ 29,90 Frete grátis$/);
  assert.match(await text(page, '#ofertas label:has(input[value="1x500"])'), /^1 pacote 500g em grãos -46% Economize R\$ 35,10 De R\$ 75,00 Por R\$ 39,90 Frete grátis$/);
  assert.match(await text(page, '#ofertas label:has(input[value="1kg"])'), /1KG MELHOR OFERTA 4×250g ou 2×500g até -57% Economize até R\$ 93,70 R\$ 69,90 2 opções/);

  assert.equal(await page.locator("#montar .slot").count(), 0, "1 pacote: sem pacotes para montar");
  assert.equal(await text(page, "#montar-titulo"), "ESCOLHA SEU SABOR");

  await page.locator('#ofertas label:has(input[value="1x500"])').click();
  assert.equal(await text(page, "#preco .price__value"), "R$ 39,90");
  assert.match(await text(page, "#preco"), /🔥 PROMOÇÃO De R\$ 75,00 -46% Por R\$ 39,90 1 pacote de 500g em grãos · Você economiza R\$ 35,10/);
  // 500g: só Bourbon e Espresso (em grãos), como no site oficial
  assert.deepEqual(await page.locator("#montar .flavor").evaluateAll((els) => els.map((e) => e.getAttribute("data-flavor"))), ["bourbon", "espresso"]);
  assert.ok((await page.locator("#montar .flavor__meta").allInnerTexts()).every((m) => m === "500g"));
  assert.equal(await text(page, "#montar .block__aside"), "1 pacote de 500g em grãos");

  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  assert.equal(await page.locator("#ofertas .kg").count(), 2, "1KG abre Kit Variedade e Kit Favoritos");
  const kg = await text(page, "#ofertas .kgs");
  assert.match(kg, /KIT VARIEDADE 4 pacotes de 250g moído Total: 1kg R\$ 69,90 R\$ 163,60 -57% Ideal para experimentar mais sabores\. MONTAR KIT/);
  assert.match(kg, /KIT FAVORITOS 2 pacotes de 500g em grãos Bourbon e Espresso Total: 1kg R\$ 69,90 R\$ 150,00 -53% Mais quantidade dos sabores que você já ama\. ESCOLHER SABORES/);
  assert.match(kg, /As duas opções têm 1kg e o mesmo preço\./);
  // "De" dos kits = pacotes × preço normal do mesmo tamanho (4 × R$ 40,90 e 2 × R$ 75,00)
  await page.locator('#ofertas .kg [data-offer="2x500"]').click();
  assert.match(await text(page, "#preco"), /De R\$ 150,00 -53% Por R\$ 69,90 R\$ 34,95 por pacote Kit Favoritos · 2 pacotes de 500g em grãos · 1kg · Você economiza R\$ 80,10/);
  await page.locator('#ofertas .kg [data-offer="4x250"]').click();
  await shot(page, "m-1kg");
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

await check("04-06 sabores: escolher, repetir, trocar, progresso e kit pronto", async () => {
  const { ctx, page } = await open(MOBILE);
  // 1 pacote: tocar em outro sabor troca o sabor escolhido
  await pickFlavors(page, ["baunilha"]);
  assert.match(await text(page, "#resumo"), /1 pacote — 250g moído 1× Baunilha 250g/);
  assert.equal(await text(page, "[data-bar-btn]"), "COMPRAR AGORA");
  await pickFlavors(page, ["espresso"]);
  assert.match(await text(page, "#resumo"), /1× Espresso 250g/);
  assert.doesNotMatch(await text(page, "#resumo"), /Baunilha/);
  // Kit Variedade (4×250g)
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  assert.equal(await page.locator("#montar .slot").count(), 4);
  assert.match(await text(page, "#montar [data-progress]"), /1 de 4 sabores escolhidos/, "o sabor do pacote avulso vira o Pacote 1");
  await page.locator('#montar .slot[data-slot="0"]').click();
  await pickFlavors(page, ["caramelo"]);
  assert.match(await text(page, "#montar [data-progress]"), /1 de 4 sabores escolhidos/);
  const card = page.locator('#montar .flavor[data-flavor="caramelo"]');
  assert.equal(await card.getAttribute("aria-pressed"), "true");
  assert.equal(await text(page, '#montar .flavor[data-flavor="caramelo"] .flavor__count'), "✓");
  assert.match(await text(page, '#montar .slot[data-slot="0"]'), /PACOTE 1 Caramelo/);
  // Repetir com o atalho "Usar Caramelo nos 3 pacotes restantes"
  assert.match(await text(page, "#montar [data-tools]"), /Usar Caramelo nos 3 pacotes restantes/);
  await page.locator('#montar [data-action="repeat"]').click();
  assert.match(await text(page, "#montar [data-progress]"), /Seu kit está pronto ✓/);
  assert.equal(await text(page, '#montar .flavor[data-flavor="caramelo"] .flavor__count'), "4×");
  assert.match(await text(page, "#resumo"), /4× Caramelo 250g/);
  // Trocar o pacote 2
  await page.locator('#montar .slot[data-slot="1"]').click();
  assert.match(await text(page, "#montar [data-ask]"), /Escolha o sabor do Pacote 2/);
  await pickFlavors(page, ["bourbon"]);
  assert.match(await text(page, '#montar .slot[data-slot="1"]'), /Bourbon/);
  assert.match(await text(page, "#resumo"), /3× Caramelo 250g 1× Bourbon 250g/);
  assert.equal(await text(page, '#montar .flavor[data-flavor="caramelo"] .flavor__count'), "3×");
  // Kit completo: tocar em outro sabor não troca nada sem escolher o pacote
  await pickFlavors(page, ["espresso"]);
  assert.match(await text(page, "#aviso"), /Seu kit já está completo/);
  assert.deepEqual((await order(page)).order.itens.map((i) => [i.sabor, i.quantidade]), [["Caramelo", 3], ["Bourbon", 1]]);
  await shot(page, "m-kit-pronto");
  await ctx.close();
});

await check("selo 🏅 BLEND PREMIADO só em Bourbon e Espresso", async () => {
  const { ctx, page } = await open(MOBILE);
  const awarded = await page.locator("#montar .flavor:has(.award)").evaluateAll((els) => els.map((e) => e.getAttribute("data-flavor")));
  assert.deepEqual(awarded, ["bourbon", "espresso"]);
  assert.equal(await text(page, '#montar .flavor[data-flavor="bourbon"] .award'), "🏅 BLEND PREMIADO");
  const heights = await page.locator("#montar .flavor").evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().height)))]);
  assert.equal(heights.length, 1, "todos os cards de sabor com a mesma altura: " + heights);
  const fits = await page.locator("#montar .award").evaluateAll((els) => els.every((e) => e.scrollWidth <= e.clientWidth && e.getBoundingClientRect().height < 20));
  assert.ok(fits, "selo cabe em uma linha");
  await page.evaluate(() => document.querySelector('#montar .flavor[data-flavor="bourbon"]').scrollIntoView({ block: "center" }));
  await shot(page, "m-selo");
  await ctx.close();
});

await check("07-09 kit 4×250g: preço, economia e resumo calculados do valor unitário", async () => {
  const { ctx, page } = await open(MOBILE);
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await page.locator('#ofertas .kg [data-offer="4x250"]').click();
  assert.equal(await page.locator("#montar .slot").count(), 4);
  assert.match(await text(page, "#preco"), /🔥 PROMOÇÃO De R\$ 163,60 -57% Por R\$ 69,90 ≈ R\$ 17,47 por pacote Kit Variedade · 4 pacotes de 250g moído · 1kg · Você economiza R\$ 93,70/);
  await pickFlavors(page, ["caramelo", "chocolate-com-avela", "caramelo", "bourbon"]);
  const resumo = await text(page, "#resumo");
  assert.match(resumo, /SEU KIT Kit Variedade — 4×250g moído 2× Caramelo 250g 1× Chocolate com Avelã 250g 1× Bourbon 250g/);
  assert.match(resumo, /Total 1kg \(4 pacotes\) De R\$ 163,60 Por R\$ 69,90 Você economiza R\$ 93,70/);
  assert.match(resumo, /Entrega PAC \(até 10 dias úteis\) GRÁTIS TOTAL R\$ 69,90 🚚 Frete grátis disponível COMPRAR AGORA/);
  await ctx.close();
});

await check("10-11 kit 2×500g e pesos nunca misturados", async () => {
  const { ctx, page } = await open(MOBILE);
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await page.locator('#ofertas .kg [data-offer="4x250"]').click();
  await pickFlavors(page, ["espresso", "baunilha", "caramelo"]);
  await page.locator('#ofertas .kg [data-offer="2x500"]').click();
  assert.equal(await page.locator("#montar .slot").count(), 2);
  const metas = await page.locator("#montar .flavor__meta").allInnerTexts();
  assert.deepEqual(metas, ["500g", "500g"], "500g: só Bourbon e Espresso");
  // Baunilha não existe em 500g: o 2º pacote fica para escolher
  assert.match(await text(page, "#montar [data-progress]"), /1 de 2 sabores escolhidos/);
  await pickFlavors(page, ["bourbon"]);
  assert.match(await text(page, "#montar [data-progress]"), /Seu kit está pronto ✓/);
  const result = await order(page);
  assert.equal(result.order.tipoKit, "2x500g");
  assert.equal(result.order.kit.moagem, "em grãos");
  assert.ok(result.order.itens.every((i) => i.peso === 500));
  assert.deepEqual(result.order.itens.map((i) => i.sabor), ["Espresso", "Bourbon"]);
  // Volta para 4×250g: o 3º sabor guardado volta
  await page.locator('#ofertas .kg [data-offer="4x250"]').click();
  assert.match(await text(page, "#montar [data-progress]"), /3 de 4 sabores escolhidos/);
  assert.match(await text(page, "#resumo"), /1× Espresso 250g 1× Bourbon 250g 1× Caramelo 250g/);
  assert.ok((await page.locator("#montar .flavor__meta").allInnerTexts()).every((m) => m === "250g"));
  await ctx.close();
});

await check("12-14 entrega: PAC grátis padrão, SEDEX + R$ 15,00 e total atualizado sem recarregar", async () => {
  const { ctx, page } = await open(MOBILE);
  await page.evaluate(() => (window.__semRecarregar = true));
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await pickFlavors(page, ["caramelo", "caramelo", "bourbon", "espresso"]);
  assert.equal(await page.locator('#entrega input[value="pac"]').isChecked(), true);
  assert.match(await text(page, '#entrega label:has(input[value="pac"])'), /PAC — GRÁTIS 🚚 FRETE GRÁTIS Até 10 dias úteis R\$ 0,00/);
  assert.match(await text(page, '#entrega label:has(input[value="sedex"])'), /SEDEX — MAIS RÁPIDO ⚡ RECEBA MAIS RÁPIDO Até 5 dias úteis \+ R\$ 15,00/);
  await page.locator('#entrega label:has(input[value="sedex"])').click();
  assert.match(await text(page, "#resumo"), /Entrega SEDEX \(até 5 dias úteis\) \+ R\$ 15,00 TOTAL R\$ 84,90/);
  assert.equal(await text(page, "[data-bar-value]"), "R$ 84,90");
  assert.match(await text(page, "[data-bar-sub]"), /com SEDEX \(\+ R\$ 15,00\)/);
  await page.locator('#entrega label:has(input[value="pac"])').click();
  assert.match(await text(page, "#resumo"), /TOTAL R\$ 69,90/);
  assert.equal(await text(page, "[data-bar-value]"), "R$ 69,90");
  assert.equal(await page.evaluate(() => window.__semRecarregar), true, "a página não pode recarregar");
  await ctx.close();
});

await check("15 barra fixa: aparece de início, some no botão principal, volta depois e muda de estado", async () => {
  const { ctx, page } = await open(MOBILE);
  assert.ok(await barVisible(page));
  await page.locator("[data-bar-btn]").click();
  await page.waitForTimeout(700);
  const builderTop = await page.evaluate(() => document.getElementById("montar").getBoundingClientRect().top);
  assert.ok(Math.abs(builderTop) < 80, "ESCOLHER SABOR rola até a escolha do sabor (top=" + builderTop + ")");
  assert.match(await text(page, "#aviso"), /Escolha o sabor do seu café/);
  await page.locator("#cta-principal").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  assert.equal(await barVisible(page), false, "barra some quando o botão principal está na tela");
  await page.evaluate(() => window.scrollTo(0, document.getElementById("avaliacoes").offsetTop));
  await page.waitForTimeout(400);
  assert.ok(await barVisible(page), "barra volta depois do botão principal");
  // Kit de 1kg: a barra pede os sabores que faltam e vira COMPRAR AGORA com o kit pronto
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await page.evaluate(() => window.scrollTo(0, document.getElementById("avaliacoes").offsetTop));
  await page.waitForTimeout(400);
  assert.equal(await text(page, "[data-bar-btn]"), "ESCOLHER SABORES");
  assert.equal(await text(page, "[data-bar-value]"), "R$ 69,90");
  await pickFlavors(page, ["caramelo", "bourbon", "espresso", "baunilha"]);
  await page.evaluate(() => window.scrollTo(0, document.getElementById("avaliacoes").offsetTop));
  await page.waitForTimeout(400);
  assert.equal(await text(page, "[data-bar-btn]"), "COMPRAR AGORA");
  assert.match(await text(page, "[data-bar-sub]"), /PAC grátis/);
  await shot(page, "m-barra-pronta");
  await page.locator("[data-bar-btn]").click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator("#carrinho").isVisible(), true, "COMPRAR AGORA abre o carrinho");
  assert.equal(await barVisible(page), false, "barra escondida com o carrinho aberto");
  await ctx.close();
});

await check("16 CTAs: sugestão, comparação de kits, ver avaliações e botão principal incompleto", async () => {
  const { ctx, page } = await open(MOBILE);
  assert.match(await text(page, "#ofertas .nudge"), /Por \+ R\$ 40,00 leve 4 pacotes \(1kg\): ≈ R\$ 17,47 cada\./);
  await page.locator('#ofertas label:has(input[value="1x500"])').click();
  assert.match(await text(page, "#ofertas .nudge"), /Por \+ R\$ 30,00 leve 2 pacotes \(1kg\): R\$ 34,95 cada\./);
  await page.locator('#ofertas label:has(input[value="1x250"])').click();
  await page.locator("#ofertas .nudge button").click();
  assert.equal(await text(page, "#preco .price__value"), "R$ 69,90");
  assert.equal(await page.locator("#montar .slot").count(), 4);
  // Comparação: ESCOLHER SABORES → 2×500g e rola até o kit
  await page.locator('#kits [data-offer="2x500"]').click();
  await page.waitForTimeout(700);
  assert.equal(await page.locator("#montar .slot").count(), 2);
  assert.ok(Math.abs(await page.evaluate(() => document.getElementById("montar").getBoundingClientRect().top)) < 80);
  await page.locator('#kits [data-offer="4x250"]').click();
  assert.equal(await page.locator("#montar .slot").count(), 4);
  // Botão principal incompleto guia até o pacote que falta
  await page.locator("#cta-principal").click();
  await page.waitForTimeout(600);
  assert.match(await text(page, "#cta-principal"), /ESCOLHA MAIS 4 SABORES/);
  assert.match(await text(page, "#aviso"), /Escolha o sabor do Pacote 1/);
  // Ver avaliações rola até a seção
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#info [data-action="go-reviews"]').click();
  await page.waitForTimeout(900);
  const top = await page.evaluate(() => document.getElementById("avaliacoes").getBoundingClientRect().top);
  assert.ok(Math.abs(top) < 60, "Ver avaliações rola até a seção (top=" + top + ")");
  await ctx.close();
});

await check("17-18 carrinho e resumo antes do checkout (editar, trocar kit, entrega, remover)", async () => {
  const { ctx, page } = await open(MOBILE);
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await pickFlavors(page, ["caramelo", "chocolate-com-avela", "caramelo", "bourbon"]);
  await page.locator("#cta-principal").click();
  await page.waitForTimeout(300);
  const cart = await text(page, "#carrinho");
  assert.match(cart, /SEU PEDIDO Kit Variedade — 4×250g moído Total: 1kg · 4 pacotes de 250g 2× Caramelo 250g 1× Chocolate com Avelã 250g 1× Bourbon 250g/);
  assert.match(cart, /R\$ 163,60 R\$ 69,90 Editar sabores/);
  assert.match(cart, /Preço normal \(4 pacotes\) R\$ 163,60 Desconto da promoção - R\$ 93,70 Produtos R\$ 69,90 Entrega PAC GRÁTIS Prazo até 10 dias úteis TOTAL R\$ 69,90/);
  assert.match(cart, /FINALIZAR COMPRA/);
  assert.equal(await text(page, "#carrinho-qtd"), "4");
  await shot(page, "m-carrinho");
  // Entrega no carrinho
  await page.locator('#carrinho label:has(input[value="sedex"])').click();
  assert.match(await text(page, "#carrinho"), /Entrega SEDEX R\$ 15,00 Prazo até 5 dias úteis TOTAL R\$ 84,90/);
  assert.equal(await page.locator('#entrega input[value="sedex"]').isChecked(), true, "entrega igual no carrinho e na página");
  // Trocar kit preservando sabores (só aparecem os kits com preço)
  await page.locator('#carrinho [data-action="cart-switch"]').click();
  const chips = await page.locator("#carrinho .switch [data-offer]").evaluateAll((els) => els.map((e) => e.getAttribute("data-offer")));
  assert.deepEqual(chips.sort(), ["1x250", "1x500", "2x500", "4x250"]);
  await page.locator('#carrinho .switch [data-offer="1x250"]').click();
  assert.match(await text(page, "#carrinho .citem"), /1 pacote — 250g moído 1 pacote de 250g 1× Caramelo 250g/);
  assert.match(await text(page, "#carrinho"), /Preço normal \(1 pacote\) R\$ 40,90 Desconto da promoção - R\$ 11,00 Produtos R\$ 29,90 Entrega SEDEX R\$ 15,00 Prazo até 5 dias úteis TOTAL R\$ 44,90/);
  await page.locator('#carrinho .switch [data-offer="4x250"]').click();
  assert.match(await text(page, "#carrinho .citem"), /2× Caramelo 250g 1× Chocolate com Avelã 250g 1× Bourbon 250g/);
  // Editar sabores leva ao Monte seu kit sem perder nada
  await page.locator('#carrinho [data-action="cart-edit"]').click();
  await page.waitForTimeout(700);
  assert.equal(await page.locator("#carrinho").isVisible(), false);
  assert.match(await text(page, "#montar [data-progress]"), /Seu kit está pronto ✓/);
  await page.locator('#montar .slot[data-slot="3"]').click();
  await pickFlavors(page, ["espresso"]);
  // Header abre o carrinho já atualizado
  await page.locator("#btn-carrinho").click();
  await page.waitForTimeout(300);
  assert.match(await text(page, "#carrinho .citem"), /1× Espresso 250g/);
  assert.match(await text(page, "#carrinho"), /TOTAL R\$ 84,90/);
  // Remover
  await page.locator('#carrinho [data-action="cart-remove"]').click();
  assert.match(await text(page, "#carrinho"), /Seu carrinho está vazio/);
  assert.equal(await page.locator("#carrinho-qtd").isVisible(), false);
  await page.locator('#carrinho [data-action="cart-shop"]').click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator("#carrinho").isVisible(), false);
  // Escolhas continuam na página
  assert.match(await text(page, "#resumo"), /2× Caramelo 250g 1× Chocolate com Avelã 250g 1× Espresso 250g/);
  await ctx.close();
});

await check("19-21 avaliações (placeholders): estrutura, X,X/XXX/XX%, EXEMPLO, filtros, fotos e ver todas", async () => {
  const { ctx, page } = await open(MOBILE);
  const head = await text(page, "#avaliacoes .rsum");
  assert.match(head, /X,X\/ 5 .*XXX avaliações/);
  assert.equal((head.match(/XX%/g) || []).length, 5);
  assert.match(await text(page, "#avaliacoes .ph-note"), /Avaliações de EXEMPLO/);
  assert.equal(await page.locator("#avaliacoes .review").count(), 4);
  assert.equal(await page.locator("#avaliacoes .review .tag-ex").count(), 4);
  assert.equal(await page.locator("#avaliacoes .review__verified").count(), 0, "sem 'Compra verificada' nos exemplos");
  await page.locator('#avaliacoes [data-action="reviews-more"]').click();
  assert.equal(await page.locator("#avaliacoes .review").count(), 6);
  await page.locator('#avaliacoes .chip[data-filter="photos"]').click();
  assert.equal(await page.locator("#avaliacoes .review").count(), 3);
  await page.locator('#avaliacoes .chip[data-filter="4"]').click();
  assert.match(await text(page, "#avaliacoes .reviews"), /Nenhuma avaliação com este filtro ainda/);
  await page.locator('#avaliacoes .chip[data-filter="flavor:bourbon"]').click();
  assert.match(await text(page, "#avaliacoes .reviews"), /Bourbon • Kit 2×500g/);
  assert.equal(await page.locator("#avaliacoes .review").count(), 1);
  assert.equal(await page.locator("#avaliacoes .cphotos__item").count(), 4);
  await page.locator("#avaliacoes .cphotos__item").nth(1).click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator("#visualizador").isVisible(), true);
  assert.match(await text(page, "#visualizador [data-lb-count]"), /2 \/ 4/);
  assert.match(await text(page, "#visualizador [data-lb-caption]"), /\[Nome do cliente\] .*EXEMPLO Chocolate com Avelã • Kit 4×250g/);
  // No celular as fotos passam deslizando (setas só no computador)
  assert.equal(await page.locator('#visualizador [data-action="lb-next"]').isVisible(), false);
  await page.evaluate(() => {
    const t = document.querySelector("#visualizador [data-lb-track]");
    t.scrollTo({ left: t.clientWidth * 2, behavior: "instant" });
  });
  await page.waitForTimeout(500);
  assert.match(await text(page, "#visualizador [data-lb-count]"), /3 \/ 4/);
  assert.match(await text(page, "#visualizador [data-lb-caption]"), /Bourbon/);
  await shot(page, "m-lightbox");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#visualizador").isVisible(), false);
  await ctx.close();
});

const REAL_REVIEWS = `var reviews = [
  { name: "Teste A", rating: 5, date: "2026-09-12", flavor: "caramelo", kit: "4x250", size: "250g", verified: true, text: "Texto A", images: ["img/avaliacoes/exemplo-foto-cliente.svg"] },
  { name: "Teste B", rating: 5, date: "2026-09-20", flavor: "Bourbon", kit: "2x500", text: "Texto B" },
  { name: "Teste C", rating: 4, date: "01/08/2026", flavor: "chocolate-com-avela", text: "Texto C", images: ["img/avaliacoes/exemplo-foto-cliente.svg", "img/avaliacoes/exemplo-foto-cliente.svg"] },
  { name: "Teste D", rating: 5, date: "2026-07-03", flavor: "caramelo", text: "Texto D" },
  { name: "Teste E", rating: 3, date: "2026-09-30", flavor: "espresso", text: "Texto E" },
  { name: "Teste F", rating: 5, date: "2026-06-15", flavor: ["caramelo", "baunilha"], text: "Texto F" },
  { name: "Teste G", rating: 4, date: "2026-05-10", flavor: "baunilha", text: "Texto G" },
  { name: "Teste H", rating: 5, date: "2026-04-01", flavor: "bourbon", text: "Texto H" },
];`;

await check("19-20 avaliações reais: média, quantidade e percentuais calculados; filtros e ordem", async () => {
  const { ctx, page } = await open(MOBILE, { reviews: (src) => src.replace("var reviews = [];", REAL_REVIEWS) });
  // 5×5, 2×4, 1×3 → soma 36/8 = 4,5
  assert.match(await text(page, "#avaliacoes .rsum"), /4,5\/ 5 .*8 avaliações 5 estrelas 63% 4 estrelas 25% 3 estrelas 12% 2 estrelas 0% 1 estrela 0%/);
  assert.match(await text(page, "#info .rating"), /4,5 \(8\) Ver avaliações/);
  assert.equal(await page.locator("#avaliacoes .tag-ex").count(), 0);
  assert.equal(await page.locator("#avaliacoes .ph-note").count(), 0);
  assert.match(await text(page, "#avaliacoes .chips"), /Todas \(8\) 5 estrelas \(5\) 4 estrelas \(2\) 3 estrelas \(1\) Com fotos \(2\) Mais recentes Chocolate com Avelã \(1\) Caramelo \(3\) Baunilha \(2\) Bourbon \(2\) Espresso \(1\)/);
  assert.match(await text(page, "#avaliacoes .review"), /Teste A .*Caramelo • Kit 4×250g Compra verificada Texto A 12\/09\/2026/);
  await page.locator('#avaliacoes .chip[data-filter="recent"]').click();
  const names = await page.locator("#avaliacoes .review__name").allInnerTexts();
  assert.deepEqual(names.slice(0, 4), ["Teste E", "Teste B", "Teste A", "Teste C"]);
  await page.locator('#avaliacoes [data-action="reviews-more"]').click();
  assert.equal(await page.locator("#avaliacoes .review").count(), 8);
  await page.locator('#avaliacoes .rbar[data-filter="4"]').click();
  assert.deepEqual(await page.locator("#avaliacoes .review__name").allInnerTexts(), ["Teste C", "Teste G"]);
  assert.equal(await page.locator("#avaliacoes .cphotos__item").count(), 3, "só as fotos das avaliações cadastradas");
  await shot(page, "m-avaliacoes-reais");
  await ctx.close();
});

await check("19 avaliações: sem reais e sem placeholders, não mostra estrelas nem números", async () => {
  const { ctx, page } = await open(MOBILE, { reviews: (src) => src.replace("showPlaceholders: true", "showPlaceholders: false") });
  assert.equal(await page.locator("#info .rating").count(), 0, "sem estrelas no topo");
  assert.match(await text(page, ".pinfo__social"), /\+7\.000 pacotes vendidos/);
  assert.match(await text(page, "#avaliacoes"), /As avaliações dos clientes aparecem aqui em breve/);
  await ctx.close();
});

await check("22 galeria: deslizar, contador, miniaturas (desktop) e ampliar", async () => {
  const { ctx, page } = await open(MOBILE);
  await page.evaluate(() => {
    const t = document.querySelector("#galeria [data-track]");
    t.scrollTo({ left: t.clientWidth * 2, behavior: "instant" });
  });
  await page.waitForTimeout(400);
  assert.equal(await text(page, "#galeria [data-count]"), "3");
  await page.locator("#galeria .gallery__slide").nth(2).locator("button").click();
  await page.waitForTimeout(300);
  assert.match(await text(page, "#visualizador [data-lb-count]"), /3 \/ 8/);
  await page.locator('#visualizador [data-action="lb-close"]').click();
  await ctx.close();

  const d = await open(DESKTOP);
  await d.page.locator("#galeria .gallery__thumb").nth(4).click();
  await d.page.waitForTimeout(700);
  assert.equal(await d.page.locator("#galeria .gallery__thumb.is-active").getAttribute("data-index"), "4");
  const left = await d.page.evaluate(() => document.querySelector("#galeria [data-track]").scrollLeft);
  assert.ok(left > 0);
  await d.page.locator('#galeria [data-action="gallery-next"]').click({ force: true });
  await d.page.waitForTimeout(700);
  assert.equal(await d.page.locator("#galeria .gallery__thumb.is-active").getAttribute("data-index"), "5");
  const lazy = await d.page.evaluate(() => [...document.querySelectorAll("#galeria .gallery__slide img")].map((i) => i.loading));
  assert.equal(lazy[0], "auto");
  assert.ok(lazy.slice(1).every((l) => l === "lazy"), "fotos seguintes com lazy loading");
  await d.ctx.close();
});

await check("23 copinho de cookie: R$ 9,99 cada, soma no total, carrinho e pedido; sem preço fica em breve", async () => {
  // Sem preço (COOKIE_PRICE = null): "em breve" e fora do pedido
  const a = await open(MOBILE, { config: (src) => src.replace("var COOKIE_PRICE = 9.99;", "var COOKIE_PRICE = null;") });
  assert.match(
    await text(a.page, "#extra"),
    /COMPLETE SEU CAFÉ 🍪 MUMA & BAGGIO Copinho de Cookie sabor Cacau — 68g .* Preço em breve Disponível em breve MUMA & BAGGIO Copinho de Cookie sabor Choco Vanilla — 68g .* Preço em breve Disponível em breve/,
  );
  assert.deepEqual(await a.page.locator("#extra button").evaluateAll((els) => els.map((b) => b.disabled)), [true, true]);
  await a.ctx.close();

  const { ctx, page } = await open(MOBILE);
  assert.match(
    await text(page, "#extra"),
    /Copinho de Cookie sabor Cacau — 68g .* R\$ 9,99 Adicionar ao pedido por \+ R\$ 9,99 .*Copinho de Cookie sabor Choco Vanilla — 68g .* R\$ 9,99 Adicionar ao pedido por \+ R\$ 9,99$/,
  );
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await pickFlavors(page, ["caramelo", "caramelo", "caramelo", "caramelo"]);
  await page.locator('#extra [data-extra="copinho-cookie-cacau"][data-action="extra-add"]').click();
  assert.match(await text(page, "#resumo"), /1× Copinho de Cookie sabor Cacau — 68g \+ R\$ 9,99 .* Extras \+ R\$ 9,99 .* TOTAL R\$ 79,89/);
  await page.locator('#extra [data-extra="copinho-cookie-cacau"][data-action="extra-inc"]').click();
  assert.match(await text(page, "#resumo"), /TOTAL R\$ 89,88/);
  await page.locator('#extra [data-extra="copinho-cookie-cacau"][data-action="extra-dec"]').click();
  assert.match(await text(page, "#resumo"), /TOTAL R\$ 79,89/);
  assert.equal(await text(page, "[data-bar-value]"), "R$ 79,89");
  await page.locator("#cta-principal").click();
  await page.waitForTimeout(300);
  assert.match(await text(page, "#carrinho"), /Preço normal \(4 pacotes \+ extras\) R\$ 173,59 Desconto da promoção - R\$ 93,70 Produtos R\$ 79,89/);
  assert.equal(await text(page, "#carrinho-qtd"), "5");
  const o = (await order(page)).order;
  assert.deepEqual(o.extras, [{ id: "copinho-cookie-cacau", nome: "Copinho de Cookie sabor Cacau — 68g", preco: 9.99, quantidade: 1, total: 9.99 }]);
  assert.equal(o.total, 79.89);
  await shot(page, "m-carrinho-cookie");
  // No carrinho, o outro sabor aparece como sugestão (o título "COMPLETE SEU CAFÉ" uma vez só)
  assert.match(await text(page, "#carrinho"), /Copinho de Cookie sabor Cacau — 68g R\$ 9,99 .* COMPLETE SEU CAFÉ 🍪 Copinho de Cookie sabor Choco Vanilla — 68g Adicionar ao pedido por \+ R\$ 9,99/);
  await page.locator('#carrinho [data-extra="copinho-cookie-cacau"][data-action="extra-remove"]').click();
  assert.equal(await page.locator("#carrinho .cextra__title").count(), 1);
  assert.match(await text(page, "#carrinho"), /COMPLETE SEU CAFÉ 🍪.*Adicionar ao pedido por \+ R\$ 9,99/);
  assert.match(await text(page, "#carrinho"), /TOTAL R\$ 69,90/);
  const ev = await events(page);
  assert.ok(ev.includes("add_upsell"));
  await ctx.close();
});

await check("23 biscoito xícara nos dois sabores do site (Cacau e Choco Vanilla): um card por sabor, cada um soma no pedido", async () => {
  const { ctx, page } = await open(MOBILE);
  assert.equal(await page.locator("#extra .extra").count(), 2);
  assert.match(await text(page, "#extra"), /Copinho de Cookie sabor Cacau — 68g .* Copinho de Cookie sabor Choco Vanilla — 68g/);
  assert.deepEqual(await page.locator("#extra .extra img").evaluateAll((els) => els.map((i) => i.alt)), ["Copinho de Cookie sabor Cacau — 68g", "Copinho de Cookie sabor Choco Vanilla — 68g"]);
  await page.locator('#extra [data-extra="copinho-cookie-cacau"][data-action="extra-add"]').click();
  await page.locator('#extra [data-extra="copinho-cookie-choco-vanilla"][data-action="extra-add"]').click();
  await page.locator('#extra [data-extra="copinho-cookie-choco-vanilla"][data-action="extra-inc"]').click();
  assert.match(await text(page, "#resumo"), /1× Copinho de Cookie sabor Cacau — 68g \+ R\$ 9,99 2× Copinho de Cookie sabor Choco Vanilla — 68g \+ R\$ 19,98/);
  assert.match(await text(page, "#resumo"), /Extras \+ R\$ 29,97 .* TOTAL R\$ 59,87/);
  await pickFlavors(page, ["bourbon"]);
  await page.locator("#cta-principal").click();
  await page.waitForTimeout(300);
  assert.equal(await text(page, "#carrinho-qtd"), "4");
  assert.equal(await page.locator("#carrinho .cextra__title").count(), 0, "sem sugestão quando os dois já estão no pedido");
  const o = (await order(page)).order;
  assert.deepEqual(o.extras.map((e) => [e.id, e.quantidade, e.total]), [["copinho-cookie-cacau", 1, 9.99], ["copinho-cookie-choco-vanilla", 2, 19.98]]);
  assert.equal(o.total, 59.87);
  await page.locator('#carrinho [data-extra="copinho-cookie-cacau"][data-action="extra-remove"]').click();
  assert.match(await text(page, "#carrinho"), /TOTAL R\$ 49,88/);
  assert.equal((await order(page)).order.extras.length, 1);
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

await check("24 checkout (demonstração): valida, preserva tudo e monta o objeto do pedido", async () => {
  const { ctx, page } = await open(MOBILE);
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await pickFlavors(page, ["caramelo", "bourbon", "caramelo", "chocolate-com-avela"]);
  await page.locator('#entrega label:has(input[value="sedex"])').click();
  await page.locator("#cta-principal").click();
  await page.locator('#carrinho [data-action="checkout"]').click();
  await page.waitForTimeout(300);
  const done = await text(page, "#carrinho");
  assert.match(done, /Pedido pronto para o pagamento Pedido BG-\d{6}-[A-Z0-9]{4}/);
  assert.match(done, /Kit Variedade — 4×250g moído 2× Caramelo 250g 1× Bourbon 250g 1× Chocolate com Avelã 250g Produtos R\$ 69,90 Entrega SEDEX R\$ 15,00 Prazo até 5 dias úteis TOTAL R\$ 84,90/);
  const last = await page.evaluate(() => window.BaggioStore.lastOrder);
  assert.equal(last.tipoKit, "4x250g");
  assert.deepEqual(last.itens.map((i) => [i.sabor, i.peso, i.quantidade]), [["Caramelo", 250, 2], ["Bourbon", 250, 1], ["Chocolate com Avelã", 250, 1]]);
  assert.deepEqual(last.shipping, { id: "sedex", method: "SEDEX", price: 15, estimatedDays: 5 });
  assert.equal(last.kit.preco, 69.9);
  assert.equal(last.kit.precoNormal, 163.6);
  assert.equal(last.kit.economia, 93.7);
  assert.equal(last.subtotal, 69.9);
  assert.equal(last.total, 84.9);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("baggio:ultimo-pedido")));
  assert.deepEqual(stored, last);
  await shot(page, "m-checkout-demo");
  await page.locator('#carrinho [data-action="demo-back"]').click();
  assert.match(await text(page, "#carrinho"), /FINALIZAR COMPRA/);
  await ctx.close();
});

await check("24 checkout externo (modo link) leva o pedido nos parâmetros", async () => {
  const { ctx, page } = await open(MOBILE, {
    config: (src) => src.replace('mode: "demo",\n    url: "",', 'mode: "link",\n    url: "https://checkout.exemplo.test/pagar?loja=baggio",'),
  });
  let requested = "";
  await ctx.route("https://checkout.exemplo.test/**", (route) => {
    requested = route.request().url();
    route.fulfill({ contentType: "text/html", body: "<h1>checkout</h1>" });
  });
  await page.locator("#ofertas label:has(input[value='1x250'])").click();
  await pickFlavors(page, ["espresso"]);
  await page.locator("#cta-principal").click();
  await page.locator('#carrinho [data-action="checkout"]').click();
  await page.waitForURL(/checkout\.exemplo\.test/);
  const u = new URL(requested);
  assert.equal(u.searchParams.get("loja"), "baggio");
  assert.equal(u.searchParams.get("kit"), "1x250");
  assert.equal(u.searchParams.get("sabores"), "espresso:1");
  assert.equal(u.searchParams.get("frete"), "pac");
  assert.equal(u.searchParams.get("total"), "29.90");
  const data = JSON.parse(Buffer.from(u.searchParams.get("dados").replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  assert.equal(data.itens[0].sabor, "Espresso");
  await ctx.close();
});

await check("24 checkout pelo WhatsApp monta a mensagem do pedido", async () => {
  const { ctx, page } = await open(MOBILE, {
    config: (src) => src.replace('mode: "demo",', 'mode: "whatsapp",').replace('whatsapp: "", // só números com DDI e DDD, ex.: "5511999999999"\n    buildUrl', 'whatsapp: "5511900000000",\n    buildUrl'),
    init: () => {
      window.__opened = [];
      window.open = (u, target, features) => {
        window.__opened.push({ u, target, features });
        return {};
      };
    },
  });
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await page.locator('#ofertas .kg [data-offer="2x500"]').click();
  await pickFlavors(page, ["bourbon", "espresso"]);
  await page.locator("#cta-principal").click();
  await page.locator('#carrinho [data-action="checkout"]').click();
  await page.waitForTimeout(400);
  const opened = await page.evaluate(() => window.__opened);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].features, undefined, "sem noopener (com ele o window.open devolve null e abriria duas vezes)");
  assert.match(page.url(), /index\.html/, "a loja continua aberta na aba atual");
  assert.match(opened[0].u, /^https:\/\/wa\.me\/5511900000000\?text=/);
  const msg = decodeURIComponent(opened[0].u.split("text=")[1]).replace(/\u00a0/g, " ");
  assert.match(msg, /\*Kit Favoritos — 2×500g em grãos \(1kg\)\*\n• 1× Bourbon 500g\n• 1× Espresso 500g/);
  assert.match(msg, /\*Total: R\$ 69,90\*/);
  await ctx.close();
});

await check("24 validação: não chega ao checkout sem todos os sabores", async () => {
  // Trocar de peso pelo carrinho recria os pacotes no peso novo, mantendo os sabores que cabem
  const { ctx, page } = await open(MOBILE);
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await pickFlavors(page, ["espresso", "bourbon", "caramelo", "baunilha"]);
  await page.locator("#cta-principal").click();
  await page.locator('#carrinho [data-action="cart-switch"]').click();
  await page.locator('#carrinho .switch [data-offer="2x500"]').click();
  assert.match(await text(page, "#carrinho .citem"), /Kit Favoritos — 2×500g em grãos .* 1× Espresso 500g 1× Bourbon 500g/);
  assert.equal(await page.locator('#carrinho [data-action="checkout"]').count(), 1);
  await ctx.close();

  // Sem sabores, nem a barra nem o botão principal abrem o carrinho
  const b = await open(MOBILE);
  await b.page.locator("[data-bar-btn]").click();
  await b.page.waitForTimeout(500);
  assert.equal(await b.page.locator("#carrinho").isVisible(), false, "sem sabores não abre o carrinho");
  await b.page.locator("#btn-carrinho").click();
  assert.match(await text(b.page, "#carrinho"), /Seu carrinho está vazio/);
  await b.page.locator('#carrinho [data-action="cart-close"]').first().click();
  // Pacote no carrinho e depois troca para o kit de 4: FINALIZAR vira ESCOLHA MAIS 3 SABORES
  await pickFlavors(b.page, ["caramelo"]);
  await b.page.locator("#cta-principal").click();
  await b.page.locator('#carrinho [data-action="cart-switch"]').click();
  await b.page.locator('#carrinho .switch [data-offer="4x250"]').click();
  assert.match(await text(b.page, "#carrinho"), /1× Caramelo 250g Faltam 3 sabores/);
  assert.equal(await b.page.locator('#carrinho [data-action="checkout"]').count(), 0, "sem FINALIZAR COMPRA com sabor faltando");
  assert.match(await text(b.page, '#carrinho [data-key="checkout-pending"]'), /ESCOLHA MAIS 3 SABORES/);
  await b.page.locator('#carrinho [data-key="checkout-pending"]').click();
  await b.page.waitForTimeout(600);
  assert.equal(await b.page.locator("#carrinho").isVisible(), false);
  assert.match(await text(b.page, "#montar [data-ask]"), /Escolha o sabor do Pacote 2/);
  await b.ctx.close();
});

await check("analytics: eventos preparados (view_item … begin_checkout) e purchase em obrigado.html", async () => {
  const { ctx, page } = await open(MOBILE);
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await pickFlavors(page, ["caramelo", "bourbon", "caramelo", "espresso"]);
  await page.locator('#entrega label:has(input[value="sedex"])').click();
  await page.locator('#extra [data-extra="copinho-cookie-cacau"][data-action="extra-add"]').click();
  await page.evaluate(() => document.getElementById("avaliacoes").scrollIntoView());
  await page.waitForTimeout(400);
  await page.locator("#cta-principal").click();
  await page.locator('#carrinho [data-action="checkout"]').click();
  const ev = await events(page);
  for (const name of ["view_item", "select_offer", "select_flavor", "select_shipping", "add_upsell", "view_reviews", "add_to_cart", "begin_checkout"]) {
    assert.ok(ev.includes(name), "faltou o evento " + name + " em " + ev.join(","));
  }
  const begin = await page.evaluate(() => window.dataLayer.filter((e) => e.event === "begin_checkout").pop());
  assert.equal(begin.ecommerce.value, 94.89);
  assert.equal(begin.ecommerce.items[0].item_id, "4x250");
  assert.equal(begin.ecommerce.items[0].price, 69.9);
  assert.equal(begin.ecommerce.items[1].item_id, "copinho-cookie-cacau");
  // Página de retorno do checkout
  await page.goto(url + "/obrigado.html", { waitUntil: "networkidle" });
  assert.match(await text(page, "#obrigado"), /Pedido recebido! .* Kit Variedade — 4×250g moído 2× Caramelo 250g 1× Bourbon 250g 1× Espresso 250g 1× Copinho de Cookie sabor Cacau — 68g .* TOTAL R\$ 94,89/);
  const purchases = await page.evaluate(() => window.dataLayer.filter((e) => e.event === "purchase"));
  assert.equal(purchases.length, 1);
  assert.equal(purchases[0].ecommerce.value, 94.89);
  assert.equal(purchases[0].ecommerce.items[1].price, 9.99);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => window.dataLayer.filter((e) => e.event === "purchase").length), 0, "purchase só uma vez por pedido");
  await shot(page, "m-obrigado");
  await page.goto(url + "/index.html", { waitUntil: "networkidle" });
  assert.equal(await page.locator("#carrinho-qtd").isVisible(), false, "carrinho volta vazio depois da compra");
  await ctx.close();
});

await check("persistência: recarregar a página mantém kit, sabores, entrega e carrinho; ?kit= abre o kit", async () => {
  const { ctx, page } = await open(MOBILE);
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  await page.locator('#ofertas .kg [data-offer="2x500"]').click();
  await pickFlavors(page, ["espresso", "bourbon"]);
  await page.locator('#entrega label:has(input[value="sedex"])').click();
  await page.locator("#cta-principal").click();
  await page.reload({ waitUntil: "networkidle" });
  assert.match(await text(page, "#resumo"), /1× Espresso 500g 1× Bourbon 500g .* TOTAL R\$ 84,90/);
  assert.equal(await text(page, "#carrinho-qtd"), "2");
  await page.goto(url + "/index.html?kit=4x250", { waitUntil: "networkidle" });
  assert.match(await text(page, "#montar [data-progress]"), /2 de 4 sabores escolhidos/);
  assert.ok(await page.locator('#ofertas input[value="1kg"]').isChecked());
  await ctx.close();
});

await check("acessibilidade básica: teclado nos kits, Esc fecha o carrinho, rótulos", async () => {
  const { ctx, page } = await open(DESKTOP);
  await page.locator('#ofertas input[value="1x500"]').focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.locator('#ofertas input[value="1kg"]').isChecked(), true);
  assert.equal(await page.evaluate(() => document.activeElement.value), "1kg", "foco continua no kit escolhido");
  await page.locator("#btn-carrinho").click();
  await page.waitForTimeout(300);
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  assert.ok(await page.evaluate(() => document.querySelector("#carrinho .sheet__panel").contains(document.activeElement)), "Tab fica dentro do carrinho");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  assert.equal(await page.locator("#carrinho").isVisible(), false);
  const unlabeled = await page.evaluate(
    () => [...document.querySelectorAll("button")].filter((b) => !b.textContent.trim() && !b.getAttribute("aria-label")).length,
  );
  assert.equal(unlabeled, 0, "botões sem nome acessível");
  const noAlt = await page.evaluate(() => [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length);
  assert.equal(noAlt, 0, "imagens sem alt");
  await ctx.close();
});

await check("25 carregamento e performance (celular): peso, requisições, LCP e estabilidade visual", async () => {
  const ctx = await browser.newContext(MOBILE);
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    window.__cls = 0;
    window.__lcp = 0;
    new PerformanceObserver((list) => list.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => list.getEntries().forEach((e) => (window.__lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
  });
  stats.requests.length = 0;
  await page.goto(url + "/index.html", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const res = performance.getEntriesByType("resource");
    const paint = performance.getEntriesByName("first-contentful-paint")[0];
    return {
      fcp: paint && Math.round(paint.startTime),
      lcp: Math.round(window.__lcp),
      cls: Number(window.__cls.toFixed(4)),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      requests: res.length + 1,
      lazyPending: [...document.images].filter((i) => !i.complete).length,
    };
  });
  const bytes = stats.requests.reduce((s, r) => s + r.bytes, 0);
  const isImage = (r) => /\.(webp|jpe?g|png|gif|avif)$/i.test(r.path);
  // Código e textos (HTML, CSS, JS, SVG) comprimidos como as hospedagens entregam; fotos já vêm comprimidas.
  const gz = stats.requests.filter((r) => !isImage(r)).reduce((s, r) => s + (r.missing ? 0 : gzipSync(readFileSync(path.join(ROOT, r.path))).length), 0);
  const imgBytes = stats.requests.filter(isImage).reduce((s, r) => s + r.bytes, 0);
  const main = stats.requests.find((r) => r.path.endsWith("/galeria/01-sabores.webp"));
  const byType = {};
  stats.requests.forEach((r) => {
    const ext = r.path.split(".").pop();
    byType[ext] = (byType[ext] || 0) + r.bytes;
  });
  console.log("    performance (4G lento simulado + CPU 4× mais lenta):", JSON.stringify({ ...perf, kbSemCompressao: Math.round(bytes / 1024), kbCodigoGzip: Math.round(gz / 1024), kbFotos: Math.round(imgBytes / 1024), porTipoKB: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])) }));
  assert.ok(perf.cls < 0.1, "CLS alto: " + perf.cls);
  assert.ok(perf.lcp < 4000, "foto principal demorou para aparecer (LCP): " + perf.lcp);
  assert.ok(gz < 100 * 1024, "código pesado (gzip): " + gz);
  assert.ok(main && main.bytes < 150 * 1024, "foto principal pesada: " + (main && main.bytes));
  assert.ok(imgBytes < 700 * 1024, "fotos pesadas na primeira carga: " + imgBytes);
  assert.equal(stats.requests.filter((r) => r.missing).length, 0, "arquivos faltando: " + JSON.stringify(stats.requests.filter((r) => r.missing)));
  await ctx.close();
});

await check("fotos oficiais (cada peso com a sua foto) e 'Conheça os sabores' com os textos do site oficial", async () => {
  const { ctx, page } = await open(MOBILE);
  // Sem imagens provisórias (só a foto de exemplo das avaliações placeholder continua)
  const srcs = await page.evaluate(() => [...document.images].map((i) => i.getAttribute("src")));
  assert.deepEqual(srcs.filter((s) => s.endsWith(".svg") && !s.includes("exemplo-foto-cliente")), []);
  assert.equal(await page.locator("#galeria img").first().getAttribute("src"), "img/galeria/01-sabores.webp");
  assert.equal(await page.locator("#galeria .gallery__thumb img").first().getAttribute("src"), "img/galeria/01-sabores-mini.webp");
  const img = (id) => page.locator(`#montar .flavor[data-flavor="${id}"] img`).getAttribute("src");
  assert.equal(await img("bourbon"), "img/sabores/bourbon-250g.webp");
  await page.locator('#ofertas label:has(input[value="1x500"])').click();
  assert.equal(await img("bourbon"), "img/sabores/bourbon-500g.webp", "500g usa a foto do pacote de 500g");
  assert.equal(await img("espresso"), "img/sabores/espresso-500g.webp");
  // Selos e seção com os textos oficiais
  assert.equal(await text(page, "#info .pinfo__facts"), "Café especial 100% arábica Torra média");
  assert.equal(await page.locator('.header__nav a[href="#sabores"]').count(), 1);
  assert.equal(await page.locator("#sabores .flavinfo__item").count(), 7);
  const avela = page.locator('#sabores .flavinfo__item[data-flavor="chocolate-com-avela"]');
  assert.equal(await text(page, '#sabores .flavinfo__item[data-flavor="chocolate-com-avela"] summary'), "Chocolate com Avelã Notas: Nozes e castanhas tostadas, chocolate ao leite");
  await avela.locator("summary").click();
  assert.match(nb(await avela.innerText()), /Sabor equilibrado e intensidade média.*Combina com: Sobremesas e finalizações/);
  assert.match(await text(page, '#sabores .flavinfo__item[data-flavor="bourbon"] summary'), /^Bourbon 🏅 BLEND PREMIADO Encorpado, doce, com notas de chocolate\.$/);
  assert.match(await text(page, "#sabores .specs"), /Pacotes de 250g: Café torrado e moído \(moagem média\), nos 7 sabores; pontuação acima de 85 Pacotes de 500g: Bourbon e Espresso em grãos, para moer na hora; pontuação acima de 84 Origem: Mogiana Paulista e Sul de Minas \(Espresso: Cerrado Mineiro\)/);
  assert.match(await text(page, "#sabores .about__source"), /site oficial da Baggio Café/);
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

await check("desktop: layout em duas colunas, galeria fixa e barra com resumo do kit", async () => {
  const { ctx, page } = await open(DESKTOP);
  const g = await page.locator("#galeria").boundingBox();
  const b = await page.locator("#info").boundingBox();
  assert.ok(b.x > g.x + g.width - 1, "informações à direita da galeria");
  assert.ok(await barVisible(page));
  assert.match(await text(page, "[data-bar-kit]"), /^1 pacote — 250g moído — 0 de 1 sabor$/);
  await page.locator('#ofertas label:has(input[value="1kg"])').click();
  assert.match(await text(page, "[data-bar-kit]"), /^Kit Variedade — 4×250g moído — 0 de 4 sabores$/);
  await pickFlavors(page, ["caramelo", "bourbon", "espresso", "caramelo"]);
  assert.match(await text(page, "[data-bar-kit]"), /^Kit Variedade — 4×250g moído — 2× Caramelo, 1× Bourbon, 1× Espresso$/);
  assert.equal(await text(page, "[data-bar-value]"), "R$ 69,90");
  await shot(page, "d-fold");
  await page.locator("#cta-principal").click();
  await page.waitForTimeout(400);
  await shot(page, "d-carrinho");
  const panel = await page.locator("#carrinho .sheet__panel").boundingBox();
  assert.ok(panel.width <= 440 && panel.x > 800, "carrinho como gaveta lateral no desktop");
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────
await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram`);
if (failed.length) process.exit(1);
