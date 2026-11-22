BEGIN;

-- CreateEnum
CREATE TYPE "file_purpose" AS ENUM ('product_image', 'product_import', 'knowledge_source', 'bank_statement', 'cod_statement', 'conversation_media');

-- CreateEnum
CREATE TYPE "file_status" AS ENUM ('quarantined', 'ready', 'rejected');

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "catalog_version" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "variants" ADD COLUMN     "archived_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "file_objects" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "uploader_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "purpose" "file_purpose" NOT NULL,
    "resource_id" UUID,
    "status" "file_status" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "file_blobs" (
    "shop_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "bytes" BYTEA NOT NULL,

    CONSTRAINT "file_blobs_pkey" PRIMARY KEY ("shop_id","file_id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("shop_id","product_id","file_id")
);

-- CreateIndex
CREATE INDEX "file_objects_shop_id_uploader_id_purpose_idx" ON "file_objects"("shop_id", "uploader_id", "purpose");

-- CreateIndex
CREATE INDEX "product_images_shop_id_product_id_position_idx" ON "product_images"("shop_id", "product_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_shop_id_file_id_key" ON "product_images"("shop_id", "file_id");

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_shop_id_uploader_id_fkey" FOREIGN KEY ("shop_id", "uploader_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "file_blobs" ADD CONSTRAINT "file_blobs_shop_id_file_id_fkey" FOREIGN KEY ("shop_id", "file_id") REFERENCES "file_objects"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_shop_id_product_id_fkey" FOREIGN KEY ("shop_id", "product_id") REFERENCES "products"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_shop_id_file_id_fkey" FOREIGN KEY ("shop_id", "file_id") REFERENCES "file_objects"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;


ALTER TABLE "file_objects" ADD CHECK (size_bytes BETWEEN 1 AND 5242880 AND sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE "product_images" ADD CHECK (position >= 0);
GRANT SELECT, INSERT, UPDATE ON "file_objects" TO botsales_runtime;
GRANT SELECT, INSERT ON "file_blobs" TO botsales_runtime;
GRANT SELECT, INSERT, DELETE ON "product_images" TO botsales_runtime;
COMMIT;
