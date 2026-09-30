// "next/font/google" na prévia da página de Natal: as fontes vêm embutidas no HTML da prévia e as variáveis
// --font-plex e --font-fraunces são definidas lá.
const font = (family: string) => () => ({ className: "", variable: "", style: { fontFamily: `'${family}'` } });

export const IBM_Plex_Sans = font("IBM Plex Sans");
export const Fraunces = font("Fraunces");
