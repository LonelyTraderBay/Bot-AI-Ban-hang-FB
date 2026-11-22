BEGIN;
ALTER TABLE "memberships" ADD COLUMN "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "memberships_shop_id_created_at_id_idx" ON "memberships" ("shop_id", "created_at", "id");
COMMIT;
