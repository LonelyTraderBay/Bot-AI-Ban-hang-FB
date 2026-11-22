BEGIN;

ALTER TABLE "purchase_dispatches" ADD COLUMN "manual_handoff" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "purchase_dispatches" ADD CONSTRAINT "purchase_dispatches_manual_not_scheduled"
    CHECK (NOT "manual_handoff" OR "due_at" IS NULL);

ALTER TABLE "procurement_evidence" ADD COLUMN "attestation_hash" VARCHAR(64), ADD COLUMN "attested_version" INTEGER;
ALTER TABLE "procurement_evidence" ADD CONSTRAINT "procurement_evidence_attestation"
    CHECK (("attestation_hash" IS NULL AND "attested_version" IS NULL) OR
           ("attestation_hash" IS NOT NULL AND "attestation_hash" ~ '^[0-9a-f]{64}$' AND
            "attested_version" IS NOT NULL AND "attested_version" > 0));

GRANT INSERT ("shop_id", "purchase_order_id", "kind", "external_ref", "occurred_at", "attestation_hash", "attested_version")
    ON "procurement_evidence" TO botsales_runtime;

COMMIT;
