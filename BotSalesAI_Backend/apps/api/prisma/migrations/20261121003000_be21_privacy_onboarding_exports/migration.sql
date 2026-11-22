BEGIN;

-- CreateEnum
CREATE TYPE "privacy_request_kind" AS ENUM ('export', 'delete');

-- CreateEnum
CREATE TYPE "privacy_request_state" AS ENUM ('pending_approval', 'running', 'completed', 'rejected', 'legal_hold', 'failed');

-- CreateEnum
CREATE TYPE "consent_channel" AS ENUM ('messenger', 'sms', 'email');

-- CreateEnum
CREATE TYPE "consent_state" AS ENUM ('granted', 'withdrawn');

-- CreateEnum
CREATE TYPE "consent_challenge_state" AS ENUM ('pending', 'exchanged', 'confirmed', 'declined', 'expired');

-- Extend file purposes for internal exports.
ALTER TYPE "file_purpose" ADD VALUE 'report_export';
ALTER TYPE "file_purpose" ADD VALUE 'privacy_export';

-- AlterTable
ALTER TABLE "channel_messages" ADD COLUMN     "redacted_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "privacy_erased_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "file_objects" ADD COLUMN     "expires_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "step_up_failures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "step_up_window_until" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "step_up_grants" (
    "token_hash" VARCHAR(64) NOT NULL,
    "session_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_up_grants_pkey" PRIMARY KEY ("token_hash")
);

-- CreateTable
CREATE TABLE "privacy_policies" (
    "shop_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "chat_retention_days" INTEGER,
    "jurisdiction_note" VARCHAR(2000) NOT NULL DEFAULT '',
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "privacy_policies_pkey" PRIMARY KEY ("shop_id")
);

-- CreateTable
CREATE TABLE "privacy_requests" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL DEFAULT 1,
    "customer_id" UUID NOT NULL,
    "kind" "privacy_request_kind" NOT NULL,
    "status" "privacy_request_state" NOT NULL DEFAULT 'pending_approval',
    "reason" VARCHAR(2000) NOT NULL,
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "policy_version" INTEGER,
    "job_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "customer_consents" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "channel" "consent_channel" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "consent_state" NOT NULL,
    "policy_version" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_consents_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "consent_challenges" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "channel" "consent_channel" NOT NULL,
    "withdraw" BOOLEAN NOT NULL DEFAULT false,
    "status" "consent_challenge_state" NOT NULL DEFAULT 'pending',
    "version" INTEGER NOT NULL DEFAULT 1,
    "message" VARCHAR(2000) NOT NULL,
    "content_version" INTEGER NOT NULL,
    "policy_version" VARCHAR(100) NOT NULL,
    "prior_consent_version" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "exchange_hash" VARCHAR(64),
    "confirmation_hash" VARCHAR(64),
    "consent_id" UUID,
    "result_version" INTEGER,
    "result_status" "consent_state",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "consent_challenges_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "consent_evidence" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consent_id" UUID NOT NULL,
    "challenge_id" UUID,
    "privacy_request_id" UUID,
    "content_version" INTEGER,
    "action" VARCHAR(20) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_evidence_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "shop_creation_intents" (
    "actor_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "shop_id" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_creation_intents_pkey" PRIMARY KEY ("actor_id","idempotency_key")
);

-- CreateIndex
CREATE INDEX "step_up_grants_session_id_expires_at_idx" ON "step_up_grants"("session_id", "expires_at");

