BEGIN;

-- CreateEnum
CREATE TYPE "agent_role_kind" AS ENUM ('sales_admin', 'accountant', 'warehouse_buyer', 'supervisor');

-- CreateEnum
CREATE TYPE "budget_kind" AS ENUM ('ai_usage', 'notification', 'procurement');

-- CreateEnum
CREATE TYPE "budget_period" AS ENUM ('daily', 'monthly', 'per_order');

-- CreateEnum
CREATE TYPE "purchase_delegation_status" AS ENUM ('paused', 'active', 'revoked');

-- CreateEnum
CREATE TYPE "budget_reservation_status" AS ENUM ('reserved', 'consumed', 'unknown', 'released');

-- AlterTable
ALTER TABLE "purchase_suggestions" ADD COLUMN     "auto_send_reason" VARCHAR(500);

-- CreateTable
CREATE TABLE "shop_automation" (
    "shop_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "paused" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "shop_automation_pkey" PRIMARY KEY ("shop_id")
);

-- CreateTable
CREATE TABLE "agent_roles" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "agent_role_kind" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "human_owner_id" UUID,
    "model_connection_id" UUID,
    "policy_version" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "agent_roles_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "budget_policies" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "budget_kind" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "limit_amount" DECIMAL(78,18),
    "currency" VARCHAR(3) NOT NULL,
    "period" "budget_period" NOT NULL DEFAULT 'daily',
    "approval_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "budget_policies_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "purchase_delegations" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL DEFAULT 1,
    "agent_id" UUID NOT NULL,
    "human_owner_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "offer_snapshots" JSONB NOT NULL,
    "max_per_order" DECIMAL(78,18) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "budget_policy_id" UUID NOT NULL,
    "budget_policy_version" INTEGER NOT NULL,
    "budget_period" "budget_period" NOT NULL,
    "agent_generation" INTEGER NOT NULL,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "status" "purchase_delegation_status" NOT NULL DEFAULT 'paused',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_reason" VARCHAR(500),
    "last_changed_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "purchase_delegations_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "purchase_delegation_reservations" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL DEFAULT 1,
    "delegation_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "budget_policy_id" UUID NOT NULL,
    "budget_policy_version" INTEGER NOT NULL,
    "delegation_generation" INTEGER NOT NULL,
    "agent_generation" INTEGER NOT NULL,
    "shop_generation" INTEGER NOT NULL,
    "intent_hash" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(78,18) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "period" "budget_period" NOT NULL,
    "period_key" VARCHAR(100) NOT NULL,
    "status" "budget_reservation_status" NOT NULL DEFAULT 'reserved',
    "command_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "purchase_delegation_reservations_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "owner_digests" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL DEFAULT 1,
    "period_day" DATE NOT NULL,
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "work_item_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "owner_digests_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "worker_health" (
    "component" VARCHAR(80) NOT NULL,
    "checked_at" TIMESTAMPTZ(3) NOT NULL,
    "lag_ms" INTEGER NOT NULL,

    CONSTRAINT "worker_health_pkey" PRIMARY KEY ("component")
);

-- CreateIndex
CREATE INDEX "agent_roles_shop_id_created_at_id_idx" ON "agent_roles"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_roles_shop_id_kind_key" ON "agent_roles"("shop_id", "kind");

-- CreateIndex
CREATE INDEX "budget_policies_shop_id_created_at_id_idx" ON "budget_policies"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_policies_shop_id_kind_key" ON "budget_policies"("shop_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "budget_policies_shop_id_approval_id_key" ON "budget_policies"("shop_id", "approval_id");

-- CreateIndex
CREATE INDEX "purchase_delegations_shop_id_created_at_id_idx" ON "purchase_delegations"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "purchase_delegation_reservations_shop_id_budget_policy_id_p_idx" ON "purchase_delegation_reservations"("shop_id", "budget_policy_id", "period_key", "status");

-- CreateIndex
CREATE INDEX "purchase_delegation_reservations_shop_id_created_at_id_idx" ON "purchase_delegation_reservations"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_delegation_reservations_shop_id_purchase_order_id__key" ON "purchase_delegation_reservations"("shop_id", "purchase_order_id", "intent_hash");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_delegation_reservations_shop_id_command_id_key" ON "purchase_delegation_reservations"("shop_id", "command_id");

