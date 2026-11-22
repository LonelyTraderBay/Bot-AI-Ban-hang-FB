BEGIN;

-- CreateEnum
CREATE TYPE "address_status" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "service_case_kind" AS ENUM ('question', 'complaint', 'return_request', 'delivery_issue');

-- CreateEnum
CREATE TYPE "service_case_state" AS ENUM ('open', 'assigned', 'resolved', 'closed');

-- CreateTable
CREATE TABLE "customers" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "display_name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(40),
    "email" TEXT,
    "notes" TEXT,
    "redacted_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "customer_identities" (
    "shop_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "channel" VARCHAR(40) NOT NULL,
    "page_id" VARCHAR(160) NOT NULL,
    "external_id" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("shop_id","channel","page_id","external_id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "shop_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" VARCHAR(120),
    "recipient" VARCHAR(160),
    "phone" VARCHAR(40),
    "line1" VARCHAR(500),
    "ward" VARCHAR(120),
    "district" VARCHAR(120),
    "province" VARCHAR(120),
    "postal_code" VARCHAR(20),
    "country_code" VARCHAR(2),
    "status" "address_status" NOT NULL DEFAULT 'active',
    "redacted_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("shop_id","customer_id","id")
);

-- CreateTable
CREATE TABLE "address_snapshots" (
    "shop_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "address_id" UUID NOT NULL,
    "address_version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "address_snapshots_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "service_cases" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "work_item_id" UUID,
    "kind" "service_case_kind" NOT NULL,
    "state" "service_case_state" NOT NULL DEFAULT 'open',
    "summary" VARCHAR(2000) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_cases_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateIndex
CREATE INDEX "customers_shop_id_created_at_id_idx" ON "customers"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "customer_identities_shop_id_customer_id_idx" ON "customer_identities"("shop_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_addresses_shop_id_customer_id_created_at_id_idx" ON "customer_addresses"("shop_id", "customer_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "address_snapshots_source_version_key" ON "address_snapshots"("shop_id", "customer_id", "address_id", "address_version");

-- CreateIndex
CREATE INDEX "service_cases_shop_id_created_at_id_idx" ON "service_cases"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "service_cases_shop_id_customer_id_idx" ON "service_cases"("shop_id", "customer_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "address_snapshots" ADD CONSTRAINT "address_snapshots_shop_id_customer_id_address_id_fkey" FOREIGN KEY ("shop_id", "customer_id", "address_id") REFERENCES "customer_addresses"("shop_id", "customer_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_cases" ADD CONSTRAINT "service_cases_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;


GRANT SELECT, INSERT, UPDATE ON "customers", "customer_identities", "customer_addresses", "service_cases" TO botsales_runtime;
GRANT SELECT, INSERT ON "address_snapshots" TO botsales_runtime;
COMMIT;
