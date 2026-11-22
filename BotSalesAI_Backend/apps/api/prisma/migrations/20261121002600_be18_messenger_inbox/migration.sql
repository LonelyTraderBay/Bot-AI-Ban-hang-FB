BEGIN;

-- CreateEnum
CREATE TYPE "message_sender_kind" AS ENUM ('customer', 'human', 'bot', 'system');

-- CreateEnum
CREATE TYPE "message_delivery_status" AS ENUM ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'unknown');

-- CreateEnum
CREATE TYPE "channel_status" AS ENUM ('unconfigured', 'validating', 'connected', 'degraded', 'expired', 'disabled');

-- AlterEnum
ALTER TYPE "message_direction" ADD VALUE 'internal';

-- AlterTable
ALTER TABLE "channel_connections" ADD COLUMN     "generation" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "last_webhook_at" TIMESTAMPTZ(3),
ADD COLUMN     "name" VARCHAR(160),
ADD COLUMN     "policy_verified_at" TIMESTAMPTZ(3),
ADD COLUMN     "policy_version" VARCHAR(100),
ADD COLUMN     "status" "channel_status" NOT NULL DEFAULT 'unconfigured',
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "channel_conversations" ADD COLUMN     "generation" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "last_inbound_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "channel_messages" ADD COLUMN     "client_message_id" VARCHAR(128),
ADD COLUMN     "sender_kind" "message_sender_kind",
ADD COLUMN     "status" "message_delivery_status" NOT NULL DEFAULT 'delivered',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "channel_authorizations" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "channel_id" UUID,
    "generation" INTEGER,
    "return_path" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_authorizations_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "channel_events" (
    "shop_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "external_id" VARCHAR(160) NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_events_pkey" PRIMARY KEY ("shop_id","channel_id","external_id")
);

-- CreateTable
CREATE TABLE "channel_attachments" (
    "shop_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "channel_attachments_pkey" PRIMARY KEY ("shop_id","message_id","file_id")
);

-- CreateTable
CREATE TABLE "message_dispatches" (
    "shop_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "command_id" UUID NOT NULL,
    "conversation_generation" INTEGER NOT NULL,
    "channel_generation" INTEGER NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_dispatches_pkey" PRIMARY KEY ("shop_id","message_id")
);

-- CreateIndex
CREATE INDEX "channel_authorizations_shop_id_actor_id_expires_at_idx" ON "channel_authorizations"("shop_id", "actor_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "channel_attachments_shop_id_message_id_position_key" ON "channel_attachments"("shop_id", "message_id", "position");

-- CreateIndex
CREATE INDEX "message_dispatches_finished_at_created_at_idx" ON "message_dispatches"("finished_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "message_dispatches_shop_id_command_id_key" ON "message_dispatches"("shop_id", "command_id");

-- CreateIndex
CREATE INDEX "channel_connections_provider_page_id_status_idx" ON "channel_connections"("provider", "page_id", "status");

-- CreateIndex
CREATE INDEX "channel_connections_shop_id_created_at_id_idx" ON "channel_connections"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_conversations_shop_id_channel_id_external_id_key" ON "channel_conversations"("shop_id", "channel_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_messages_shop_id_conversation_id_client_message_id_key" ON "channel_messages"("shop_id", "conversation_id", "client_message_id");

-- AddForeignKey
ALTER TABLE "channel_authorizations" ADD CONSTRAINT "channel_authorizations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channel_authorizations" ADD CONSTRAINT "channel_authorizations_shop_id_actor_id_fkey" FOREIGN KEY ("shop_id", "actor_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channel_authorizations" ADD CONSTRAINT "channel_authorizations_shop_id_channel_id_fkey" FOREIGN KEY ("shop_id", "channel_id") REFERENCES "channel_connections"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channel_events" ADD CONSTRAINT "channel_events_shop_id_channel_id_fkey" FOREIGN KEY ("shop_id", "channel_id") REFERENCES "channel_connections"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channel_attachments" ADD CONSTRAINT "channel_attachments_shop_id_message_id_fkey" FOREIGN KEY ("shop_id", "message_id") REFERENCES "channel_messages"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channel_attachments" ADD CONSTRAINT "channel_attachments_shop_id_file_id_fkey" FOREIGN KEY ("shop_id", "file_id") REFERENCES "file_objects"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_dispatches" ADD CONSTRAINT "message_dispatches_shop_id_command_id_fkey" FOREIGN KEY ("shop_id", "command_id") REFERENCES "commands"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_dispatches" ADD CONSTRAINT "message_dispatches_shop_id_message_id_fkey" FOREIGN KEY ("shop_id", "message_id") REFERENCES "channel_messages"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

UPDATE channel_conversations c
SET last_inbound_at = known.latest
FROM (SELECT shop_id, conversation_id, max(created_at) AS latest FROM channel_messages WHERE direction='inbound'
      GROUP BY shop_id, conversation_id) known
WHERE known.shop_id=c.shop_id AND known.conversation_id=c.id;

CREATE UNIQUE INDEX "channel_connections_connected_page_key" ON "channel_connections" (provider, page_id)
  WHERE status='connected';
ALTER TABLE "channel_connections" ADD CHECK (version > 0 AND generation > 0 AND
  (status <> 'connected' OR (policy_version IS NOT NULL AND policy_verified_at IS NOT NULL)));
ALTER TABLE "channel_conversations" ADD CHECK (generation > 0);
ALTER TABLE "channel_messages" ADD CHECK (version > 0 AND (client_message_id IS NULL OR direction='outbound'));
ALTER TABLE "channel_authorizations" ADD CHECK (expires_at > created_at AND ((channel_id IS NULL) = (generation IS NULL)) AND
  (used_at IS NULL OR used_at BETWEEN created_at AND expires_at));
ALTER TABLE "channel_events" ADD CHECK (content_hash ~ '^[a-f0-9]{64}$');
ALTER TABLE "channel_attachments" ADD CHECK (position BETWEEN 0 AND 4);
ALTER TABLE "message_dispatches" ADD CHECK (conversation_generation > 0 AND channel_generation > 0
  AND (finished_at IS NULL OR finished_at >= created_at));

CREATE FUNCTION "enforce_channel_attachment_scope"() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog, public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.channel_messages m
    JOIN public.file_objects f ON f.shop_id=m.shop_id AND f.id=NEW.file_id AND f.resource_id=m.conversation_id
    WHERE m.shop_id=NEW.shop_id AND m.id=NEW.message_id AND f.purpose='conversation_media' AND f.status='ready'
  ) THEN
    RAISE EXCEPTION 'Attachment belongs to a different conversation or purpose' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "channel_attachments_validate_scope"
  BEFORE INSERT ON "channel_attachments" FOR EACH ROW EXECUTE FUNCTION "enforce_channel_attachment_scope"();

GRANT INSERT, UPDATE ON "channel_connections", "channel_conversations", "channel_messages" TO botsales_runtime;
GRANT SELECT, INSERT, UPDATE ON "channel_authorizations", "message_dispatches" TO botsales_runtime;
GRANT SELECT, INSERT ON "channel_events", "channel_attachments" TO botsales_runtime;

COMMIT;
