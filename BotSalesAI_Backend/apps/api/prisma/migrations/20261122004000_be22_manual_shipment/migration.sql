BEGIN;

ALTER TABLE "shipment_observations" ADD COLUMN "attestation_hash" VARCHAR(64), ADD COLUMN "observed_at" TIMESTAMPTZ(3);
ALTER TABLE "shipment_observations" ADD CONSTRAINT "shipment_observations_attestation"
    CHECK (("attestation_hash" IS NULL AND "observed_at" IS NULL) OR
           ("attestation_hash" IS NOT NULL AND "attestation_hash" ~ '^[0-9a-f]{64}$' AND
            "observed_at" IS NOT NULL AND "observed_at" >= "occurred_at"));

GRANT INSERT ("shop_id", "shipment_id", "external_event_id", "state", "occurred_at", "attestation_hash", "observed_at")
    ON "shipment_observations" TO botsales_runtime;

COMMIT;
