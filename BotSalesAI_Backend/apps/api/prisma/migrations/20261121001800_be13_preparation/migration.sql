BEGIN;

-- CreateEnum
CREATE TYPE "work_item_kind" AS ENUM ('prepare_order', 'purchase_review', 'payment_mismatch', 'customer_handoff', 'late_shipment', 'recovery');

-- CreateEnum
CREATE TYPE "work_item_state" AS ENUM ('queued', 'claimed', 'working', 'blocked', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "preparation_state" AS ENUM ('queued', 'claimed', 'picking', 'packed', 'handed_over', 'cancelled');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('in_app', 'web_push', 'telegram');

-- CreateEnum
CREATE TYPE "notification_delivery" AS ENUM ('queued', 'accepted_by_provider', 'failed', 'unknown');

-- CreateTable
CREATE TABLE "work_items" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "work_item_kind" NOT NULL,
    "source_type" VARCHAR(64) NOT NULL,
    "source_id" UUID NOT NULL,
    "state" "work_item_state" NOT NULL DEFAULT 'queued',
    "assignee_user_id" UUID,
    "due_at" TIMESTAMPTZ(3),
    "blocked_reason" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "prep_jobs" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "state" "preparation_state" NOT NULL DEFAULT 'queued',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "prep_jobs_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "prep_lines" (
    "shop_id" UUID NOT NULL,
    "prep_job_id" UUID NOT NULL,
    "order_line_id" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "required_quantity" INTEGER NOT NULL,
    "picked_quantity" INTEGER NOT NULL DEFAULT 0,
    "has_issue" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "prep_lines_pkey" PRIMARY KEY ("shop_id","prep_job_id","order_line_id")
);

-- CreateTable
CREATE TABLE "app_notifications" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_item_id" UUID,
    "source_type" VARCHAR(64) NOT NULL,
    "source_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "channel" "notification_channel" NOT NULL DEFAULT 'in_app',
    "title" VARCHAR(120) NOT NULL,
    "safe_body" VARCHAR(300) NOT NULL,
    "delivery_status" "notification_delivery" NOT NULL DEFAULT 'queued',
    "delivery_intent" VARCHAR(64) NOT NULL,
    "opened_at" TIMESTAMPTZ(3),
    "acknowledged_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateIndex
CREATE INDEX "work_items_shop_id_created_at_id_idx" ON "work_items"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "work_items_shop_id_assignee_user_id_state_idx" ON "work_items"("shop_id", "assignee_user_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "work_items_shop_id_kind_source_type_source_id_key" ON "work_items"("shop_id", "kind", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "prep_jobs_shop_id_created_at_id_idx" ON "prep_jobs"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "prep_jobs_shop_id_order_id_key" ON "prep_jobs"("shop_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "prep_jobs_shop_id_work_item_id_key" ON "prep_jobs"("shop_id", "work_item_id");

-- CreateIndex
CREATE INDEX "app_notifications_shop_id_recipient_user_id_created_at_id_idx" ON "app_notifications"("shop_id", "recipient_user_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "app_notifications_shop_id_recipient_user_id_channel_deliver_key" ON "app_notifications"("shop_id", "recipient_user_id", "channel", "delivery_intent");

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_shop_id_assignee_user_id_fkey" FOREIGN KEY ("shop_id", "assignee_user_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prep_jobs" ADD CONSTRAINT "prep_jobs_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "sales_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prep_jobs" ADD CONSTRAINT "prep_jobs_shop_id_work_item_id_fkey" FOREIGN KEY ("shop_id", "work_item_id") REFERENCES "work_items"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prep_lines" ADD CONSTRAINT "prep_lines_shop_id_prep_job_id_fkey" FOREIGN KEY ("shop_id", "prep_job_id") REFERENCES "prep_jobs"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prep_lines" ADD CONSTRAINT "prep_lines_shop_id_order_line_id_fkey" FOREIGN KEY ("shop_id", "order_line_id") REFERENCES "order_lines"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_shop_id_work_item_id_fkey" FOREIGN KEY ("shop_id", "work_item_id") REFERENCES "work_items"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_shop_id_recipient_user_id_fkey" FOREIGN KEY ("shop_id", "recipient_user_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;


ALTER TABLE "work_items" ADD CHECK (version > 0 AND (state <> 'queued' OR assignee_user_id IS NULL));
ALTER TABLE "prep_jobs" ADD CHECK (version > 0);
ALTER TABLE "prep_lines" ADD CHECK (required_quantity > 0 AND picked_quantity BETWEEN 0 AND required_quantity);
ALTER TABLE "app_notifications" ADD CHECK (version > 0 AND delivery_intent ~ '^[0-9a-f]{64}$'
  AND (acknowledged_at IS NULL OR (opened_at IS NOT NULL AND acknowledged_at >= opened_at)));

INSERT INTO "work_items" (shop_id, kind, source_type, source_id, due_at, updated_at)
SELECT o.shop_id, 'prepare_order', 'order', o.id, r.expires_at, CURRENT_TIMESTAMP
FROM "sales_orders" o JOIN "stock_reservations" r ON r.shop_id = o.shop_id AND r.id = o.reservation_id
WHERE o.order_state = 'confirmed' AND o.fulfillment_state = 'reserved' AND r.status = 'active';
INSERT INTO "prep_jobs" (shop_id, order_id, work_item_id, updated_at)
SELECT shop_id, source_id, id, CURRENT_TIMESTAMP FROM "work_items" WHERE kind = 'prepare_order' AND source_type = 'order';
INSERT INTO "prep_lines" (shop_id, prep_job_id, order_line_id, sku, required_quantity)
SELECT p.shop_id, p.id, l.id, l.sku, l.quantity FROM "prep_jobs" p
JOIN "order_lines" l ON l.shop_id = p.shop_id AND l.order_id = p.order_id WHERE l.retired_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON "work_items", "prep_jobs", "prep_lines", "app_notifications" TO botsales_runtime;

COMMIT;