-- CreateIndex
CREATE INDEX "privacy_requests_shop_id_created_at_id_idx" ON "privacy_requests"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "privacy_requests_shop_id_customer_id_kind_status_idx" ON "privacy_requests"("shop_id", "customer_id", "kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_requests_shop_id_job_id_key" ON "privacy_requests"("shop_id", "job_id");

-- CreateIndex
CREATE INDEX "customer_consents_shop_id_created_at_id_idx" ON "customer_consents"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_consents_shop_id_customer_id_channel_key" ON "customer_consents"("shop_id", "customer_id", "channel");

-- CreateIndex
CREATE INDEX "consent_challenges_shop_id_created_at_id_idx" ON "consent_challenges"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "consent_challenges_shop_id_customer_id_channel_status_idx" ON "consent_challenges"("shop_id", "customer_id", "channel", "status");

-- CreateIndex
CREATE INDEX "consent_evidence_shop_id_consent_id_occurred_at_id_idx" ON "consent_evidence"("shop_id", "consent_id", "occurred_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "consent_evidence_shop_id_challenge_id_action_key" ON "consent_evidence"("shop_id", "challenge_id", "action");

-- CreateIndex
CREATE UNIQUE INDEX "consent_evidence_shop_id_privacy_request_id_consent_id_key" ON "consent_evidence"("shop_id", "privacy_request_id", "consent_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_creation_intents_shop_id_key" ON "shop_creation_intents"("shop_id");

-- AddForeignKey
ALTER TABLE "step_up_grants" ADD CONSTRAINT "step_up_grants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "privacy_policies" ADD CONSTRAINT "privacy_policies_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "privacy_policies" ADD CONSTRAINT "privacy_policies_shop_id_approved_by_fkey" FOREIGN KEY ("shop_id", "approved_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_shop_id_created_by_fkey" FOREIGN KEY ("shop_id", "created_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_shop_id_approved_by_fkey" FOREIGN KEY ("shop_id", "approved_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_shop_id_job_id_fkey" FOREIGN KEY ("shop_id", "job_id") REFERENCES "jobs"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consent_challenges" ADD CONSTRAINT "consent_challenges_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consent_challenges" ADD CONSTRAINT "consent_challenges_shop_id_actor_id_fkey" FOREIGN KEY ("shop_id", "actor_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consent_challenges" ADD CONSTRAINT "consent_challenges_shop_id_consent_id_fkey" FOREIGN KEY ("shop_id", "consent_id") REFERENCES "customer_consents"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consent_evidence" ADD CONSTRAINT "consent_evidence_shop_id_consent_id_fkey" FOREIGN KEY ("shop_id", "consent_id") REFERENCES "customer_consents"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consent_evidence" ADD CONSTRAINT "consent_evidence_shop_id_challenge_id_fkey" FOREIGN KEY ("shop_id", "challenge_id") REFERENCES "consent_challenges"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consent_evidence" ADD CONSTRAINT "consent_evidence_shop_id_privacy_request_id_fkey" FOREIGN KEY ("shop_id", "privacy_request_id") REFERENCES "privacy_requests"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shop_creation_intents" ADD CONSTRAINT "shop_creation_intents_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shop_creation_intents" ADD CONSTRAINT "shop_creation_intents_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE public.sessions ADD CONSTRAINT sessions_step_up_failure_window_check CHECK (
    step_up_failures BETWEEN 0 AND 5 AND (step_up_failures = 0) = (step_up_window_until IS NULL)
);
ALTER TABLE public.step_up_grants ADD CONSTRAINT step_up_grants_hash_check CHECK (token_hash ~ '^[a-f0-9]{64}$');
ALTER TABLE public.privacy_policies ADD CONSTRAINT privacy_policies_retention_check
    CHECK (chat_retention_days BETWEEN 1 AND 36500 AND length(jurisdiction_note) >= 5);
ALTER TABLE public.privacy_requests ADD CONSTRAINT privacy_requests_job_binding_check CHECK (
    (job_id IS NULL AND approved_by IS NULL AND policy_version IS NULL)
    OR (job_id IS NOT NULL AND approved_by IS NOT NULL AND policy_version IS NOT NULL)
);
ALTER TABLE public.consent_evidence ADD CONSTRAINT consent_evidence_source_check
    CHECK ((challenge_id IS NOT NULL) <> (privacy_request_id IS NOT NULL));
ALTER TABLE public.shop_creation_intents ADD CONSTRAINT shop_creation_intents_request_hash_check CHECK (request_hash ~ '^[a-f0-9]{64}$');

CREATE INDEX file_objects_retention_expiry_idx ON public.file_objects (expires_at, shop_id, id) WHERE expires_at IS NOT NULL;
CREATE INDEX channel_messages_retention_pending_idx ON public.channel_messages (shop_id, created_at, id) WHERE redacted_at IS NULL;

-- Keep the runtime role unable to delete arbitrary blobs. Sweep only expired exports and media retired by privacy processing.
CREATE FUNCTION public.purge_expired_private_blobs(batch_limit integer)
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $function$
    WITH eligible AS (
        SELECT f.shop_id, f.id
        FROM public.file_objects AS f
        JOIN public.file_blobs AS b ON b.shop_id = f.shop_id AND b.file_id = f.id
        WHERE f.expires_at <= statement_timestamp()
          AND (f.purpose::text IN ('report_export', 'privacy_export')
            OR (f.purpose::text = 'conversation_media' AND f.status::text = 'rejected'))
        ORDER BY f.expires_at, f.shop_id, f.id
        LIMIT LEAST(GREATEST(COALESCE(batch_limit, 0), 0), 100)
        FOR UPDATE OF f SKIP LOCKED
    ), purged AS (
        DELETE FROM public.file_blobs AS b USING eligible AS e
        WHERE b.shop_id = e.shop_id AND b.file_id = e.id
        RETURNING 1
    )
    SELECT count(*)::integer FROM purged;
$function$;
REVOKE ALL ON FUNCTION public.purge_expired_private_blobs(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_private_blobs(integer) TO botsales_runtime;

GRANT SELECT, INSERT ON public.shop_creation_intents, public.consent_evidence TO botsales_runtime;
GRANT SELECT, INSERT, UPDATE ON public.step_up_grants, public.privacy_policies, public.privacy_requests,
    public.customer_consents, public.consent_challenges TO botsales_runtime;

COMMIT;
