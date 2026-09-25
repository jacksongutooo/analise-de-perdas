// Gera um PDF simples de uma página, com texto selecionável (fontes padrão Helvetica, WinAnsi).
// Usado apenas nos dados fictícios de demonstração e nos testes; não serve para documentos reais.

export type PdfLine = { text: string; size?: number; bold?: boolean; gap?: number };

const WIN_ANSI: Record<string, number> = { "€": 0x80, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97 };

function encode(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0x3f;
    const byte = WIN_ANSI[ch] ?? ((code >= 0x20 && code < 0x7f) || (code >= 0xa0 && code <= 0xff) ? code : 0x3f);
    const c = String.fromCharCode(byte);
    out += c === "(" || c === ")" || c === "\\" ? `\\${c}` : c;
  }
  return out;
}

export function simplePdf(lines: PdfLine[]): Buffer {
  let y = 800;
  const ops = ["BT"];
  for (const line of lines) {
    const size = line.size ?? 11;
    y -= line.gap ?? Math.round(size * 1.7);
    ops.push(`/${line.bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 56 ${Math.max(40, y)} Tm (${encode(line.text)}) Tj`);
  }
  ops.push("ET");
  const content = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
