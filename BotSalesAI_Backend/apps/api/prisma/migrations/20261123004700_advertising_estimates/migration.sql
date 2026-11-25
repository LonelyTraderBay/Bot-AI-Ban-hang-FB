BEGIN;

CREATE TABLE "advertising_estimates" (
    "shop_id" UUID NOT NULL REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accounting_date" DATE NOT NULL,
    "revision" INTEGER NOT NULL CHECK ("revision" > 0),
    "amount" DECIMAL(78,18) NOT NULL CHECK ("amount" >= 0 AND "amount" < 1e60),
    "currency" VARCHAR(3) NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "attestation_hash" VARCHAR(64) NOT NULL CHECK ("attestation_hash" ~ '^[0-9a-f]{64}$'),
    "document_sha256" VARCHAR(64) NOT NULL CHECK ("document_sha256" ~ '^[0-9a-f]{64}$'),
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("shop_id", "id"),
    FOREIGN KEY ("shop_id", "reviewer_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "advertising_estimates_shop_id_accounting_date_revision_key"
    ON "advertising_estimates"("shop_id", "accounting_date", "revision");
CREATE UNIQUE INDEX "advertising_estimates_shop_id_attestation_hash_key"
    ON "advertising_estimates"("shop_id", "attestation_hash");
GRANT SELECT, INSERT ON "advertising_estimates" TO botsales_runtime;

COMMIT;
