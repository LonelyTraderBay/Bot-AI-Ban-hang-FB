BEGIN;

-- CreateEnum
CREATE TYPE "stocktake_status" AS ENUM ('counting', 'submitted', 'posted', 'cancelled');

-- CreateEnum
CREATE TYPE "stock_transfer_status" AS ENUM ('draft', 'in_transit', 'completed', 'closed_short', 'cancelled');

-- CreateTable
CREATE TABLE "stocktakes" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouse_id" UUID NOT NULL,
    "counted_by" UUID NOT NULL,
    "reviewed_by" UUID,
    "status" "stocktake_status" NOT NULL DEFAULT 'counting',
    "reason" VARCHAR(500) NOT NULL,
    "review_reason" VARCHAR(500),
    "posted_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stocktakes_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "stocktake_lines" (
    "shop_id" UUID NOT NULL,
    "stocktake_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "sku" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL,
    "baseline_version" INTEGER NOT NULL,
    "expected" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL,
    "counted" INTEGER,

    CONSTRAINT "stocktake_lines_pkey" PRIMARY KEY ("shop_id","stocktake_id","variant_id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_warehouse_id" UUID NOT NULL,
    "to_warehouse_id" UUID NOT NULL,
    "status" "stock_transfer_status" NOT NULL DEFAULT 'draft',
    "reason" VARCHAR(500) NOT NULL,
    "discrepancy_reason" VARCHAR(500),
    "dispatched_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "stock_transfer_lines" (
    "shop_id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "sku" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "received" INTEGER NOT NULL DEFAULT 0,
    "missing" INTEGER NOT NULL DEFAULT 0,
    "issued_value" DECIMAL(78,18),

    CONSTRAINT "stock_transfer_lines_pkey" PRIMARY KEY ("shop_id","transfer_id","variant_id")
);

-- CreateIndex
CREATE INDEX "stocktakes_shop_id_created_at_id_idx" ON "stocktakes"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "stocktakes_shop_id_warehouse_id_status_idx" ON "stocktakes"("shop_id", "warehouse_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stocktake_lines_shop_id_stocktake_id_position_key" ON "stocktake_lines"("shop_id", "stocktake_id", "position");

-- CreateIndex
CREATE INDEX "stock_transfers_shop_id_created_at_id_idx" ON "stock_transfers"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "stock_transfers_shop_id_to_warehouse_id_status_idx" ON "stock_transfers"("shop_id", "to_warehouse_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfer_lines_shop_id_transfer_id_position_key" ON "stock_transfer_lines"("shop_id", "transfer_id", "position");

-- AddForeignKey
ALTER TABLE "stocktakes" ADD CONSTRAINT "stocktakes_shop_id_warehouse_id_fkey" FOREIGN KEY ("shop_id", "warehouse_id") REFERENCES "warehouses"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stocktakes" ADD CONSTRAINT "stocktakes_shop_id_counted_by_fkey" FOREIGN KEY ("shop_id", "counted_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stocktakes" ADD CONSTRAINT "stocktakes_shop_id_reviewed_by_fkey" FOREIGN KEY ("shop_id", "reviewed_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stocktake_lines" ADD CONSTRAINT "stocktake_lines_shop_id_stocktake_id_fkey" FOREIGN KEY ("shop_id", "stocktake_id") REFERENCES "stocktakes"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stocktake_lines" ADD CONSTRAINT "stocktake_lines_shop_id_variant_id_fkey" FOREIGN KEY ("shop_id", "variant_id") REFERENCES "variants"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_shop_id_from_warehouse_id_fkey" FOREIGN KEY ("shop_id", "from_warehouse_id") REFERENCES "warehouses"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_shop_id_to_warehouse_id_fkey" FOREIGN KEY ("shop_id", "to_warehouse_id") REFERENCES "warehouses"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_shop_id_transfer_id_fkey" FOREIGN KEY ("shop_id", "transfer_id") REFERENCES "stock_transfers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_shop_id_variant_id_fkey" FOREIGN KEY ("shop_id", "variant_id") REFERENCES "variants"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "stocktakes" ADD CHECK (version > 0 AND length(reason) BETWEEN 5 AND 500
  AND ((status = 'posted' AND posted_at IS NOT NULL AND reviewed_by IS NOT NULL AND review_reason IS NOT NULL)
    OR (status = 'cancelled' AND posted_at IS NULL AND reviewed_by IS NOT NULL AND review_reason IS NOT NULL)
    OR (status IN ('counting','submitted') AND posted_at IS NULL AND reviewed_by IS NULL AND review_reason IS NULL)));
ALTER TABLE "stocktake_lines" ADD CHECK (position >= 0 AND baseline_version > 0
  AND expected >= reserved AND reserved >= 0 AND (counted IS NULL OR counted >= 0));
ALTER TABLE "stock_transfers" ADD CHECK (version > 0 AND from_warehouse_id <> to_warehouse_id AND length(reason) BETWEEN 5 AND 500
  AND ((status = 'draft' AND dispatched_at IS NULL AND closed_at IS NULL AND discrepancy_reason IS NULL)
    OR (status = 'in_transit' AND dispatched_at IS NOT NULL AND closed_at IS NULL AND discrepancy_reason IS NULL)
    OR (status = 'completed' AND dispatched_at IS NOT NULL AND closed_at IS NOT NULL AND closed_at >= dispatched_at AND discrepancy_reason IS NULL)
    OR (status = 'closed_short' AND dispatched_at IS NOT NULL AND closed_at IS NOT NULL AND closed_at >= dispatched_at AND discrepancy_reason IS NOT NULL)
    OR (status = 'cancelled' AND dispatched_at IS NULL AND closed_at IS NOT NULL AND discrepancy_reason IS NULL)));
ALTER TABLE "stock_transfer_lines" ADD CHECK (position >= 0 AND quantity BETWEEN 1 AND 1000000
  AND received >= 0 AND missing >= 0 AND received + missing <= quantity AND (issued_value IS NULL OR issued_value >= 0));

GRANT SELECT, INSERT, UPDATE ON "stocktakes", "stocktake_lines", "stock_transfers", "stock_transfer_lines" TO botsales_runtime;

COMMIT;
