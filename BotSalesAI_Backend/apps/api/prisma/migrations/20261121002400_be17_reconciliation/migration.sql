BEGIN;

-- CreateEnum
CREATE TYPE "bank_direction" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "reconciliation_state" AS ENUM ('unmatched', 'suggested', 'matched', 'disputed');

-- CreateEnum
CREATE TYPE "cod_settlement_state" AS ENUM ('pending', 'part_settled', 'matched', 'disputed');

-- CreateEnum
CREATE TYPE "statement_kind" AS ENUM ('bank', 'cod');

-- CreateTable
CREATE TABLE "statement_batches" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "statement_kind" NOT NULL,
    "account_or_carrier_id" UUID NOT NULL,
    "source_batch_id" VARCHAR(200) NOT NULL,
    "format_id" VARCHAR(100) NOT NULL,
    "file_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statement_batches_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "external_transaction_id" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(78,18) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "direction" "bank_direction" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "reference_text" VARCHAR(500) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "reconciliation_cases" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "state" "reconciliation_state" NOT NULL DEFAULT 'unmatched',
    "difference" DECIMAL(78,18) NOT NULL,
    "reason" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reconciliation_cases_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "cod_settlements" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "carrier_id" UUID NOT NULL,
    "external_batch_id" VARCHAR(200) NOT NULL,
    "batch_id" UUID NOT NULL,
    "gross_due" DECIMAL(78,18) NOT NULL,
    "actual_fees" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "bank_received" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL,
    "status" "cod_settlement_state" NOT NULL DEFAULT 'pending',
    "bank_transaction_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cod_settlements_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "cod_settlement_orders" (
    "shop_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "settlement_id" UUID NOT NULL,

    CONSTRAINT "cod_settlement_orders_pkey" PRIMARY KEY ("shop_id","order_id")
);

