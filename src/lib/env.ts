// Configuração lida das variáveis de ambiente (uso exclusivo no servidor).

function bool(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function int(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export const config = {
  demoMode: bool(process.env.DEMO_MODE),
  reviewDays: int(process.env.REVIEW_DAYS, 15, 1, 90),
  maxUploadMb: int(process.env.MAX_UPLOAD_MB, 4, 1, 100),
  maxFilesPerCase: int(process.env.MAX_FILES_PER_CASE, 40, 1, 200),
  draftTtlDays: int(process.env.DRAFT_TTL_DAYS, 7, 1, 30),
  storageDriver: (process.env.STORAGE_DRIVER ?? "").trim().toLowerCase() === "s3" ? ("s3" as const) : ("local" as const),
  storageLocalDir: process.env.STORAGE_LOCAL_DIR?.trim() || ".storage",
  s3: {
    bucket: process.env.S3_BUCKET?.trim() ?? "",
    region: process.env.S3_REGION?.trim() || "auto",
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim() ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim() ?? "",
    forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE),
  },
  cronSecret: process.env.CRON_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
};

export function maxUploadBytes(): number {
  return config.maxUploadMb * 1024 * 1024;
}

export function authSecret(): string {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET ausente ou curto demais (mínimo de 32 caracteres). Configure o arquivo .env.");
  }
  return secret;
}
