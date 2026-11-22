BEGIN;

-- CreateEnum
CREATE TYPE "conversation_status" AS ENUM ('open', 'resolved');

-- CreateEnum
CREATE TYPE "conversation_mode" AS ENUM ('human', 'bot', 'paused');

-- AlterTable
ALTER TABLE "channel_conversations" ADD COLUMN     "assigned_user_id" UUID,
ADD COLUMN     "channel_id" UUID,
ADD COLUMN     "mode" "conversation_mode" NOT NULL DEFAULT 'paused',
ADD COLUMN     "status" "conversation_status" NOT NULL DEFAULT 'open',
ADD COLUMN     "unread_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "channel_connections" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" VARCHAR(40) NOT NULL,
    "page_id" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_connections_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_connections_shop_id_provider_page_id_key" ON "channel_connections"("shop_id", "provider", "page_id");

-- CreateIndex
CREATE INDEX "channel_conversations_shop_id_customer_id_created_at_id_idx" ON "channel_conversations"("shop_id", "customer_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "channel_conversations_shop_id_created_at_id_idx" ON "channel_conversations"("shop_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channel_conversations" ADD CONSTRAINT "channel_conversations_shop_id_channel_id_fkey" FOREIGN KEY ("shop_id", "channel_id") REFERENCES "channel_connections"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channel_conversations" ADD CONSTRAINT "channel_conversations_shop_id_assigned_user_id_fkey" FOREIGN KEY ("shop_id", "assigned_user_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;


INSERT INTO "channel_connections" (shop_id, provider, page_id)
SELECT DISTINCT i.shop_id, i.channel, i.page_id
FROM "customer_identities" i JOIN "channel_conversations" c
ON c.shop_id = i.shop_id AND c.customer_id = i.customer_id AND c.customer_identity_id = i.id
ON CONFLICT (shop_id, provider, page_id) DO NOTHING;

UPDATE "channel_conversations" c SET channel_id = a.id
FROM "customer_identities" i JOIN "channel_connections" a
ON a.shop_id = i.shop_id AND a.provider = i.channel AND a.page_id = i.page_id
WHERE c.shop_id = i.shop_id AND c.customer_id = i.customer_id AND c.customer_identity_id = i.id;

ALTER TABLE "channel_conversations" ALTER COLUMN channel_id SET NOT NULL;
ALTER TABLE "channel_conversations" ADD CHECK (version > 0 AND unread_count >= 0);
GRANT SELECT ON "channel_connections" TO botsales_runtime;

COMMIT;
