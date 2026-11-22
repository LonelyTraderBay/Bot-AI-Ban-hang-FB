BEGIN;

ALTER TABLE "shops" ADD COLUMN "event_sequence" BIGINT NOT NULL DEFAULT 0
    CHECK ("event_sequence" >= 0);
ALTER TABLE "outbox_events"
    ADD COLUMN "sequence" BIGINT CHECK ("sequence" > 0),
    ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
    ADD COLUMN "lease_token" UUID,
    ADD COLUMN "lease_until" TIMESTAMPTZ(3),
    ADD COLUMN "failed_at" TIMESTAMPTZ(3),
    ADD CONSTRAINT "outbox_lease_pair" CHECK (("lease_token" IS NULL) = ("lease_until" IS NULL));

CREATE UNIQUE INDEX "outbox_events_shop_id_sequence_key" ON "outbox_events"("shop_id", "sequence");
COMMIT;
