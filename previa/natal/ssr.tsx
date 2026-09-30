// Prévia da página /kit-de-natal (previa/kit-de-natal.html), parte do build: gera o HTML da página no Node.
// Gerado por: npm run previa:natal
import { renderToString } from "react-dom/server";
import KitDeNatalPage from "@/app/kit-de-natal/page";

export function render(): string {
  return renderToString(<KitDeNatalPage />);
}
