BEGIN;

CREATE TABLE "marketing_evidence" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID,
    "entry_id" UUID,
    "revision" INTEGER NOT NULL CHECK ("revision" > 0),
    "accounting_date" DATE NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "campaign_id" VARCHAR(100) NOT NULL,
    "confidence" VARCHAR(10) NOT NULL,
    "source_id" VARCHAR(160) NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "attestation_hash" VARCHAR(64) NOT NULL CHECK ("attestation_hash" ~ '^[0-9a-f]{64}$'),
    "document_sha256" VARCHAR(64) NOT NULL CHECK ("document_sha256" ~ '^[0-9a-f]{64}$'),
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("shop_id", "id"),
    CHECK (("entry_id" IS NULL AND "order_id" IS NOT NULL AND "confidence" IN ('known', 'estimated'))
        OR ("order_id" IS NULL AND "entry_id" IS NOT NULL AND "confidence" = 'known')),
    FOREIGN KEY ("shop_id", "order_id") REFERENCES "sales_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    FOREIGN KEY ("shop_id", "entry_id") REFERENCES "finance_entries"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    FOREIGN KEY ("shop_id", "reviewer_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "marketing_evidence_shop_id_order_id_revision_key" ON "marketing_evidence"("shop_id", "order_id", "revision");
CREATE UNIQUE INDEX "marketing_evidence_shop_id_entry_id_revision_key" ON "marketing_evidence"("shop_id", "entry_id", "revision");
CREATE UNIQUE INDEX "marketing_evidence_shop_id_source_id_key" ON "marketing_evidence"("shop_id", "source_id");
CREATE UNIQUE INDEX "marketing_evidence_shop_id_attestation_hash_key" ON "marketing_evidence"("shop_id", "attestation_hash");
GRANT SELECT, INSERT ON "marketing_evidence" TO botsales_runtime;

COMMIT;
