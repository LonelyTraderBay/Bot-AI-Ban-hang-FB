BEGIN;

-- CreateEnum
CREATE TYPE "shipment_state" AS ENUM ('planned', 'handed_over', 'in_transit', 'delivered', 'failed', 'returning', 'returned', 'cancelled');

-- CreateEnum
CREATE TYPE "return_state" AS ENUM ('awaiting_goods', 'inspected');

-- CreateEnum
CREATE TYPE "return_disposition" AS ENUM ('pending', 'sellable', 'damaged', 'quarantined');

-- CreateTable
CREATE TABLE "shipments" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "carrier_id" UUID,
    "tracking_code" VARCHAR(160),
    "shipping_fee_quote" DECIMAL(78,18),
    "shipping_fee_actual" DECIMAL(78,18),
    "currency" VARCHAR(3) NOT NULL,
    "state" "shipment_state" NOT NULL DEFAULT 'planned',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "handed_over_at" TIMESTAMPTZ(3),
    "delivered_at" TIMESTAMPTZ(3),
    "last_event_at" TIMESTAMPTZ(3),

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "shipment_lines" (
    "shop_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "order_line_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cost_value" DECIMAL(78,18) NOT NULL DEFAULT 0,

    CONSTRAINT "shipment_lines_pkey" PRIMARY KEY ("shop_id","shipment_id","order_line_id")
);

-- CreateTable
CREATE TABLE "shipment_observations" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_id" UUID NOT NULL,
    "external_event_id" VARCHAR(160) NOT NULL,
    "state" "shipment_state" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shipment_observations_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "shop_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "external_event_id" VARCHAR(160) NOT NULL,
    "state" "shipment_state" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "observation_id" UUID,
    "applied" BOOLEAN NOT NULL,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("shop_id","shipment_id","external_event_id")
);

-- CreateTable
CREATE TABLE "order_returns" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "state" "return_state" NOT NULL DEFAULT 'awaiting_goods',
    "reason" VARCHAR(1000) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "refund_obligation" DECIMAL(78,18),
    "receivable_credit" DECIMAL(78,18),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_returns_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "order_return_lines" (
    "shop_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "return_id" UUID NOT NULL,
    "order_line_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "accepted_quantity" INTEGER NOT NULL DEFAULT 0,
    "disposition" "return_disposition" NOT NULL DEFAULT 'pending',
    "reason" VARCHAR(1000) NOT NULL,

    CONSTRAINT "order_return_lines_pkey" PRIMARY KEY ("shop_id","return_id","order_line_id")
);

-- CreateIndex
CREATE INDEX "shipments_shop_id_created_at_id_idx" ON "shipments"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shop_id_order_id_id_key" ON "shipments"("shop_id", "order_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shop_id_order_id_key" ON "shipments"("shop_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_observations_shop_id_shipment_id_id_key" ON "shipment_observations"("shop_id", "shipment_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_observations_shop_id_shipment_id_external_event_id_key" ON "shipment_observations"("shop_id", "shipment_id", "external_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_events_shop_id_shipment_id_observation_id_key" ON "shipment_events"("shop_id", "shipment_id", "observation_id");

-- CreateIndex
CREATE INDEX "order_returns_shop_id_order_id_idx" ON "order_returns"("shop_id", "order_id");

-- CreateIndex
CREATE INDEX "order_returns_shop_id_created_at_id_idx" ON "order_returns"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "order_returns_shop_id_order_id_id_key" ON "order_returns"("shop_id", "order_id", "id");

-- CreateIndex
CREATE INDEX "order_return_lines_shop_id_order_id_order_line_id_idx" ON "order_return_lines"("shop_id", "order_id", "order_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_lines_shop_id_order_id_id_key" ON "order_lines"("shop_id", "order_id", "id");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "sales_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shop_id_warehouse_id_fkey" FOREIGN KEY ("shop_id", "warehouse_id") REFERENCES "warehouses"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_shop_id_order_id_shipment_id_fkey" FOREIGN KEY ("shop_id", "order_id", "shipment_id") REFERENCES "shipments"("shop_id", "order_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_shop_id_order_id_order_line_id_fkey" FOREIGN KEY ("shop_id", "order_id", "order_line_id") REFERENCES "order_lines"("shop_id", "order_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shipment_observations" ADD CONSTRAINT "shipment_observations_shop_id_shipment_id_fkey" FOREIGN KEY ("shop_id", "shipment_id") REFERENCES "shipments"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shop_id_shipment_id_fkey" FOREIGN KEY ("shop_id", "shipment_id") REFERENCES "shipments"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shop_id_shipment_id_observation_id_fkey" FOREIGN KEY ("shop_id", "shipment_id", "observation_id") REFERENCES "shipment_observations"("shop_id", "shipment_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_shop_id_order_id_shipment_id_fkey" FOREIGN KEY ("shop_id", "order_id", "shipment_id") REFERENCES "shipments"("shop_id", "order_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_return_lines" ADD CONSTRAINT "order_return_lines_shop_id_order_id_return_id_fkey" FOREIGN KEY ("shop_id", "order_id", "return_id") REFERENCES "order_returns"("shop_id", "order_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_return_lines" ADD CONSTRAINT "order_return_lines_shop_id_order_id_order_line_id_fkey" FOREIGN KEY ("shop_id", "order_id", "order_line_id") REFERENCES "order_lines"("shop_id", "order_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "shipments" ADD CHECK (version > 0 AND (shipping_fee_quote IS NULL OR shipping_fee_quote >= 0)
  AND (shipping_fee_actual IS NULL OR shipping_fee_actual >= 0)
  AND ((state IN ('planned', 'cancelled') AND handed_over_at IS NULL AND last_event_at IS NULL)
    OR (state NOT IN ('planned', 'cancelled') AND handed_over_at IS NOT NULL AND last_event_at >= handed_over_at))
  AND ((state = 'delivered' AND delivered_at >= handed_over_at AND delivered_at IS NOT NULL)
    OR (state <> 'delivered' AND delivered_at IS NULL)));
ALTER TABLE "shipment_lines" ADD CHECK (quantity > 0 AND cost_value >= 0);
ALTER TABLE "shipment_observations" ADD CHECK (state NOT IN ('planned', 'cancelled') AND length(external_event_id) > 0);
ALTER TABLE "shipment_events" ADD CHECK (state NOT IN ('planned', 'cancelled')
  AND (observation_id IS NOT NULL OR (state = 'handed_over' AND applied)) AND length(external_event_id) > 0);
ALTER TABLE "order_returns" ADD CHECK (version > 0 AND
  ((state = 'awaiting_goods' AND refund_obligation IS NULL AND receivable_credit IS NULL)
    OR (state = 'inspected' AND refund_obligation IS NOT NULL AND refund_obligation >= 0
        AND receivable_credit IS NOT NULL AND receivable_credit >= 0)));
ALTER TABLE "order_return_lines" ADD CHECK (quantity > 0 AND accepted_quantity BETWEEN 0 AND quantity
  AND (disposition <> 'pending' OR accepted_quantity = 0));

GRANT SELECT, INSERT, UPDATE ON "shipments", "shipment_lines", "order_returns", "order_return_lines" TO botsales_runtime;
GRANT SELECT, INSERT ON "shipment_events" TO botsales_runtime;
GRANT SELECT ON "shipment_observations" TO botsales_runtime;

COMMIT;
