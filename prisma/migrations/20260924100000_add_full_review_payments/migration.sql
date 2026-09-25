-- Add the payment gate after preliminary review without changing the existing intake flow.
ALTER TYPE "case_status" ADD VALUE 'preliminary_review';
ALTER TYPE "case_status" ADD VALUE 'waiting_payment';
ALTER TYPE "case_status" ADD VALUE 'payment_confirmed';
ALTER TYPE "case_status" ADD VALUE 'full_review';

CREATE TYPE "payment_method" AS ENUM ('pix', 'standard');
CREATE TYPE "payment_status" AS ENUM ('pending', 'processing', 'paid', 'failed', 'expired', 'refunded', 'cancelled');

ALTER TABLE "cases"
  ADD COLUMN "preliminary_index" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "full_review_started_at" TIMESTAMP(3),
  ADD COLUMN "estimated_min_date" TIMESTAMP(3),
  ADD COLUMN "estimated_max_date" TIMESTAMP(3);

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "terms_accepted" BOOLEAN NOT NULL,
  "terms_accepted_at" TIMESTAMP(3) NOT NULL,
  "original_amount" DECIMAL(14,2) NOT NULL,
  "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "final_amount" DECIMAL(14,2) NOT NULL,
  "payment_method" "payment_method" NOT NULL,
  "status" "payment_status" NOT NULL DEFAULT 'pending',
  "transaction_id" TEXT,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_case_id_key" ON "payments"("case_id");
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
