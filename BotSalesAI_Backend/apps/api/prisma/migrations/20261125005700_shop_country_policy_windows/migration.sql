ALTER TABLE "shops"
    ADD COLUMN "business_country" VARCHAR(2),
    ADD CONSTRAINT "shops_business_country_format" CHECK ("business_country" ~ '^[A-Z]{2}$');

ALTER TABLE "knowledge_revisions"
    ADD COLUMN "policy_key" VARCHAR(100),
    ADD COLUMN "valid_from" DATE,
    ADD COLUMN "valid_until" DATE,
    ADD CONSTRAINT "knowledge_revisions_valid_window" CHECK ("valid_from" <= "valid_until"),
    ADD CONSTRAINT "knowledge_revisions_policy_key_window" CHECK (
        "policy_key" IS NULL OR (
            "valid_from" IS NOT NULL AND "valid_until" IS NOT NULL
            AND "policy_key" ~ '^(promotion|faq|shipping|returns):[a-z0-9]+(-[a-z0-9]+)*$'
        )
    );

CREATE INDEX "knowledge_revisions_shop_policy_status_idx" ON "knowledge_revisions" ("shop_id", "policy_key", "status");
