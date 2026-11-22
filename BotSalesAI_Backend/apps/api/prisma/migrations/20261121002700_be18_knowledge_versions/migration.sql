BEGIN;

-- CreateEnum
CREATE TYPE "knowledge_source_kind" AS ENUM ('manual', 'file', 'feedback');

-- CreateEnum
CREATE TYPE "knowledge_status" AS ENUM ('draft', 'processing', 'ready_for_review', 'rejected', 'published', 'retired', 'failed');

-- CreateEnum
CREATE TYPE "evaluation_status" AS ENUM ('queued', 'running', 'passed', 'failed', 'error');

-- CreateEnum
CREATE TYPE "feedback_rating" AS ENUM ('positive', 'negative');

-- CreateEnum
CREATE TYPE "feedback_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "knowledge_status" NOT NULL DEFAULT 'draft',
    "draft_revision_id" UUID,
    "published_revision_id" UUID,
    "feedback_id" UUID,
    "latest_revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "knowledge_revisions" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" VARCHAR(180) NOT NULL,
    "source_kind" "knowledge_source_kind" NOT NULL,
    "file_id" UUID,
    "content" TEXT,
    "indexed_text" TEXT,
    "status" "knowledge_status" NOT NULL DEFAULT 'draft',
    "content_hash" VARCHAR(64),
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "index_job_id" UUID,
    "evaluation_id" UUID,
    "published_at" TIMESTAMPTZ(3),
    "published_policy" VARCHAR(100),
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_revisions_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL DEFAULT 1,
    "config_revision" INTEGER NOT NULL,
    "dataset_version" VARCHAR(160) NOT NULL,
    "knowledge_revision_id" UUID,
    "knowledge_hash" VARCHAR(64),
    "policy_version" VARCHAR(100) NOT NULL,
    "fixture" BOOLEAN NOT NULL DEFAULT false,
    "status" "evaluation_status" NOT NULL DEFAULT 'queued',
    "total_cases" INTEGER NOT NULL DEFAULT 0,
    "passed_cases" INTEGER NOT NULL DEFAULT 0,
    "critical_failures" INTEGER NOT NULL DEFAULT 0,
    "report_job_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "conversation_feedback" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "rating" "feedback_rating" NOT NULL,
    "correction" TEXT NOT NULL,
    "status" "feedback_status" NOT NULL DEFAULT 'pending',
    "review_reason" VARCHAR(2000),
    "reviewed_by" UUID,
    "redacted_correction" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_feedback_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateIndex
CREATE INDEX "knowledge_documents_shop_id_created_at_id_idx" ON "knowledge_documents"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_documents_shop_id_feedback_id_key" ON "knowledge_documents"("shop_id", "feedback_id");

