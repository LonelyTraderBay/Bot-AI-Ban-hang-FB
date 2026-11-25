ALTER TABLE "prep_lines"
    ADD COLUMN "product_image_file_id" UUID,
    ADD COLUMN "product_image_revision_id" UUID,
    ADD CONSTRAINT "prep_lines_product_image_pair_check"
        CHECK (("product_image_file_id" IS NULL) = ("product_image_revision_id" IS NULL)),
    ADD CONSTRAINT "prep_lines_shop_id_product_image_file_id_fkey"
        FOREIGN KEY ("shop_id", "product_image_file_id") REFERENCES "file_objects" ("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT "prep_lines_shop_id_product_image_revision_id_fkey"
        FOREIGN KEY ("shop_id", "product_image_revision_id") REFERENCES "knowledge_revisions" ("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE INDEX "prep_lines_shop_id_product_image_file_id_idx" ON "prep_lines" ("shop_id", "product_image_file_id");
CREATE INDEX "prep_lines_shop_id_product_image_revision_id_idx" ON "prep_lines" ("shop_id", "product_image_revision_id");
