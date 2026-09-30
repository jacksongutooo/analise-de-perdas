// lib/natal/public-files.ts na prévia: a lista de arquivos de /public vem do build (scripts/build-previa-natal.mjs).
declare const __NATAL_PUBLIC_FILES__: string[];

export function publicFileExists(src: string): boolean {
  return __NATAL_PUBLIC_FILES__.includes(src);
}
