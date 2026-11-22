BEGIN;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "row_errors" JSONB;

-- CreateTable
CREATE TABLE "product_import_previews" (
    "shop_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "catalog_version" BIGINT NOT NULL,
    "rows" JSONB NOT NULL,
    "commit_job_id" UUID,

    CONSTRAINT "product_import_previews_pkey" PRIMARY KEY ("shop_id","job_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_import_previews_shop_id_commit_job_id_key" ON "product_import_previews"("shop_id", "commit_job_id");

-- AddForeignKey
ALTER TABLE "product_import_previews" ADD CONSTRAINT "product_import_previews_shop_id_job_id_fkey" FOREIGN KEY ("shop_id", "job_id") REFERENCES "jobs"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_import_previews" ADD CONSTRAINT "product_import_previews_shop_id_commit_job_id_fkey" FOREIGN KEY ("shop_id", "commit_job_id") REFERENCES "jobs"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;


ALTER TABLE "product_import_previews" ADD CHECK (token ~ '^[0-9a-f]{64}$' AND (commit_job_id IS NULL OR job_id <> commit_job_id));
GRANT SELECT, INSERT, UPDATE ON "product_import_previews" TO botsales_runtime;
COMMIT;
