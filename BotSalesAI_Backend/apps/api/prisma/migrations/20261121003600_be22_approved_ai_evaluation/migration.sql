BEGIN;

ALTER TABLE "evaluations" ADD COLUMN "approval_run_id" UUID;
CREATE UNIQUE INDEX "evaluations_approval_run_id_key" ON "evaluations"("approval_run_id");
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_provider_approval_scope"
  CHECK ("approval_run_id" IS NULL OR (NOT "fixture" AND "knowledge_revision_id" IS NULL));

COMMIT;
