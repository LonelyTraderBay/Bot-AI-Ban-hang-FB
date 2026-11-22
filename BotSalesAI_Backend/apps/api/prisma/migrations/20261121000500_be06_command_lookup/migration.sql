BEGIN;

ALTER TABLE "commands" ADD COLUMN "intent_hash" VARCHAR(64);
UPDATE "commands"
SET "intent_hash" = encode(sha256(convert_to("idempotency_key", 'UTF8')), 'hex');

ALTER TABLE "commands" ADD CONSTRAINT "commands_intent_hash_matches_key"
    CHECK ("intent_hash" IS NULL OR "intent_hash" = encode(sha256(convert_to("idempotency_key", 'UTF8')), 'hex'));

CREATE INDEX "commands_intent_lookup_idx"
    ON "commands" ("shop_id", "actor_id", "operation_id", "intent_hash");

COMMIT;
