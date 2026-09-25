// "@prisma/client" na prévia: só os valores usados em tempo de execução (tipos somem no build).
export class PrismaClientKnownRequestError extends Error {
  code: string;
  meta?: Record<string, unknown>;
  clientVersion: string;
  constructor(message: string, opts: { code: string; clientVersion: string; meta?: Record<string, unknown> }) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = opts.code;
    this.meta = opts.meta;
    this.clientVersion = opts.clientVersion;
  }
}

export const Prisma = { PrismaClientKnownRequestError };

export class PrismaClient {
  constructor() {
    throw new Error("Na prévia, o banco é simulado: use @/lib/db.");
  }
}
