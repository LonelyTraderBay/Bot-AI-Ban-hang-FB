BEGIN;

-- CreateEnum
CREATE TYPE "bot_status" AS ENUM ('draft', 'active', 'paused', 'degraded');

-- AlterTable
ALTER TABLE "channel_messages" ADD COLUMN     "source_evidence" JSONB;

-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN     "cases" JSONB,
ADD COLUMN     "config_hash" VARCHAR(64);

-- AlterTable
ALTER TABLE "message_dispatches" ADD COLUMN     "bot_generation" INTEGER;

-- CreateTable
CREATE TABLE "ai_connections" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(120) NOT NULL,
    "provider_id" VARCHAR(128) NOT NULL,
    "adapter_id" VARCHAR(128) NOT NULL,
    "model_id" VARCHAR(160) NOT NULL,
    "endpoint_url" VARCHAR(500),
    "credential_ciphertext" TEXT,
    "key_last4" VARCHAR(4),
    "status" "channel_status" NOT NULL DEFAULT 'unconfigured',
    "last_checked_at" TIMESTAMPTZ(3),
    "check_job_id" UUID,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_connections_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "bot_configs" (
    "shop_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "bot_status" NOT NULL DEFAULT 'draft',
    "draft_revision" INTEGER NOT NULL DEFAULT 1,
    "live_revision" INTEGER,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_configs_pkey" PRIMARY KEY ("shop_id")
);

-- CreateTable
CREATE TABLE "bot_revisions" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revision" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "connection_id" UUID,
    "instructions" TEXT NOT NULL,
    "knowledge_revision_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "max_tool_steps" INTEGER NOT NULL DEFAULT 0,
    "daily_budget" DECIMAL(78,18),
    "currency" VARCHAR(3) NOT NULL,
    "evaluation_id" UUID,
    "published_at" TIMESTAMPTZ(3),
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_revisions_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "bot_daily_usage" (
    "shop_id" UUID NOT NULL,
    "accounting_date" DATE NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "spent" DECIMAL(78,18) NOT NULL,
    "runs" INTEGER NOT NULL,

    CONSTRAINT "bot_daily_usage_pkey" PRIMARY KEY ("shop_id","accounting_date")
);

-- CreateTable
CREATE TABLE "playground_runs" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revision_id" UUID NOT NULL,
    "output" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playground_runs_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "bot_inbound_tasks" (
    "shop_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "conversation_generation" INTEGER NOT NULL,
    "channel_generation" INTEGER NOT NULL,
    "bot_generation" INTEGER NOT NULL,
    "outcome" VARCHAR(64),
    "finished_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_inbound_tasks_pkey" PRIMARY KEY ("shop_id","message_id")
);

-- CreateIndex
CREATE INDEX "ai_connections_shop_id_created_at_id_idx" ON "ai_connections"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_connections_shop_id_check_job_id_key" ON "ai_connections"("shop_id", "check_job_id");

-- CreateIndex
CREATE INDEX "bot_revisions_shop_id_created_at_id_idx" ON "bot_revisions"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "bot_revisions_shop_id_revision_key" ON "bot_revisions"("shop_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "bot_revisions_shop_id_evaluation_id_key" ON "bot_revisions"("shop_id", "evaluation_id");

-- CreateIndex
CREATE INDEX "bot_inbound_tasks_finished_at_created_at_idx" ON "bot_inbound_tasks"("finished_at", "created_at");

-- AddForeignKey
ALTER TABLE "ai_connections" ADD CONSTRAINT "ai_connections_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_connections" ADD CONSTRAINT "ai_connections_shop_id_check_job_id_fkey" FOREIGN KEY ("shop_id", "check_job_id") REFERENCES "jobs"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bot_configs" ADD CONSTRAINT "bot_configs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bot_revisions" ADD CONSTRAINT "bot_revisions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "bot_configs"("shop_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bot_revisions" ADD CONSTRAINT "bot_revisions_shop_id_connection_id_fkey" FOREIGN KEY ("shop_id", "connection_id") REFERENCES "ai_connections"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bot_revisions" ADD CONSTRAINT "bot_revisions_shop_id_evaluation_id_fkey" FOREIGN KEY ("shop_id", "evaluation_id") REFERENCES "evaluations"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bot_revisions" ADD CONSTRAINT "bot_revisions_shop_id_approved_by_fkey" FOREIGN KEY ("shop_id", "approved_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bot_daily_usage" ADD CONSTRAINT "bot_daily_usage_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "playground_runs" ADD CONSTRAINT "playground_runs_shop_id_revision_id_fkey" FOREIGN KEY ("shop_id", "revision_id") REFERENCES "bot_revisions"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bot_inbound_tasks" ADD CONSTRAINT "bot_inbound_tasks_shop_id_message_id_fkey" FOREIGN KEY ("shop_id", "message_id") REFERENCES "channel_messages"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "ai_connections" ADD CONSTRAINT "ai_connection_credential_state"
    CHECK (version > 0 AND ((credential_ciphertext IS NULL) = (key_last4 IS NULL))
           AND (deleted_at IS NULL OR (status = 'disabled' AND credential_ciphertext IS NULL)));
ALTER TABLE "bot_configs" ADD CONSTRAINT "bot_config_state"
    CHECK (version > 0 AND generation > 0 AND draft_revision > 0 AND (status <> 'active' OR live_revision IS NOT NULL)
           AND (live_revision IS NULL OR (live_revision > 0 AND live_revision <= draft_revision AND published_at IS NOT NULL)));
ALTER TABLE "bot_revisions" ADD CONSTRAINT "bot_revision_state"
    CHECK (revision > 0 AND version > 0 AND max_tool_steps BETWEEN 0 AND 20 AND (daily_budget IS NULL OR daily_budget > 0)
           AND ((published_at IS NULL AND approved_by IS NULL AND evaluation_id IS NULL) OR
                (published_at IS NOT NULL AND approved_by IS NOT NULL AND evaluation_id IS NOT NULL AND connection_id IS NOT NULL)));
ALTER TABLE "bot_daily_usage" ADD CONSTRAINT "bot_usage_nonnegative" CHECK (spent >= 0 AND runs > 0);
ALTER TABLE "bot_inbound_tasks" ADD CONSTRAINT "bot_task_state"
    CHECK (conversation_generation > 0 AND channel_generation > 0 AND bot_generation > 0
           AND ((finished_at IS NULL) = (outcome IS NULL)));

GRANT SELECT, INSERT, UPDATE ON "ai_connections", "bot_configs", "bot_daily_usage" TO botsales_runtime;
GRANT SELECT, INSERT ON "bot_revisions", "playground_runs", "bot_inbound_tasks" TO botsales_runtime;
GRANT UPDATE (published_at, evaluation_id, approved_by, version, updated_at) ON "bot_revisions" TO botsales_runtime;
GRANT UPDATE (finished_at, outcome) ON "bot_inbound_tasks" TO botsales_runtime;
GRANT INSERT, UPDATE ON "evaluations" TO botsales_runtime;

COMMIT;
