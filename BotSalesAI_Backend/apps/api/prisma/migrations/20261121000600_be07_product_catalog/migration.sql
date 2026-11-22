BEGIN;

CREATE TYPE "product_status" AS ENUM ('draft', 'active', 'archived');

CREATE TABLE "categories" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "parent_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("shop_id", "id"),
    CONSTRAINT "categories_no_self_parent" CHECK ("parent_id" IS DISTINCT FROM "id"),
    CONSTRAINT "categories_shop_id_fkey" FOREIGN KEY ("shop_id")
        REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "categories_shop_id_parent_id_fkey" FOREIGN KEY ("shop_id", "parent_id")
        REFERENCES "categories"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "categories_shop_id_parent_id_idx" ON "categories"("shop_id", "parent_id");
CREATE INDEX "categories_shop_id_created_at_id_idx" ON "categories"("shop_id", "created_at", "id");

CREATE TABLE "products" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" UUID,
    "status" "product_status" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("shop_id", "id"),
    CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id")
        REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "products_shop_id_category_id_fkey" FOREIGN KEY ("shop_id", "category_id")
        REFERENCES "categories"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "products_shop_id_category_id_idx" ON "products"("shop_id", "category_id");
CREATE INDEX "products_shop_id_created_at_id_idx" ON "products"("shop_id", "created_at", "id");

CREATE TABLE "variants" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "sku_key" TEXT NOT NULL CHECK ("sku_key" <> ''),
    "name" VARCHAR(160) NOT NULL,
    "options" JSONB NOT NULL CHECK (jsonb_typeof("options") = 'object'),
    "price_amount" DECIMAL(78, 18) NOT NULL CHECK ("price_amount" > 0),
    "price_currency" VARCHAR(3) NOT NULL CHECK ("price_currency" ~ '^[A-Z]{3}$'),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL CHECK ("position" >= 0),
    "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "variants_pkey" PRIMARY KEY ("shop_id", "id"),
    CONSTRAINT "variants_shop_id_product_id_fkey" FOREIGN KEY ("shop_id", "product_id")
        REFERENCES "products"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "variants_shop_id_sku_key_key" ON "variants"("shop_id", "sku_key");
CREATE INDEX "variants_shop_id_product_id_position_idx" ON "variants"("shop_id", "product_id", "position");

GRANT SELECT, INSERT, UPDATE ON "categories", "products", "variants" TO botsales_runtime;
COMMIT;