-- CreateTable
CREATE TABLE "cod_fee_evidence" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settlement_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "reference" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(78,18) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "verified_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cod_fee_evidence_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "settlement_allocations" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "journal_id" UUID NOT NULL,
    "debt_line_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "cod_settlement_id" UUID,
    "order_id" UUID,
    "amount" DECIMAL(78,18) NOT NULL,
    "bank_amount" DECIMAL(78,18) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_allocations_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "collection_applications" (
    "shop_id" UUID NOT NULL,
    "allocation_id" UUID NOT NULL,
    "finance_entry_id" UUID NOT NULL,
    "amount" DECIMAL(78,18) NOT NULL,

    CONSTRAINT "collection_applications_pkey" PRIMARY KEY ("shop_id","allocation_id","finance_entry_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "statement_batches_shop_id_job_id_key" ON "statement_batches"("shop_id", "job_id");

-- CreateIndex
CREATE UNIQUE INDEX "statement_batches_shop_id_kind_account_or_carrier_id_source_key" ON "statement_batches"("shop_id", "kind", "account_or_carrier_id", "source_batch_id");

-- CreateIndex
CREATE INDEX "bank_transactions_shop_id_created_at_id_idx" ON "bank_transactions"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "bank_transactions_shop_id_occurred_at_id_idx" ON "bank_transactions"("shop_id", "occurred_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_shop_id_account_id_external_transaction_i_key" ON "bank_transactions"("shop_id", "account_id", "external_transaction_id");

-- CreateIndex
CREATE INDEX "reconciliation_cases_shop_id_created_at_id_idx" ON "reconciliation_cases"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_cases_shop_id_transaction_id_key" ON "reconciliation_cases"("shop_id", "transaction_id");

-- CreateIndex
CREATE INDEX "cod_settlements_shop_id_created_at_id_idx" ON "cod_settlements"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "cod_settlements_shop_id_carrier_id_external_batch_id_key" ON "cod_settlements"("shop_id", "carrier_id", "external_batch_id");

-- CreateIndex
CREATE INDEX "cod_settlement_orders_shop_id_settlement_id_order_id_idx" ON "cod_settlement_orders"("shop_id", "settlement_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "cod_fee_evidence_shop_id_settlement_id_transaction_id_key" ON "cod_fee_evidence"("shop_id", "settlement_id", "transaction_id");

-- CreateIndex
CREATE INDEX "settlement_allocations_shop_id_debt_line_id_idx" ON "settlement_allocations"("shop_id", "debt_line_id");

-- CreateIndex
CREATE INDEX "settlement_allocations_shop_id_order_id_idx" ON "settlement_allocations"("shop_id", "order_id");

-- CreateIndex
CREATE INDEX "settlement_allocations_shop_id_transaction_id_idx" ON "settlement_allocations"("shop_id", "transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_allocations_shop_id_journal_id_debt_line_id_key" ON "settlement_allocations"("shop_id", "journal_id", "debt_line_id");

-- CreateIndex
CREATE INDEX "collection_applications_shop_id_finance_entry_id_idx" ON "collection_applications"("shop_id", "finance_entry_id");

-- AddForeignKey
ALTER TABLE "statement_batches" ADD CONSTRAINT "statement_batches_shop_id_file_id_fkey" FOREIGN KEY ("shop_id", "file_id") REFERENCES "file_objects"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "statement_batches" ADD CONSTRAINT "statement_batches_shop_id_job_id_fkey" FOREIGN KEY ("shop_id", "job_id") REFERENCES "jobs"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_shop_id_account_id_fkey" FOREIGN KEY ("shop_id", "account_id") REFERENCES "finance_accounts"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_shop_id_batch_id_fkey" FOREIGN KEY ("shop_id", "batch_id") REFERENCES "statement_batches"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reconciliation_cases" ADD CONSTRAINT "reconciliation_cases_shop_id_transaction_id_fkey" FOREIGN KEY ("shop_id", "transaction_id") REFERENCES "bank_transactions"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cod_settlements" ADD CONSTRAINT "cod_settlements_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cod_settlements" ADD CONSTRAINT "cod_settlements_shop_id_batch_id_fkey" FOREIGN KEY ("shop_id", "batch_id") REFERENCES "statement_batches"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cod_settlements" ADD CONSTRAINT "cod_settlements_shop_id_bank_transaction_id_fkey" FOREIGN KEY ("shop_id", "bank_transaction_id") REFERENCES "bank_transactions"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cod_settlement_orders" ADD CONSTRAINT "cod_settlement_orders_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "sales_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cod_settlement_orders" ADD CONSTRAINT "cod_settlement_orders_shop_id_settlement_id_fkey" FOREIGN KEY ("shop_id", "settlement_id") REFERENCES "cod_settlements"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cod_fee_evidence" ADD CONSTRAINT "cod_fee_evidence_shop_id_settlement_id_fkey" FOREIGN KEY ("shop_id", "settlement_id") REFERENCES "cod_settlements"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cod_fee_evidence" ADD CONSTRAINT "cod_fee_evidence_shop_id_transaction_id_fkey" FOREIGN KEY ("shop_id", "transaction_id") REFERENCES "bank_transactions"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settlement_allocations" ADD CONSTRAINT "settlement_allocations_shop_id_journal_id_fkey" FOREIGN KEY ("shop_id", "journal_id") REFERENCES "finance_journals"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settlement_allocations" ADD CONSTRAINT "settlement_allocations_shop_id_debt_line_id_fkey" FOREIGN KEY ("shop_id", "debt_line_id") REFERENCES "finance_journal_lines"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settlement_allocations" ADD CONSTRAINT "settlement_allocations_shop_id_transaction_id_fkey" FOREIGN KEY ("shop_id", "transaction_id") REFERENCES "bank_transactions"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settlement_allocations" ADD CONSTRAINT "settlement_allocations_shop_id_cod_settlement_id_fkey" FOREIGN KEY ("shop_id", "cod_settlement_id") REFERENCES "cod_settlements"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settlement_allocations" ADD CONSTRAINT "settlement_allocations_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "sales_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "collection_applications" ADD CONSTRAINT "collection_applications_shop_id_allocation_id_fkey" FOREIGN KEY ("shop_id", "allocation_id") REFERENCES "settlement_allocations"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "collection_applications" ADD CONSTRAINT "collection_applications_shop_id_finance_entry_id_fkey" FOREIGN KEY ("shop_id", "finance_entry_id") REFERENCES "finance_entries"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "statement_batches" ADD CHECK (length(source_batch_id) > 0 AND length(format_id) > 0);
ALTER TABLE "bank_transactions" ADD CHECK (version > 0 AND amount > 0 AND length(external_transaction_id) > 0 AND currency ~ '^[A-Z]{3}$');
ALTER TABLE "reconciliation_cases" ADD CHECK (version > 0 AND difference >= 0 AND ((state = 'matched') = (difference = 0)));
ALTER TABLE "cod_settlements" ADD CHECK (version > 0 AND gross_due > 0 AND actual_fees >= 0 AND bank_received >= 0
  AND actual_fees + bank_received <= gross_due AND currency ~ '^[A-Z]{3}$'
  AND (status <> 'matched' OR (bank_transaction_id IS NOT NULL AND actual_fees + bank_received = gross_due)));
ALTER TABLE "cod_fee_evidence" ADD CHECK (amount >= 0 AND length(reference) > 0 AND currency ~ '^[A-Z]{3}$');
ALTER TABLE "settlement_allocations" ADD CHECK (amount > 0 AND bank_amount >= 0 AND bank_amount <= amount
  AND (cod_settlement_id IS NOT NULL OR bank_amount = amount));
ALTER TABLE "collection_applications" ADD CHECK (amount > 0);

GRANT SELECT, INSERT ON "statement_batches", "cod_settlement_orders", "settlement_allocations",
  "collection_applications" TO botsales_runtime;
GRANT SELECT, INSERT, UPDATE ON "bank_transactions", "reconciliation_cases", "cod_settlements" TO botsales_runtime;
GRANT SELECT ON "cod_fee_evidence" TO botsales_runtime;

COMMIT;
