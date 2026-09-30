// Uso exclusivo no servidor: confere se um arquivo existe em /public (ex.: foto de uma avaliação).
// A página é gerada de forma estática, então a conferência acontece no build.
import { existsSync } from "node:fs";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

export function publicFileExists(src: string): boolean {
  if (!src.startsWith("/") || src.includes("..") || src.includes("\\")) return false;
  const file = path.join(PUBLIC_DIR, src);
  return file.startsWith(PUBLIC_DIR + path.sep) && existsSync(file);
}
