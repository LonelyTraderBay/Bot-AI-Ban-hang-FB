BEGIN;

ALTER TABLE "bot_inbound_tasks" ADD COLUMN "reserved_tokens" INTEGER;
ALTER TABLE "bot_inbound_tasks" ADD CONSTRAINT "bot_task_reserved_tokens"
  CHECK ("reserved_tokens" IS NULL OR ("reserved_tokens" > 0 AND "external_started_at" IS NOT NULL));
CREATE INDEX "bot_inbound_tasks_shop_id_external_started_at_idx" ON "bot_inbound_tasks"("shop_id", "external_started_at");
GRANT UPDATE ("reserved_tokens") ON "bot_inbound_tasks" TO botsales_runtime;

COMMIT;
