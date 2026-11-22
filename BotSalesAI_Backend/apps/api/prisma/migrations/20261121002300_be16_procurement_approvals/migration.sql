BEGIN;

-- CreateEnum
CREATE TYPE "supplier_status" AS ENUM ('draft', 'approved', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "supplier_send_method" AS ENUM ('manual', 'approved_adapter');

-- CreateEnum
CREATE TYPE "supplier_dispatch_outcome" AS ENUM ('accepted', 'unknown');

-- CreateEnum
CREATE TYPE "reorder_mode" AS ENUM ('notify_only', 'draft_for_approval', 'auto_send');

-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('pending', 'approved', 'rejected', 'expired', 'revoked', 'consumed');

-- CreateEnum
CREATE TYPE "purchase_status" AS ENUM ('draft', 'pending_approval', 'approved', 'sending', 'unknown', 'sent', 'confirmed', 'part_received', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "procurement_evidence_kind" AS ENUM ('supplier_confirmation', 'goods_receipt');

-- CreateEnum
CREATE TYPE "receipt_status" AS ENUM ('draft', 'posted', 'reversed');

-- CreateTable
CREATE TABLE "suppliers" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(160) NOT NULL,
    "status" "supplier_status" NOT NULL DEFAULT 'draft',
    "contact_label" VARCHAR(200) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "lead_time_days" INTEGER NOT NULL,
    "payment_terms" VARCHAR(500) NOT NULL,
    "send_method" "supplier_send_method" NOT NULL,
    "approved_adapter_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "supplier_dispatch_routes" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "outcome" "supplier_dispatch_outcome" NOT NULL,

    CONSTRAINT "supplier_dispatch_routes_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "supplier_offers" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "unit_cost" DECIMAL(78,18) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "minimum_quantity" INTEGER NOT NULL,
    "pack_size" INTEGER NOT NULL,
    "lead_time_days" INTEGER NOT NULL,
    "valid_until" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "supplier_offers_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "reorder_rules" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "supplier_offer_id" UUID NOT NULL,
    "reorder_point" INTEGER NOT NULL,
    "target_quantity" INTEGER NOT NULL,
    "safety_stock" INTEGER NOT NULL,
    "mode" "reorder_mode" NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "budget_policy_id" UUID,
    "purchase_delegation_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reorder_rules_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "purchase_suggestions" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL,
    "rule_version" INTEGER NOT NULL,
    "variant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "supplier_offer_id" UUID NOT NULL,
    "available" INTEGER NOT NULL,
    "confirmed_inbound" INTEGER NOT NULL,
    "open_proposal_quantity" INTEGER NOT NULL,
    "suggested_quantity" INTEGER NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "source_as_of" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "purchase_suggestions_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" UUID NOT NULL,
    "resource_version" INTEGER NOT NULL,
    "policy_version" VARCHAR(100) NOT NULL,
    "intent_hash" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(78,18),
    "currency" VARCHAR(3),
    "status" "approval_status" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "requested_by" UUID NOT NULL,
    "decided_by" UUID,
    "decision_reason" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "supplier_version" INTEGER NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "suggestion_id" UUID,
    "status" "purchase_status" NOT NULL DEFAULT 'draft',
    "total" DECIMAL(78,18) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "intent_hash" VARCHAR(64) NOT NULL,
    "approval_id" UUID,
    "external_reference" VARCHAR(200),
    "confirmation_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "supplier_offer_id" UUID NOT NULL,
    "offer_version" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "rejected_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(78,18) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "procurement_evidence" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "kind" "procurement_evidence_kind" NOT NULL,
    "external_ref" VARCHAR(200) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "procurement_evidence_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "source_document_ref" UUID NOT NULL,
    "status" "receipt_status" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "posted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "goods_receipt_lines" (
    "shop_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "purchase_line_id" UUID NOT NULL,
    "accepted_quantity" INTEGER NOT NULL,
    "rejected_quantity" INTEGER NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("shop_id","receipt_id","purchase_line_id")
);

-- CreateTable
CREATE TABLE "purchase_dispatches" (
    "shop_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "command_id" UUID NOT NULL,
    "due_at" TIMESTAMPTZ(3),

    CONSTRAINT "purchase_dispatches_pkey" PRIMARY KEY ("shop_id","purchase_order_id")
);

-- CreateTable
CREATE TABLE "reorder_evaluations" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "evaluated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rule_count" INTEGER NOT NULL,

    CONSTRAINT "reorder_evaluations_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateIndex
CREATE INDEX "suppliers_shop_id_created_at_id_idx" ON "suppliers"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "supplier_offers_shop_id_created_at_id_idx" ON "supplier_offers"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "supplier_offers_shop_id_supplier_id_variant_id_created_at_idx" ON "supplier_offers"("shop_id", "supplier_id", "variant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_offers_shop_id_variant_id_id_key" ON "supplier_offers"("shop_id", "variant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_offers_shop_id_supplier_id_variant_id_id_key" ON "supplier_offers"("shop_id", "supplier_id", "variant_id", "id");

-- CreateIndex
CREATE INDEX "reorder_rules_shop_id_created_at_id_idx" ON "reorder_rules"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "reorder_rules_shop_id_warehouse_id_variant_id_key" ON "reorder_rules"("shop_id", "warehouse_id", "variant_id");

-- CreateIndex
CREATE INDEX "purchase_suggestions_shop_id_created_at_id_idx" ON "purchase_suggestions"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_suggestions_shop_id_warehouse_id_variant_id_key" ON "purchase_suggestions"("shop_id", "warehouse_id", "variant_id");

-- CreateIndex
CREATE INDEX "approvals_shop_id_created_at_id_idx" ON "approvals"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "approvals_shop_id_resource_type_resource_id_status_idx" ON "approvals"("shop_id", "resource_type", "resource_id", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_shop_id_created_at_id_idx" ON "purchase_orders"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "purchase_orders_shop_id_warehouse_id_status_idx" ON "purchase_orders"("shop_id", "warehouse_id", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_shop_id_supplier_id_status_idx" ON "purchase_orders"("shop_id", "supplier_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_shop_id_approval_id_key" ON "purchase_orders"("shop_id", "approval_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_shop_id_id_confirmation_id_key" ON "purchase_orders"("shop_id", "id", "confirmation_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_shop_id_supplier_id_id_key" ON "purchase_orders"("shop_id", "supplier_id", "id");

-- CreateIndex
CREATE INDEX "purchase_order_lines_shop_id_variant_id_idx" ON "purchase_order_lines"("shop_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_lines_shop_id_purchase_order_id_id_key" ON "purchase_order_lines"("shop_id", "purchase_order_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_lines_shop_id_purchase_order_id_variant_id_key" ON "purchase_order_lines"("shop_id", "purchase_order_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_lines_shop_id_purchase_order_id_position_key" ON "purchase_order_lines"("shop_id", "purchase_order_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_evidence_shop_id_purchase_order_id_id_key" ON "procurement_evidence"("shop_id", "purchase_order_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_evidence_shop_id_purchase_order_id_kind_externa_key" ON "procurement_evidence"("shop_id", "purchase_order_id", "kind", "external_ref");

-- CreateIndex
CREATE INDEX "goods_receipts_shop_id_created_at_id_idx" ON "goods_receipts"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_shop_id_purchase_order_id_id_key" ON "goods_receipts"("shop_id", "purchase_order_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_shop_id_purchase_order_id_source_document_re_key" ON "goods_receipts"("shop_id", "purchase_order_id", "source_document_ref");

-- CreateIndex
CREATE INDEX "purchase_dispatches_due_at_idx" ON "purchase_dispatches"("due_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_dispatches_shop_id_command_id_key" ON "purchase_dispatches"("shop_id", "command_id");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_shop_id_approved_adapter_id_fkey" FOREIGN KEY ("shop_id", "approved_adapter_id") REFERENCES "supplier_dispatch_routes"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_dispatch_routes" ADD CONSTRAINT "supplier_dispatch_routes_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_offers" ADD CONSTRAINT "supplier_offers_shop_id_supplier_id_fkey" FOREIGN KEY ("shop_id", "supplier_id") REFERENCES "suppliers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_offers" ADD CONSTRAINT "supplier_offers_shop_id_variant_id_fkey" FOREIGN KEY ("shop_id", "variant_id") REFERENCES "variants"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_shop_id_variant_id_fkey" FOREIGN KEY ("shop_id", "variant_id") REFERENCES "variants"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_shop_id_warehouse_id_fkey" FOREIGN KEY ("shop_id", "warehouse_id") REFERENCES "warehouses"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_shop_id_variant_id_supplier_offer_id_fkey" FOREIGN KEY ("shop_id", "variant_id", "supplier_offer_id") REFERENCES "supplier_offers"("shop_id", "variant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_suggestions" ADD CONSTRAINT "purchase_suggestions_shop_id_rule_id_fkey" FOREIGN KEY ("shop_id", "rule_id") REFERENCES "reorder_rules"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_shop_id_requested_by_fkey" FOREIGN KEY ("shop_id", "requested_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_shop_id_decided_by_fkey" FOREIGN KEY ("shop_id", "decided_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_shop_id_supplier_id_fkey" FOREIGN KEY ("shop_id", "supplier_id") REFERENCES "suppliers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_shop_id_warehouse_id_fkey" FOREIGN KEY ("shop_id", "warehouse_id") REFERENCES "warehouses"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_shop_id_suggestion_id_fkey" FOREIGN KEY ("shop_id", "suggestion_id") REFERENCES "purchase_suggestions"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_shop_id_approval_id_fkey" FOREIGN KEY ("shop_id", "approval_id") REFERENCES "approvals"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_shop_id_id_confirmation_id_fkey" FOREIGN KEY ("shop_id", "id", "confirmation_id") REFERENCES "procurement_evidence"("shop_id", "purchase_order_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_shop_id_supplier_id_purchase_order_id_fkey" FOREIGN KEY ("shop_id", "supplier_id", "purchase_order_id") REFERENCES "purchase_orders"("shop_id", "supplier_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_shop_id_supplier_id_variant_id_suppli_fkey" FOREIGN KEY ("shop_id", "supplier_id", "variant_id", "supplier_offer_id") REFERENCES "supplier_offers"("shop_id", "supplier_id", "variant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procurement_evidence" ADD CONSTRAINT "procurement_evidence_shop_id_purchase_order_id_fkey" FOREIGN KEY ("shop_id", "purchase_order_id") REFERENCES "purchase_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_shop_id_purchase_order_id_fkey" FOREIGN KEY ("shop_id", "purchase_order_id") REFERENCES "purchase_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_shop_id_purchase_order_id_source_document_r_fkey" FOREIGN KEY ("shop_id", "purchase_order_id", "source_document_ref") REFERENCES "procurement_evidence"("shop_id", "purchase_order_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_shop_id_purchase_order_id_receipt_id_fkey" FOREIGN KEY ("shop_id", "purchase_order_id", "receipt_id") REFERENCES "goods_receipts"("shop_id", "purchase_order_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_shop_id_purchase_order_id_purchase_lin_fkey" FOREIGN KEY ("shop_id", "purchase_order_id", "purchase_line_id") REFERENCES "purchase_order_lines"("shop_id", "purchase_order_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_dispatches" ADD CONSTRAINT "purchase_dispatches_shop_id_purchase_order_id_fkey" FOREIGN KEY ("shop_id", "purchase_order_id") REFERENCES "purchase_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_dispatches" ADD CONSTRAINT "purchase_dispatches_shop_id_command_id_fkey" FOREIGN KEY ("shop_id", "command_id") REFERENCES "commands"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_evaluations" ADD CONSTRAINT "reorder_evaluations_shop_id_id_fkey" FOREIGN KEY ("shop_id", "id") REFERENCES "commands"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "suppliers" ADD CHECK (version > 0 AND length(name) > 0 AND lead_time_days >= 0
  AND ((send_method = 'approved_adapter') = (approved_adapter_id IS NOT NULL)));
ALTER TABLE "supplier_offers" ADD CHECK (version > 0 AND unit_cost > 0 AND minimum_quantity > 0 AND pack_size > 0 AND lead_time_days >= 0);
ALTER TABLE "reorder_rules" ADD CHECK (version > 0 AND reorder_point >= 0 AND safety_stock >= 0
  AND target_quantity >= GREATEST(reorder_point, safety_stock));
ALTER TABLE "purchase_suggestions" ADD CHECK (version > 0 AND rule_version > 0
  AND available >= 0 AND confirmed_inbound >= 0 AND open_proposal_quantity >= 0 AND suggested_quantity >= 0);
ALTER TABLE "approvals" ADD CHECK (version > 0 AND resource_version > 0 AND expires_at > created_at
  AND intent_hash ~ '^[0-9a-f]{64}$' AND ((amount IS NULL) = (currency IS NULL)) AND (amount IS NULL OR amount >= 0)
  AND (status NOT IN ('approved','rejected','consumed') OR (decided_by IS NOT NULL AND decision_reason IS NOT NULL)));
ALTER TABLE "purchase_orders" ADD CHECK (version > 0 AND supplier_version > 0 AND total > 0 AND intent_hash ~ '^[0-9a-f]{64}$'
  AND (status NOT IN ('sent','confirmed','part_received','received') OR external_reference IS NOT NULL)
  AND (status NOT IN ('confirmed','part_received','received') OR confirmation_id IS NOT NULL));
CREATE UNIQUE INDEX "purchase_orders_open_suggestion_key" ON "purchase_orders" (shop_id, suggestion_id)
  WHERE suggestion_id IS NOT NULL AND status NOT IN ('received', 'cancelled');
ALTER TABLE "purchase_order_lines" ADD CHECK (offer_version > 0 AND position >= 0 AND quantity > 0 AND unit_cost > 0
  AND received_quantity >= 0 AND rejected_quantity >= 0 AND received_quantity::bigint + rejected_quantity <= quantity);
ALTER TABLE "procurement_evidence" ADD CHECK (length(external_ref) > 0);
ALTER TABLE "goods_receipts" ADD CHECK (version > 0 AND ((status = 'draft') = (posted_at IS NULL)));
ALTER TABLE "goods_receipt_lines" ADD CHECK (accepted_quantity >= 0 AND rejected_quantity >= 0
  AND accepted_quantity::bigint + rejected_quantity BETWEEN 1 AND 2147483647
  AND (rejected_quantity = 0 OR length(reason) >= 5));
ALTER TABLE "reorder_evaluations" ADD CHECK (rule_count >= 0);

GRANT SELECT, INSERT, UPDATE ON "suppliers", "reorder_rules", "purchase_suggestions", "approvals",
  "purchase_orders", "purchase_order_lines", "goods_receipts", "purchase_dispatches" TO botsales_runtime;
GRANT SELECT, INSERT ON "supplier_offers", "goods_receipt_lines", "reorder_evaluations" TO botsales_runtime;
GRANT SELECT ON "supplier_dispatch_routes", "procurement_evidence" TO botsales_runtime;

COMMIT;
