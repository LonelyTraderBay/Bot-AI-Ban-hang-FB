BEGIN;

ALTER TABLE "bot_inbound_tasks" ADD COLUMN "provider_run_id" UUID, ADD COLUMN "external_started_at" timestamptz(3);
CREATE UNIQUE INDEX "bot_inbound_tasks_provider_run_id_key" ON "bot_inbound_tasks"("provider_run_id");
ALTER TABLE "bot_inbound_tasks" ADD CONSTRAINT "bot_task_provider_start_scope"
  CHECK ("external_started_at" IS NULL OR "provider_run_id" IS NOT NULL);
GRANT UPDATE ("external_started_at") ON "bot_inbound_tasks" TO botsales_runtime;

COMMIT;
