// Prévia da página /kit-de-natal (previa/kit-de-natal.html), parte do navegador: liga a galeria, o carrossel,
// a barra fixa e os efeitos sobre o HTML já pronto. Gerado por: npm run previa:natal
import { hydrateRoot } from "react-dom/client";
import KitDeNatalPage from "@/app/kit-de-natal/page";

const container = document.getElementById("natal-root");
if (container) hydrateRoot(container, <KitDeNatalPage />);
