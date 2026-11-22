BEGIN;

-- CreateEnum
CREATE TYPE "order_state" AS ENUM ('draft', 'confirmed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "order_fulfillment_state" AS ENUM ('unfulfilled', 'reserved', 'picking', 'packed', 'dispatched', 'part_delivered', 'delivered', 'part_returned', 'returned');

-- CreateEnum
CREATE TYPE "order_payment_state" AS ENUM ('unpaid', 'part_paid', 'verified', 'cod_collected', 'settled', 'part_refunded', 'refunded');

-- CreateEnum
CREATE TYPE "order_payment_method" AS ENUM ('prepay', 'cod');

-- CreateEnum
CREATE TYPE "message_direction" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "message_origin" AS ENUM ('fixture', 'provider');

-- AlterTable
ALTER TABLE "customer_identities" ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid();

-- CreateTable
CREATE TABLE "channel_conversations" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "customer_identity_id" UUID NOT NULL,
    "external_id" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_conversations_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "channel_messages" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "external_id" VARCHAR(160) NOT NULL,
    "direction" "message_direction" NOT NULL,
    "origin" "message_origin" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_messages_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "conversation_id" UUID,
    "warehouse_id" UUID NOT NULL,
    "shipping_address_id" UUID,
    "customer_confirmation_id" UUID,
    "reservation_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "order_state" "order_state" NOT NULL DEFAULT 'draft',
    "fulfillment_state" "order_fulfillment_state" NOT NULL DEFAULT 'unfulfilled',
    "payment_state" "order_payment_state" NOT NULL DEFAULT 'unpaid',
    "payment_method" "order_payment_method" NOT NULL,
    "recognition_policy_version" VARCHAR(100),
    "currency" VARCHAR(3) NOT NULL,
    "total" DECIMAL(78,18) NOT NULL,
    "notes" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "variant_version" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "name" VARCHAR(323) NOT NULL,
    "unit_price" DECIMAL(78,18) NOT NULL,
    "discount" DECIMAL(78,18) NOT NULL,
    "line_total" DECIMAL(78,18) NOT NULL,
    "retired_at" TIMESTAMPTZ(3),

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "order_quotes" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "order_version" INTEGER NOT NULL,
    "customer_id" UUID NOT NULL,
    "address_snapshot_id" UUID,
    "quote_hash" VARCHAR(64) NOT NULL,
    "lines" JSONB NOT NULL,
    "shipping_rate" JSONB,
    "total" DECIMAL(78,18) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "warnings" TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_quotes_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "order_customer_confirmations" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "quote_hash" VARCHAR(64) NOT NULL,
    "customer_identity_id" UUID NOT NULL,
    "source_message_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_customer_confirmations_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_conversations_shop_id_customer_id_id_key" ON "channel_conversations"("shop_id", "customer_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_conversations_shop_id_customer_identity_id_external_key" ON "channel_conversations"("shop_id", "customer_identity_id", "external_id");

-- CreateIndex
CREATE INDEX "channel_messages_shop_id_conversation_id_created_at_id_idx" ON "channel_messages"("shop_id", "conversation_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_messages_shop_id_conversation_id_external_id_key" ON "channel_messages"("shop_id", "conversation_id", "external_id");

-- CreateIndex
CREATE INDEX "sales_orders_shop_id_created_at_id_idx" ON "sales_orders"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "sales_orders_shop_id_customer_id_created_at_id_idx" ON "sales_orders"("shop_id", "customer_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "sales_orders_shop_id_warehouse_id_order_state_idx" ON "sales_orders"("shop_id", "warehouse_id", "order_state");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_shop_id_customer_id_id_key" ON "sales_orders"("shop_id", "customer_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_shop_id_reservation_id_key" ON "sales_orders"("shop_id", "reservation_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_shop_id_customer_confirmation_id_key" ON "sales_orders"("shop_id", "customer_confirmation_id");

-- CreateIndex
CREATE INDEX "order_lines_shop_id_order_id_position_idx" ON "order_lines"("shop_id", "order_id", "position");

-- CreateIndex
CREATE INDEX "order_quotes_shop_id_order_id_order_version_idx" ON "order_quotes"("shop_id", "order_id", "order_version");

-- CreateIndex
CREATE INDEX "order_customer_confirmations_shop_id_quote_id_idx" ON "order_customer_confirmations"("shop_id", "quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_customer_confirmations_shop_id_source_message_id_key" ON "order_customer_confirmations"("shop_id", "source_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identities_shop_id_id_key" ON "customer_identities"("shop_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identities_shop_id_customer_id_id_key" ON "customer_identities"("shop_id", "customer_id", "id");

-- AddForeignKey
ALTER TABLE "service_cases" ADD CONSTRAINT "service_cases_shop_id_customer_id_order_id_fkey" FOREIGN KEY ("shop_id", "customer_id", "order_id") REFERENCES "sales_orders"("shop_id", "customer_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channel_conversations" ADD CONSTRAINT "channel_conversations_shop_id_customer_id_customer_identit_fkey" FOREIGN KEY ("shop_id", "customer_id", "customer_identity_id") REFERENCES "customer_identities"("shop_id", "customer_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_shop_id_conversation_id_fkey" FOREIGN KEY ("shop_id", "conversation_id") REFERENCES "channel_conversations"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_shop_id_customer_id_conversation_id_fkey" FOREIGN KEY ("shop_id", "customer_id", "conversation_id") REFERENCES "channel_conversations"("shop_id", "customer_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_shop_id_warehouse_id_fkey" FOREIGN KEY ("shop_id", "warehouse_id") REFERENCES "warehouses"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_shop_id_customer_id_shipping_address_id_fkey" FOREIGN KEY ("shop_id", "customer_id", "shipping_address_id") REFERENCES "customer_addresses"("shop_id", "customer_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_shop_id_customer_confirmation_id_fkey" FOREIGN KEY ("shop_id", "customer_confirmation_id") REFERENCES "order_customer_confirmations"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_shop_id_reservation_id_fkey" FOREIGN KEY ("shop_id", "reservation_id") REFERENCES "stock_reservations"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "sales_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_shop_id_variant_id_fkey" FOREIGN KEY ("shop_id", "variant_id") REFERENCES "variants"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_quotes" ADD CONSTRAINT "order_quotes_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "sales_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_quotes" ADD CONSTRAINT "order_quotes_shop_id_address_snapshot_id_fkey" FOREIGN KEY ("shop_id", "address_snapshot_id") REFERENCES "address_snapshots"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_customer_confirmations" ADD CONSTRAINT "order_customer_confirmations_shop_id_quote_id_fkey" FOREIGN KEY ("shop_id", "quote_id") REFERENCES "order_quotes"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_customer_confirmations" ADD CONSTRAINT "order_customer_confirmations_shop_id_customer_identity_id_fkey" FOREIGN KEY ("shop_id", "customer_identity_id") REFERENCES "customer_identities"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_customer_confirmations" ADD CONSTRAINT "order_customer_confirmations_shop_id_source_message_id_fkey" FOREIGN KEY ("shop_id", "source_message_id") REFERENCES "channel_messages"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;


ALTER TABLE "sales_orders" ADD CHECK (version > 0 AND total >= 0);
ALTER TABLE "order_lines" ADD CHECK (quantity BETWEEN 1 AND 1000000 AND position >= 0
  AND unit_price > 0 AND discount >= 0 AND line_total = unit_price * quantity - discount AND line_total >= 0);
ALTER TABLE "order_quotes" ADD CHECK (order_version > 0 AND expires_at > created_at AND quote_hash ~ '^[0-9a-f]{64}$' AND total >= 0);
ALTER TABLE "order_customer_confirmations" ADD CHECK (expires_at > created_at AND quote_hash ~ '^[0-9a-f]{64}$');
CREATE UNIQUE INDEX "order_lines_active_variant_key" ON "order_lines" (shop_id, order_id, variant_id) WHERE retired_at IS NULL;

CREATE FUNCTION "enforce_draft_order_line"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "sales_orders" WHERE shop_id = NEW.shop_id AND id = NEW.order_id AND order_state = 'draft'
  ) OR (TG_OP = 'UPDATE' AND (OLD.shop_id, OLD.order_id, OLD.variant_id, OLD.id) IS DISTINCT FROM (NEW.shop_id, NEW.order_id, NEW.variant_id, NEW.id)) THEN
    RAISE EXCEPTION 'Only rows of the same draft order can be changed' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "order_lines_draft_only" BEFORE INSERT OR UPDATE ON "order_lines"
  FOR EACH ROW EXECUTE FUNCTION "enforce_draft_order_line"();

GRANT SELECT, INSERT, UPDATE ON "sales_orders", "order_lines" TO botsales_runtime;
GRANT SELECT, INSERT ON "order_quotes", "order_customer_confirmations" TO botsales_runtime;
GRANT SELECT ON "channel_conversations", "channel_messages" TO botsales_runtime;

COMMIT;
