export type ConfirmationEmail = {
  to: string;
  subject: string;
  text: string;
};

/** Adapter sem provedor: o gateway de e-mail pode ser conectado aqui sem mudar o fluxo. */
export async function sendEmail(_message: ConfirmationEmail): Promise<void> {
  return;
}

export function resultAvailableEmail(input: { to: string; protocol: string; resultUrl: string }): ConfirmationEmail {
  return {
    to: input.to,
    subject: `Atualização disponível — Protocolo ${input.protocol}`,
    text: `Uma atualização está disponível para sua análise.\n\nAcesse com segurança: ${input.resultUrl}`,
  };
}