-- CreateIndex
CREATE INDEX "knowledge_revisions_shop_id_document_id_created_at_id_idx" ON "knowledge_revisions"("shop_id", "document_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_revisions_shop_id_document_id_id_key" ON "knowledge_revisions"("shop_id", "document_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_revisions_shop_id_document_id_revision_key" ON "knowledge_revisions"("shop_id", "document_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_revisions_shop_id_index_job_id_key" ON "knowledge_revisions"("shop_id", "index_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_revisions_shop_id_evaluation_id_key" ON "knowledge_revisions"("shop_id", "evaluation_id");

-- CreateIndex
CREATE INDEX "evaluations_shop_id_created_at_id_idx" ON "evaluations"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_shop_id_report_job_id_key" ON "evaluations"("shop_id", "report_job_id");

-- CreateIndex
CREATE INDEX "conversation_feedback_shop_id_created_at_id_idx" ON "conversation_feedback"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_feedback_shop_id_message_id_actor_id_key" ON "conversation_feedback"("shop_id", "message_id", "actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_messages_shop_id_conversation_id_id_key" ON "channel_messages"("shop_id", "conversation_id", "id");

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_shop_id_id_draft_revision_id_fkey" FOREIGN KEY ("shop_id", "id", "draft_revision_id") REFERENCES "knowledge_revisions"("shop_id", "document_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_shop_id_id_published_revision_id_fkey" FOREIGN KEY ("shop_id", "id", "published_revision_id") REFERENCES "knowledge_revisions"("shop_id", "document_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_shop_id_feedback_id_fkey" FOREIGN KEY ("shop_id", "feedback_id") REFERENCES "conversation_feedback"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_revisions" ADD CONSTRAINT "knowledge_revisions_shop_id_document_id_fkey" FOREIGN KEY ("shop_id", "document_id") REFERENCES "knowledge_documents"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_revisions" ADD CONSTRAINT "knowledge_revisions_shop_id_file_id_fkey" FOREIGN KEY ("shop_id", "file_id") REFERENCES "file_objects"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_revisions" ADD CONSTRAINT "knowledge_revisions_shop_id_index_job_id_fkey" FOREIGN KEY ("shop_id", "index_job_id") REFERENCES "jobs"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_revisions" ADD CONSTRAINT "knowledge_revisions_shop_id_evaluation_id_fkey" FOREIGN KEY ("shop_id", "evaluation_id") REFERENCES "evaluations"("shop_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_revisions" ADD CONSTRAINT "knowledge_revisions_shop_id_approved_by_fkey" FOREIGN KEY ("shop_id", "approved_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_shop_id_knowledge_revision_id_fkey" FOREIGN KEY ("shop_id", "knowledge_revision_id") REFERENCES "knowledge_revisions"("shop_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_shop_id_report_job_id_fkey" FOREIGN KEY ("shop_id", "report_job_id") REFERENCES "jobs"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversation_feedback" ADD CONSTRAINT "conversation_feedback_shop_id_conversation_id_message_id_fkey" FOREIGN KEY ("shop_id", "conversation_id", "message_id") REFERENCES "channel_messages"("shop_id", "conversation_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversation_feedback" ADD CONSTRAINT "conversation_feedback_shop_id_actor_id_fkey" FOREIGN KEY ("shop_id", "actor_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversation_feedback" ADD CONSTRAINT "conversation_feedback_shop_id_reviewed_by_fkey" FOREIGN KEY ("shop_id", "reviewed_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "knowledge_documents" ADD CHECK (version > 0 AND latest_revision > 0
  AND (draft_revision_id IS NULL OR draft_revision_id IS DISTINCT FROM published_revision_id)
  AND (status <> 'published' OR (published_revision_id IS NOT NULL AND draft_revision_id IS NULL)));
ALTER TABLE "knowledge_revisions" ADD CHECK (version > 0 AND revision > 0 AND length(title) BETWEEN 1 AND 180
  AND ((source_kind = 'file') = (file_id IS NOT NULL))
  AND (source_kind = 'file' OR (content IS NOT NULL AND length(content) > 0))
  AND (content_hash IS NULL OR content_hash ~ '^[a-f0-9]{64}$')
  AND (status NOT IN ('ready_for_review','published') OR (content_hash IS NOT NULL AND indexed_text IS NOT NULL))
  AND (status <> 'published' OR (published_at IS NOT NULL AND approved_by IS NOT NULL AND evaluation_id IS NOT NULL AND published_policy IS NOT NULL)));
ALTER TABLE "evaluations" ADD CHECK (version > 0 AND config_revision > 0 AND length(dataset_version) > 0
  AND total_cases >= 0 AND passed_cases BETWEEN 0 AND total_cases AND critical_failures BETWEEN 0 AND total_cases
  AND (knowledge_hash IS NULL OR knowledge_hash ~ '^[a-f0-9]{64}$')
  AND (status <> 'passed' OR (total_cases > 0 AND critical_failures = 0)));
ALTER TABLE "conversation_feedback" ADD CHECK (version > 0
  AND ((status = 'pending') = (reviewed_by IS NULL AND review_reason IS NULL))
  AND (status <> 'approved' OR (redacted_correction IS NOT NULL AND length(redacted_correction) > 0)));

CREATE FUNCTION "preserve_published_knowledge"() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog, public AS $$
BEGIN
  IF OLD.published_at IS NOT NULL AND (
    OLD.status <> 'published' OR NEW.status <> 'retired' OR NEW.version <> OLD.version + 1
    OR to_jsonb(OLD) - ARRAY['status','version','updated_at'] <> to_jsonb(NEW) - ARRAY['status','version','updated_at']
  ) THEN
    RAISE EXCEPTION 'Published knowledge revisions preserve the approved content' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "knowledge_revisions_preserve_publication"
  BEFORE UPDATE ON "knowledge_revisions" FOR EACH ROW EXECUTE FUNCTION "preserve_published_knowledge"();

GRANT SELECT, INSERT, UPDATE ON "knowledge_documents", "knowledge_revisions", "conversation_feedback" TO botsales_runtime;
GRANT SELECT ON "evaluations" TO botsales_runtime;

COMMIT;
