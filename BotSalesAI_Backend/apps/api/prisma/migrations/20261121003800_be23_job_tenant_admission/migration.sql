BEGIN;

CREATE INDEX "jobs_shop_id_status_due_at_id_idx" ON "jobs"("shop_id", "status", "due_at", "id");
CREATE INDEX "jobs_shop_id_status_lease_until_idx" ON "jobs"("shop_id", "status", "lease_until");

COMMIT;
