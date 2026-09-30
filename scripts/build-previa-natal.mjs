// Gera previa/kit-de-natal.html: a prévia da página de vendas /kit-de-natal em um único arquivo, que abre no
// navegador sem instalar nada. Usa o próprio código da página: o HTML é gerado aqui (React no Node) e, no
// navegador, a mesma página é "hidratada" para a galeria, o carrossel, a barra fixa e os efeitos funcionarem.
// Fontes, estilos (Tailwind compilado) e imagens de /public/images ficam embutidos no arquivo.
// Uso: npm run previa:natal
//      node scripts/build-previa-natal.mjs --fragmento <arquivo>  (sem <html>/<head>/<body>, ex.: Artifacts do Claude)
import tailwindcss from "@tailwindcss/postcss";
import { build } from "esbuild";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previaDir = path.join(root, "previa");
const natalDir = path.join(previaDir, "natal");
const publicDir = path.join(root, "public");
const outFile = path.join(previaDir, "kit-de-natal.html");

// ─── Imagens de /public/images (página e fotos das avaliações) ───────────
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const MIME = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".avif": "image/avif" };
const images = walk(path.join(publicDir, "images"))
  .filter((file) => MIME[path.extname(file).toLowerCase()])
  .map((file) => ({ file, src: "/" + path.relative(publicDir, file).split(path.sep).join("/") }));
// Mesma regra de previa/natal/shims/next-image.tsx
const imageKey = (src) =>
  src
    .replace(/^\/images\//, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/gi, "-");
const imageVars = images
  .map(({ file, src }) => `--img-${imageKey(src)}:url("data:${MIME[path.extname(file).toLowerCase()]};base64,${readFileSync(file).toString("base64")}")`)
  .join(";");

// ─── Código da página (esbuild) ──────────────────────────────────────────
const shims = {
  name: "previa-natal",
  setup(b) {
    b.onResolve({ filter: /^next\/image$/ }, () => ({ path: path.join(natalDir, "shims", "next-image.tsx") }));
    b.onResolve({ filter: /^next\/font\/google$/ }, () => ({ path: path.join(natalDir, "shims", "next-font.ts") }));
    b.onResolve({ filter: /^@\/lib\/natal\/public-files$/ }, () => ({ path: path.join(natalDir, "shims", "public-files.ts") }));
  },
};
const common = {
  bundle: true,
  write: false,
  jsx: "automatic",
  legalComments: "none",
  logLevel: "error",
  tsconfig: path.join(root, "tsconfig.json"),
  loader: { ".css": "empty" },
  plugins: [shims],
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_SITE_URL": '"https://exemplo.com.br"',
    "process.env.NEXT_PUBLIC_SITE_NAME": '"Natal Encantado"',
    "process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME": '""',
    "process.env.NEXT_PUBLIC_COMPANY_CNPJ": '""',
    "process.env.NEXT_PUBLIC_CONTACT_EMAIL": '""',
    "process.env.NEXT_PUBLIC_DPO_EMAIL": '""',
    __NATAL_PUBLIC_FILES__: JSON.stringify(images.map((image) => image.src)),
  },
};

// HTML da página, renderizado no Node
const server = await build({ ...common, entryPoints: [path.join(natalDir, "ssr.tsx")], platform: "node", format: "cjs", target: "node20" });
const tmp = await mkdtemp(path.join(tmpdir(), "previa-natal-"));
let pageHtml;
try {
  const serverFile = path.join(tmp, "ssr.cjs");
  await writeFile(serverFile, server.outputFiles[0].text);
  pageHtml = createRequire(import.meta.url)(serverFile).render();
} finally {
  await rm(tmp, { recursive: true, force: true });
}

// Parte interativa, no navegador
const client = await build({
  ...common,
  entryPoints: [path.join(natalDir, "main.tsx")],
  platform: "browser",
  format: "iife",
  target: ["es2020", "chrome100", "safari15", "firefox100"],
  minify: true,
  charset: "ascii",
});
const script = client.outputFiles[0].text.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");

// ─── Estilos: Tailwind só com as classes da página ───────────────────────
const globals = readFileSync(path.join(root, "app", "globals.css"), "utf8").replace(
  /@import\s+["']tailwindcss["'];/,
  '@import "tailwindcss" source(none);\n@source "../components/natal";\n@source "./kit-de-natal";',
);
const natalCss = readFileSync(path.join(root, "app", "kit-de-natal", "natal.css"), "utf8");
const css = (await postcss([tailwindcss({ optimize: { minify: true } })]).process(`${globals}\n${natalCss}`, { from: path.join(root, "app", "globals.css") })).css;

// ─── Fontes (baixadas do Google Fonts e embutidas; sem internet, a prévia usa o link) ─
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Fraunces:wght@100..900&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";
async function embeddedFonts() {
  const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141 Safari/537.36" };
  const sheet = await (await fetch(FONTS_URL, { headers })).text();
  const latin = sheet.split("/* ").filter((block) => block.startsWith("latin */"));
  const cache = new Map();
  const faces = [];
  for (const block of latin) {
    const face = block.slice(block.indexOf("@font-face"));
    const url = /url\((https:[^)]+)\)/.exec(face)?.[1];
    if (!url) continue;
    if (!cache.has(url)) cache.set(url, Buffer.from(await (await fetch(url)).arrayBuffer()).toString("base64"));
    faces.push(face.replace(url, `data:font/woff2;base64,${cache.get(url)}`));
  }
  if (!faces.length) throw new Error("nenhuma fonte encontrada");
  return `<style>${faces.join("\n")}</style>`;
}
let fonts;
try {
  fonts = await embeddedFonts();
} catch (error) {
  console.warn(`Fontes não embutidas (${error instanceof Error ? error.message : error}): a prévia vai carregá-las do Google Fonts.`);
  fonts = `<link rel="stylesheet" href="${FONTS_URL.replace(/&/g, "&amp;")}" />`;
}

// ─── Arquivo final ───────────────────────────────────────────────────────
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#08251a" />
<meta name="robots" content="noindex" />
<title>Prévia · Kit de Natal Completo</title>
${fonts}
<style>:root{--font-plex:"IBM Plex Sans";--font-fraunces:"Fraunces";color-scheme:light}${css}</style>
<style>:root{${imageVars}}</style>
</head>
<body>
<div id="natal-root">${pageHtml}</div>
<script>${script}</script>
</body>
</html>
`;
await writeFile(outFile, html);
console.log(`previa/kit-de-natal.html gerado (${(html.length / 1024).toFixed(0)} KB)`);

const flag = process.argv.indexOf("--fragmento");
if (flag > 0 && process.argv[flag + 1]) {
  const fragment = html
    .replace(/^<!doctype html>\s*/i, "")
    .replace(/<html[^>]*>\s*/i, "")
    .replace(/<\/?head>\s*/gi, "")
    .replace(/<meta charset="utf-8" \/>\s*/i, "")
    .replace(/<meta name="viewport"[^>]*>\s*/i, "")
    .replace(/<\/?body>\s*/gi, "")
    .replace(/<\/html>\s*$/i, "");
  const target = path.resolve(process.argv[flag + 1]);
  await writeFile(target, fragment);
  console.log(`fragmento gerado em ${target}`);
}
