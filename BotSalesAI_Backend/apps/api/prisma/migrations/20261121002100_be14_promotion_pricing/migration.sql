BEGIN;

-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN     "promotion_applied_at" TIMESTAMPTZ(3),
ADD COLUMN     "promotion_id" UUID,
ADD COLUMN     "promotion_snapshot" JSONB;

-- AlterTable
ALTER TABLE "order_quotes" ADD COLUMN     "promotion_snapshot" JSONB;

-- CreateIndex
CREATE INDEX "sales_orders_shop_id_promotion_id_promotion_applied_at_idx" ON "sales_orders"("shop_id", "promotion_id", "promotion_applied_at");

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_shop_id_promotion_id_fkey" FOREIGN KEY ("shop_id", "promotion_id") REFERENCES "promotions"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "sales_orders" ADD CHECK (
  (promotion_id IS NULL AND promotion_snapshot IS NULL AND promotion_applied_at IS NULL)
  OR (promotion_id IS NOT NULL AND promotion_snapshot IS NOT NULL AND jsonb_typeof(promotion_snapshot) = 'object'
    AND promotion_snapshot ?& ARRAY['id','version','name','discount']
    AND (promotion_snapshot->>'id') IS NOT DISTINCT FROM promotion_id::text
    AND (promotion_applied_at IS NULL OR order_state <> 'draft')));
ALTER TABLE "order_quotes" ADD CHECK (promotion_snapshot IS NULL OR
  (jsonb_typeof(promotion_snapshot) = 'object' AND promotion_snapshot ?& ARRAY['id','version','name','discount']));
GRANT INSERT, UPDATE ON "promotions" TO botsales_runtime;
GRANT INSERT, DELETE ON "promotion_lines" TO botsales_runtime;

COMMIT;
