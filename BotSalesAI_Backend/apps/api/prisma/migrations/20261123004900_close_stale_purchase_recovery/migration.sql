-- Reconcile active recovery tasks left by an already cancelled purchase.
BEGIN;

WITH cancelled_tasks AS (
  UPDATE work_items AS work
  SET state = 'cancelled',
      blocked_reason = NULL,
      version = work.version + 1,
      updated_at = CURRENT_TIMESTAMP
  FROM purchase_orders AS purchase
  WHERE (work.shop_id, work.source_id) = (purchase.shop_id, purchase.id)
    AND work.kind = 'recovery'
    AND work.source_type = 'purchase_order'
    AND work.state IN ('queued', 'claimed', 'working', 'blocked')
    AND purchase.status = 'cancelled'
  RETURNING work.shop_id, work.id, work.version
)
INSERT INTO outbox_events (shop_id, event_type, payload)
SELECT shop_id, 'work_item.updated',
       jsonb_build_object('resourceType', 'work_item', 'resourceId', id, 'resourceVersion', version)
FROM cancelled_tasks;

COMMIT;
