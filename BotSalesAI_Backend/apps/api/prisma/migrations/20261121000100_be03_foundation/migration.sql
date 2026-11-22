BEGIN;

-- CreateEnum
CREATE TYPE "membership_role" AS ENUM ('owner', 'manager', 'sales', 'warehouse', 'accountant', 'bot_admin', 'viewer');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('active', 'invited', 'revoked');

-- CreateEnum
CREATE TYPE "warehouse_status" AS ENUM ('active', 'archived');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "oidc_issuer" TEXT NOT NULL,
    "oidc_subject" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(160) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "policy_version" TEXT NOT NULL DEFAULT '1',
    "default_warehouse_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "address_line" VARCHAR(500) NOT NULL,
    "status" "warehouse_status" NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "roles" "membership_role"[] DEFAULT ARRAY[]::"membership_role"[],
    "permission_version" INTEGER NOT NULL DEFAULT 1,
    "status" "membership_status" NOT NULL DEFAULT 'active',

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commands" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "operation_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "commands_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "command_id" UUID,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_oidc_issuer_oidc_subject_key" ON "users"("oidc_issuer", "oidc_subject");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_shop_id_code_key" ON "warehouses"("shop_id", "code");

-- CreateIndex
CREATE INDEX "memberships_user_id_status_idx" ON "memberships"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_shop_id_user_id_key" ON "memberships"("shop_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "commands_shop_id_created_at_id_idx" ON "commands"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "commands_shop_id_actor_id_operation_id_idempotency_key_key" ON "commands"("shop_id", "actor_id", "operation_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "audit_entries_shop_id_created_at_id_idx" ON "audit_entries"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "audit_entries_shop_id_actor_id_idx" ON "audit_entries"("shop_id", "actor_id");

-- CreateIndex
CREATE INDEX "outbox_events_shop_id_command_id_idx" ON "outbox_events"("shop_id", "command_id");

-- CreateIndex
CREATE INDEX "outbox_events_published_at_available_at_idx" ON "outbox_events"("published_at", "available_at");

-- AddForeignKey
-- Defer this FK when creating the shop and its first warehouse in one transaction.
ALTER TABLE "shops" ADD CONSTRAINT "shops_default_warehouse_fkey" FOREIGN KEY ("id", "default_warehouse_id") REFERENCES "warehouses"("shop_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commands" ADD CONSTRAINT "commands_shop_id_actor_id_fkey" FOREIGN KEY ("shop_id", "actor_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_shop_id_actor_id_fkey" FOREIGN KEY ("shop_id", "actor_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_shop_id_command_id_fkey" FOREIGN KEY ("shop_id", "command_id") REFERENCES "commands"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "shops"
    ADD CONSTRAINT "shops_currency_format" CHECK ("currency" ~ '^[A-Z]{3}$'),
    ADD CONSTRAINT "shops_version_positive" CHECK ("version" > 0);
ALTER TABLE "warehouses"
    ADD CONSTRAINT "warehouses_version_positive" CHECK ("version" > 0);
ALTER TABLE "memberships"
    ALTER COLUMN "roles" SET NOT NULL,
    ADD CONSTRAINT "memberships_permission_version_positive" CHECK ("permission_version" > 0),
    ADD CONSTRAINT "memberships_active_roles" CHECK ("status" <> 'active' OR cardinality("roles") > 0);
ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_token_hash_format" CHECK ("token_hash" ~ '^[a-f0-9]{64}$'),
    ADD CONSTRAINT "sessions_expires_after_creation" CHECK ("expires_at" > "created_at");
ALTER TABLE "commands"
    ADD CONSTRAINT "commands_request_hash_format" CHECK ("request_hash" ~ '^[a-f0-9]{64}$');

GRANT SELECT, INSERT, UPDATE ON "users", "shops", "warehouses", "memberships", "sessions", "commands", "outbox_events" TO botsales_runtime;
GRANT SELECT, INSERT ON "audit_entries" TO botsales_runtime;
COMMIT;
