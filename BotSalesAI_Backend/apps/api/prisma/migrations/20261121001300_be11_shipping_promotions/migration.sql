BEGIN;

-- CreateEnum
CREATE TYPE "promotion_status" AS ENUM ('draft', 'active', 'paused');

-- CreateTable
CREATE TABLE "shipping_policies" (
    "shop_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "rules" JSONB NOT NULL,

    CONSTRAINT "shipping_policies_pkey" PRIMARY KEY ("shop_id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(120) NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "discount_amount" DECIMAL(16,4) NOT NULL,
    "min_margin_percent" INTEGER NOT NULL,
    "status" "promotion_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "promotion_lines" (
    "shop_id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sku" VARCHAR(160) NOT NULL,
    "label" VARCHAR(500) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "promotion_lines_pkey" PRIMARY KEY ("shop_id","promotion_id","variant_id")
);

-- CreateIndex
CREATE INDEX "promotions_shop_id_status_starts_on_ends_on_idx" ON "promotions"("shop_id", "status", "starts_on", "ends_on");

-- CreateIndex
CREATE INDEX "promotions_shop_id_created_at_id_idx" ON "promotions"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_lines_shop_id_promotion_id_position_key" ON "promotion_lines"("shop_id", "promotion_id", "position");

-- AddForeignKey
ALTER TABLE "shipping_policies" ADD CONSTRAINT "shipping_policies_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_lines" ADD CONSTRAINT "promotion_lines_shop_id_promotion_id_fkey" FOREIGN KEY ("shop_id", "promotion_id") REFERENCES "promotions"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_lines" ADD CONSTRAINT "promotion_lines_shop_id_variant_id_fkey" FOREIGN KEY ("shop_id", "variant_id") REFERENCES "variants"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;


ALTER TABLE "shipping_policies" ADD CHECK (version > 0 AND jsonb_typeof(rules) = 'array' AND jsonb_array_length(rules) <= 100);
ALTER TABLE "promotions" ADD CHECK (version > 0 AND starts_on <= ends_on AND discount_amount >= 0 AND min_margin_percent BETWEEN 0 AND 99);
ALTER TABLE "promotion_lines" ADD CHECK (quantity BETWEEN 1 AND 1000000 AND position >= 0);
GRANT SELECT, INSERT, UPDATE ON "shipping_policies" TO botsales_runtime;
GRANT SELECT ON "promotions", "promotion_lines" TO botsales_runtime;

COMMIT;
