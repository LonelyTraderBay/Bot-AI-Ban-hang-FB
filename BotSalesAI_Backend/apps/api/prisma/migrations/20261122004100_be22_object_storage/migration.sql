BEGIN;

CREATE TYPE "file_storage_state" AS ENUM ('pending', 'stored', 'purged');
CREATE TABLE "file_storage" (
    "shop_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "target_id" VARCHAR(64) NOT NULL CHECK ("target_id" ~ '^[0-9a-f]{64}$'),
    "state" "file_storage_state" NOT NULL DEFAULT 'pending',
    "due_at" TIMESTAMPTZ(3),
    "lease_until" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" BETWEEN 0 AND 10),
    CONSTRAINT "file_storage_pkey" PRIMARY KEY ("shop_id", "file_id"),
    CONSTRAINT "file_storage_shop_id_file_id_fkey" FOREIGN KEY ("shop_id", "file_id")
        REFERENCES "file_objects"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE INDEX "file_storage_target_id_state_due_at_idx" ON "file_storage"("target_id", "state", "due_at");
GRANT SELECT, INSERT, UPDATE ON "file_storage" TO botsales_runtime;
GRANT DELETE ON "file_blobs" TO botsales_runtime;

COMMIT;
