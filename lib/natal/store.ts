// Dados da loja da página /kit-de-natal (rodapé e perguntas frequentes).
// PREENCHER antes de publicar. Nada aqui foi inventado: campo vazio aparece na página como "a informar".

export const STORE = {
  name: "Natal Encantado",
  /** Razão social */
  legalName: "",
  cnpj: "",
  email: "",
  address: "",
};

/** Links do rodapé. Troque "#" pelo endereço de cada página (ou por mailto:/WhatsApp no atendimento). */
export const STORE_LINKS = {
  atendimento: "#",
  privacidade: "#",
  termos: "#",
  trocas: "#",
  entrega: "#",
  preVenda: "#faq-pre-venda",
  /** Página de rastreamento do pedido, quando a integração estiver disponível (vazio = ainda não disponível). */
  rastreio: "",
};

/** Política de pré-venda definida pela loja. Campo vazio aparece como "a informar". */
export const PRE_SALE = {
  /** Ex.: "a partir de 10/11/2026" */
  shippingStart: "",
  /** Ex.: "até 3 dias úteis após o início dos envios" */
  processingTime: "",
  /** Ex.: "de 5 a 12 dias úteis após a postagem, conforme a região" */
  deliveryEstimate: "",
};

export const NOT_INFORMED = "a informar";
