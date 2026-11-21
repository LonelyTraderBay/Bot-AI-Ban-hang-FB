BEGIN;

CREATE TYPE "job_kind" AS ENUM ('import', 'export', 'knowledge_index', 'evaluation', 'privacy', 'connection_test');
CREATE TYPE "job_status" AS ENUM ('queued', 'running', 'awaiting_confirmation', 'succeeded', 'partial', 'failed', 'cancelled');

CREATE TABLE "jobs" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "source_operation" TEXT NOT NULL,
    "command_id" UUID,
    "kind" "job_kind" NOT NULL,
    "status" "job_status" NOT NULL DEFAULT 'queued',
    "input" JSONB NOT NULL,
    "result" JSONB,
    "completed" INTEGER NOT NULL DEFAULT 0 CHECK ("completed" >= 0),
    "total" INTEGER CHECK ("total" IS NULL OR "total" >= "completed"),
    "error_count" INTEGER NOT NULL DEFAULT 0 CHECK ("error_count" >= 0),
    "due_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
    "lease_token" UUID,
    "lease_until" TIMESTAMPTZ(3),
    "external_started_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("shop_id", "id"),
    CONSTRAINT "jobs_lease_pair" CHECK (("lease_token" IS NULL) = ("lease_until" IS NULL)),
    CONSTRAINT "jobs_shop_id_actor_id_fkey" FOREIGN KEY ("shop_id", "actor_id")
        REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "jobs_shop_id_command_id_fkey" FOREIGN KEY ("shop_id", "command_id")
        REFERENCES "commands"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "jobs_shop_id_command_id_key" ON "jobs"("shop_id", "command_id");
CREATE INDEX "jobs_shop_id_actor_id_created_at_id_idx" ON "jobs"("shop_id", "actor_id", "created_at", "id");
CREATE INDEX "jobs_status_due_at_id_idx" ON "jobs"("status", "due_at", "id");
CREATE INDEX "jobs_status_lease_until_idx" ON "jobs"("status", "lease_until");

ALTER TABLE "outbox_events" ADD COLUMN "job_id" UUID;
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_shop_id_job_id_fkey" FOREIGN KEY ("shop_id", "job_id")
    REFERENCES "jobs"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX "outbox_events_shop_id_job_id_idx" ON "outbox_events"("shop_id", "job_id");

GRANT SELECT, INSERT, UPDATE ON "jobs" TO botsales_runtime;
COMMIT;
