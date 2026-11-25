BEGIN;

ALTER TABLE "message_dispatches" ADD COLUMN "after_sales_request_id" UUID;
ALTER TABLE "message_dispatches" ADD CONSTRAINT "message_dispatches_shop_id_after_sales_request_id_fkey"
    FOREIGN KEY ("shop_id", "after_sales_request_id") REFERENCES "channel_messages"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "message_dispatches" ADD CONSTRAINT "message_dispatches_after_sales_is_bot"
    CHECK ("after_sales_request_id" IS NULL OR ("bot_generation" IS NOT NULL AND "after_sales_request_id" <> "message_id"));
CREATE INDEX "message_dispatches_shop_id_after_sales_request_id_idx" ON "message_dispatches"("shop_id", "after_sales_request_id");

COMMIT;
