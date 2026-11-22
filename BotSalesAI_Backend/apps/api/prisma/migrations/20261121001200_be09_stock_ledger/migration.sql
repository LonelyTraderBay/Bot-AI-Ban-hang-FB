BEGIN;

-- CreateEnum
CREATE TYPE "stock_movement_kind" AS ENUM ('receipt', 'adjustment', 'reserve', 'release', 'fulfillment', 'return', 'transfer_out', 'transfer_in');

-- CreateEnum
CREATE TYPE "stock_reservation_status" AS ENUM ('active', 'released', 'expired', 'consumed');

-- CreateTable
CREATE TABLE "stock_positions" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouse_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "on_hand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "quarantine" INTEGER NOT NULL DEFAULT 0,
    "transit" INTEGER NOT NULL DEFAULT 0,
    "inbound" INTEGER NOT NULL DEFAULT 0,
    "carrying_value" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_positions_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouse_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "actor_id" UUID NOT NULL,
    "kind" "stock_movement_kind" NOT NULL,
    "source_type" VARCHAR(64) NOT NULL,
    "source_id" UUID NOT NULL,
    "source_line_id" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "reserved_delta" INTEGER NOT NULL,
    "quarantine_delta" INTEGER NOT NULL,
    "transit_delta" INTEGER NOT NULL,
    "inbound_delta" INTEGER NOT NULL,
    "carrying_delta" DECIMAL(78,18) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "order_version" INTEGER NOT NULL,
    "actor_id" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "status" "stock_reservation_status" NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMPTZ(3),

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "stock_reservation_lines" (
    "shop_id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "line_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "stock_reservation_lines_pkey" PRIMARY KEY ("shop_id","reservation_id","line_id")
);

-- CreateIndex
CREATE INDEX "stock_positions_shop_id_variant_id_warehouse_id_idx" ON "stock_positions"("shop_id", "variant_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "stock_positions_shop_id_created_at_id_idx" ON "stock_positions"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_positions_shop_id_warehouse_id_variant_id_key" ON "stock_positions"("shop_id", "warehouse_id", "variant_id");

-- CreateIndex
CREATE INDEX "stock_movements_shop_id_created_at_id_idx" ON "stock_movements"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "stock_movements_shop_id_warehouse_id_variant_id_created_at__idx" ON "stock_movements"("shop_id", "warehouse_id", "variant_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_source_key" ON "stock_movements"("shop_id", "source_type", "source_id", "source_line_id", "kind");

-- CreateIndex
CREATE INDEX "stock_reservations_status_expires_at_shop_id_id_idx" ON "stock_reservations"("status", "expires_at", "shop_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_reservations_shop_id_order_id_order_version_key" ON "stock_reservations"("shop_id", "order_id", "order_version");

-- CreateIndex
CREATE INDEX "stock_reservation_lines_shop_id_warehouse_id_variant_id_idx" ON "stock_reservation_lines"("shop_id", "warehouse_id", "variant_id");

-- AddForeignKey
ALTER TABLE "stock_positions" ADD CONSTRAINT "stock_positions_shop_id_warehouse_id_fkey" FOREIGN KEY ("shop_id", "warehouse_id") REFERENCES "warehouses"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_positions" ADD CONSTRAINT "stock_positions_shop_id_variant_id_fkey" FOREIGN KEY ("shop_id", "variant_id") REFERENCES "variants"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_shop_id_warehouse_id_variant_id_fkey" FOREIGN KEY ("shop_id", "warehouse_id", "variant_id") REFERENCES "stock_positions"("shop_id", "warehouse_id", "variant_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_shop_id_actor_id_fkey" FOREIGN KEY ("shop_id", "actor_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_shop_id_actor_id_fkey" FOREIGN KEY ("shop_id", "actor_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_reservation_lines" ADD CONSTRAINT "stock_reservation_lines_shop_id_reservation_id_fkey" FOREIGN KEY ("shop_id", "reservation_id") REFERENCES "stock_reservations"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_reservation_lines" ADD CONSTRAINT "stock_reservation_lines_shop_id_warehouse_id_variant_id_fkey" FOREIGN KEY ("shop_id", "warehouse_id", "variant_id") REFERENCES "stock_positions"("shop_id", "warehouse_id", "variant_id") ON DELETE RESTRICT ON UPDATE NO ACTION;


ALTER TABLE "stock_positions" ADD CONSTRAINT "stock_positions_nonnegative"
  CHECK (on_hand >= 0 AND reserved BETWEEN 0 AND on_hand AND quarantine >= 0 AND transit >= 0 AND inbound >= 0
    AND low_stock_threshold >= 0 AND carrying_value >= 0 AND (on_hand > 0 OR carrying_value = 0));
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movement_has_delta"
  CHECK (quantity_delta <> 0 OR reserved_delta <> 0 OR quarantine_delta <> 0 OR transit_delta <> 0 OR inbound_delta <> 0);
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movement_reservation_delta"
  CHECK (CASE
    WHEN kind IN ('reserve','release') THEN quantity_delta = 0 AND quarantine_delta = 0 AND transit_delta = 0 AND inbound_delta = 0
      AND carrying_delta = 0 AND (CASE WHEN kind = 'reserve' THEN reserved_delta > 0 ELSE reserved_delta < 0 END)
    WHEN kind = 'fulfillment' AND quantity_delta < 0 THEN reserved_delta = quantity_delta AND transit_delta::bigint = -quantity_delta::bigint
    ELSE reserved_delta = 0
  END);
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservation_settlement"
  CHECK (order_version > 0 AND version > 0 AND (status = 'active') = (settled_at IS NULL));
ALTER TABLE "stock_reservation_lines" ADD CHECK (quantity > 0);
CREATE UNIQUE INDEX "stock_reservations_active_order_key" ON "stock_reservations" (shop_id, order_id) WHERE status = 'active';

INSERT INTO "stock_positions" (shop_id, warehouse_id, variant_id, updated_at)
SELECT s.id, s.default_warehouse_id, v.id, CURRENT_TIMESTAMP
FROM "variants" v JOIN "shops" s ON s.id = v.shop_id WHERE v.archived_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON "stock_positions", "stock_reservations" TO botsales_runtime;
GRANT SELECT, INSERT ON "stock_movements", "stock_reservation_lines" TO botsales_runtime;

COMMIT;
