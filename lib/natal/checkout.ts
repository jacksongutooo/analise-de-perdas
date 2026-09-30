// Links de checkout da página /kit-de-natal. TODOS os botões de compra usam estas quatro constantes.
// Antes de publicar, troque "#" pelo link de cada produto na plataforma de pagamento.
export const CHECKOUT_KIT = "#";
export const CHECKOUT_ARVORE = "#";
export const CHECKOUT_PISCA = "#";
export const CHECKOUT_ACESSORIOS = "#";

/**
 * Parâmetros de campanha (tráfego pago) que a página repassa para o link de checkout, para a venda
 * continuar atribuída ao anúncio. Só valem para links externos (http/https); "#" e âncoras ficam como estão.
 */
export const CAMPAIGN_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "src",
  "sck",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "ttclid",
  "msclkid",
] as const;

/** Acrescenta ao link de checkout os parâmetros de campanha da URL atual (sem sobrescrever os que o link já tem). */
export function withCampaignParams(href: string, search: string): string {
  if (!/^https?:\/\//i.test(href)) return href;
  const current = new URLSearchParams(search);
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  let changed = false;
  for (const key of CAMPAIGN_PARAMS) {
    const value = current.get(key);
    if (value && !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
      changed = true;
    }
  }
  return changed ? url.toString() : href;
}