-- CreateIndex
CREATE INDEX "owner_digests_shop_id_created_at_id_idx" ON "owner_digests"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "owner_digests_shop_id_period_day_key" ON "owner_digests"("shop_id", "period_day");

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_shop_id_budget_policy_id_fkey" FOREIGN KEY ("shop_id", "budget_policy_id") REFERENCES "budget_policies"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_shop_id_purchase_delegation_id_fkey" FOREIGN KEY ("shop_id", "purchase_delegation_id") REFERENCES "purchase_delegations"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shop_automation" ADD CONSTRAINT "shop_automation_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_roles" ADD CONSTRAINT "agent_roles_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_roles" ADD CONSTRAINT "agent_roles_shop_id_human_owner_id_fkey" FOREIGN KEY ("shop_id", "human_owner_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_roles" ADD CONSTRAINT "agent_roles_shop_id_model_connection_id_fkey" FOREIGN KEY ("shop_id", "model_connection_id") REFERENCES "ai_connections"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budget_policies" ADD CONSTRAINT "budget_policies_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budget_policies" ADD CONSTRAINT "budget_policies_shop_id_approval_id_fkey" FOREIGN KEY ("shop_id", "approval_id") REFERENCES "approvals"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_delegations" ADD CONSTRAINT "purchase_delegations_shop_id_agent_id_fkey" FOREIGN KEY ("shop_id", "agent_id") REFERENCES "agent_roles"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_delegations" ADD CONSTRAINT "purchase_delegations_shop_id_human_owner_id_fkey" FOREIGN KEY ("shop_id", "human_owner_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_delegations" ADD CONSTRAINT "purchase_delegations_shop_id_last_changed_by_fkey" FOREIGN KEY ("shop_id", "last_changed_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_delegations" ADD CONSTRAINT "purchase_delegations_shop_id_supplier_id_fkey" FOREIGN KEY ("shop_id", "supplier_id") REFERENCES "suppliers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_delegations" ADD CONSTRAINT "purchase_delegations_shop_id_warehouse_id_fkey" FOREIGN KEY ("shop_id", "warehouse_id") REFERENCES "warehouses"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_delegations" ADD CONSTRAINT "purchase_delegations_shop_id_budget_policy_id_fkey" FOREIGN KEY ("shop_id", "budget_policy_id") REFERENCES "budget_policies"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_delegation_reservations" ADD CONSTRAINT "purchase_delegation_reservations_shop_id_delegation_id_fkey" FOREIGN KEY ("shop_id", "delegation_id") REFERENCES "purchase_delegations"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_delegation_reservations" ADD CONSTRAINT "purchase_delegation_reservations_shop_id_purchase_order_id_fkey" FOREIGN KEY ("shop_id", "purchase_order_id") REFERENCES "purchase_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_delegation_reservations" ADD CONSTRAINT "purchase_delegation_reservations_shop_id_budget_policy_id_fkey" FOREIGN KEY ("shop_id", "budget_policy_id") REFERENCES "budget_policies"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_delegation_reservations" ADD CONSTRAINT "purchase_delegation_reservations_shop_id_command_id_fkey" FOREIGN KEY ("shop_id", "command_id") REFERENCES "commands"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "owner_digests" ADD CONSTRAINT "owner_digests_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "shop_automation" ADD CONSTRAINT "shop_automation_version_check"
    CHECK (version > 0 AND generation > 0);
ALTER TABLE "agent_roles" ADD CONSTRAINT "agent_role_assignment_check"
    CHECK (version > 0 AND generation > 0 AND ((human_owner_id IS NULL) = (model_connection_id IS NULL)));
ALTER TABLE "budget_policies" ADD CONSTRAINT "budget_policy_proof_check"
    CHECK (version > 0 AND ((limit_amount IS NULL) = (approval_id IS NULL))
           AND (limit_amount IS NULL OR limit_amount > 0) AND (kind = 'procurement' OR period = 'daily'));
ALTER TABLE "purchase_delegations" ADD CONSTRAINT "purchase_delegation_snapshot_check"
    CHECK (version > 0 AND generation > 0 AND agent_generation > 0 AND budget_policy_version > 0
           AND max_per_order > 0 AND jsonb_typeof(offer_snapshots) = 'array'
           AND jsonb_array_length(offer_snapshots) BETWEEN 1 AND 100 AND expires_at > created_at);
ALTER TABLE "purchase_delegation_reservations" ADD CONSTRAINT "purchase_reservation_snapshot_check"
    CHECK (version > 0 AND delegation_generation > 0 AND agent_generation > 0 AND shop_generation > 0
           AND budget_policy_version > 0 AND amount > 0 AND intent_hash ~ '^[a-f0-9]{64}$' AND length(period_key) > 0);
ALTER TABLE "owner_digests" ADD CONSTRAINT "digest_period_check"
    CHECK (version > 0 AND period_start < period_end AND status IN ('draft','queued','accepted','unknown','failed'));
ALTER TABLE "worker_health" ADD CONSTRAINT "worker_health_lag_check" CHECK (lag_ms >= 0);

INSERT INTO shop_automation (shop_id) SELECT id FROM shops;
INSERT INTO agent_roles (shop_id, kind, policy_version, updated_at)
SELECT s.id, k, s.policy_version, CURRENT_TIMESTAMP FROM shops s CROSS JOIN unnest(enum_range(NULL::agent_role_kind)) AS k;
INSERT INTO budget_policies (shop_id, kind, currency, updated_at)
SELECT s.id, k, s.currency, CURRENT_TIMESTAMP FROM shops s CROSS JOIN unnest(enum_range(NULL::budget_kind)) AS k;

CREATE FUNCTION botsales_initialize_operations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO shop_automation (shop_id) VALUES (NEW.id);
    INSERT INTO agent_roles (shop_id, kind, policy_version, updated_at)
    SELECT NEW.id, k, NEW.policy_version, CURRENT_TIMESTAMP FROM unnest(enum_range(NULL::agent_role_kind)) AS k;
    INSERT INTO budget_policies (shop_id, kind, currency, updated_at)
    SELECT NEW.id, k, NEW.currency, CURRENT_TIMESTAMP FROM unnest(enum_range(NULL::budget_kind)) AS k;
    RETURN NEW;
END;
$$;
CREATE TRIGGER shop_initialize_operations AFTER INSERT ON shops
FOR EACH ROW EXECUTE FUNCTION botsales_initialize_operations();

GRANT SELECT, INSERT, UPDATE ON "shop_automation", "agent_roles", "budget_policies", "worker_health" TO botsales_runtime;
GRANT SELECT, INSERT ON "purchase_delegations", "purchase_delegation_reservations", "owner_digests" TO botsales_runtime;
GRANT UPDATE (status, last_changed_by, last_reason, version, generation, updated_at) ON "purchase_delegations" TO botsales_runtime;
GRANT UPDATE (status, version, updated_at) ON "purchase_delegation_reservations" TO botsales_runtime;

COMMIT;
