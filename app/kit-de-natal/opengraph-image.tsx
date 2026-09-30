import { ImageResponse } from "next/og";
import { formatBRL } from "@/lib/format";
import { KIT, KIT_SAVINGS_CENTS } from "@/lib/natal/products";
import { STORE } from "@/lib/natal/store";

// Imagem exibida quando o link da página é compartilhado (WhatsApp, redes sociais e anúncios).
// Preço e economia vêm de lib/natal/products.ts, então acompanham qualquer mudança de valor.
export const alt = "Kit de Natal Completo: árvore de 1,5 m, pisca-pisca LED e enfeites, em pré-venda com frete grátis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const brl = (cents: number) => formatBRL(cents).replace(/ /g, " ");

const LIGHTS: [number, number][] = [
  [150, 118], [132, 150], [178, 158], [112, 196], [160, 200], [206, 204], [96, 246], [146, 252],
  [196, 256], [240, 250], [80, 300], [128, 306], [180, 310], [230, 306], [272, 296],
];
const BALLS: [number, number, string][] = [
  [165, 132, "#c1272f"], [120, 222, "#e2c47c"], [214, 232, "#c1272f"], [150, 282, "#f8f2e7"], [104, 330, "#c1272f"], [252, 330, "#e2c47c"],
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "64px 80px",
          backgroundImage: "radial-gradient(circle at 78% 45%, #1f5a3d 0%, #0d3627 45%, #08251a 100%)",
          color: "#fdfbf6",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 4, color: "#e2c47c" }}>PRÉ-VENDA ESPECIAL DE NATAL</div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 76, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>Kit de Natal Completo</div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 32, color: "rgba(248,242,231,0.85)" }}>Árvore 1,5 m + Pisca-pisca LED + Enfeites</div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 40 }}>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 700, color: "#eedcaa", lineHeight: 1 }}>{brl(KIT.priceCents)}</div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 26, marginBottom: 6 }}>
              <div
                style={{
                  display: "flex",
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "#c1272f",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {`ECONOMIZE ${brl(KIT_SAVINGS_CENTS)}`}
              </div>
              <div style={{ display: "flex", marginTop: 10, fontSize: 24, fontWeight: 700, color: "#e2c47c", letterSpacing: 1 }}>FRETE GRÁTIS</div>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 44, fontSize: 24, color: "rgba(248,242,231,0.6)" }}>{STORE.name}</div>
        </div>
        <svg width="340" height="440" viewBox="0 0 340 440">
          <circle cx="170" cy="220" r="170" fill="#e2c47c" fillOpacity="0.12" />
          <rect x="158" y="372" width="24" height="44" rx="4" fill="#4a3321" />
          <polygon points="170,70 52,380 288,380" fill="#123f2a" />
          <polygon points="170,70 78,270 262,270" fill="#1a5238" />
          <polygon points="170,70 104,180 236,180" fill="#22643f" />
          {LIGHTS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#fff4d6" />
          ))}
          {BALLS.map(([x, y, color]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="11" fill={color} />
          ))}
          <polygon points="170,30 179,58 208,58 185,75 194,103 170,86 146,103 155,75 132,58 161,58" fill="#e2c47c" />
        </svg>
      </div>
    ),
    size,
  );
}
