// "next/image" na prévia da página de Natal: um <img> transparente com a imagem de fundo vinda de uma variável
// CSS (--img-<nome>), definida uma única vez no HTML. Assim cada imagem entra no arquivo só uma vez, mesmo
// aparecendo em vários lugares da página, e aparece mesmo sem JavaScript.
import type { CSSProperties, ImgHTMLAttributes } from "react";

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** "/images/reviews/cliente-01.webp" → "reviews-cliente-01" (mesma regra usada no build da prévia). */
export function imageKey(src: string): string {
  return src
    .replace(/^\/images\//, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/gi, "-");
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  width?: number;
  height?: number;
};

export default function Image({ src, alt, fill, priority: _priority, quality: _quality, sizes: _sizes, fetchPriority: _fetch, style, className, width, height, ...rest }: Props) {
  const css: CSSProperties = {
    ...(fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : {}),
    backgroundImage: `var(--img-${imageKey(src)})`,
    backgroundSize: className?.includes("object-contain") ? "contain" : "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    ...style,
  };
  return <img src={BLANK} alt={alt} className={className} style={css} width={fill ? undefined : width} height={fill ? undefined : height} {...rest} />;
}
