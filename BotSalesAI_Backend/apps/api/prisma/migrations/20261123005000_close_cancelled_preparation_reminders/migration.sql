-- Stop reminder schedules and reconcile open recovery tasks for cancelled preparation.
BEGIN;

UPDATE work_notification_schedules AS schedule
SET next_due_at = NULL
FROM work_items AS preparation
WHERE (schedule.shop_id, schedule.work_item_id) = (preparation.shop_id, preparation.id)
  AND preparation.kind = 'prepare_order'
  AND preparation.state = 'cancelled'
  AND schedule.next_due_at IS NOT NULL;

WITH cancelled_tasks AS (
  UPDATE work_items AS recovery
  SET state = 'cancelled',
      blocked_reason = NULL,
      version = recovery.version + 1,
      updated_at = CURRENT_TIMESTAMP
  FROM work_items AS preparation
  JOIN work_notification_schedules AS schedule
    ON (schedule.shop_id, schedule.work_item_id) = (preparation.shop_id, preparation.id)
  WHERE (recovery.shop_id, recovery.source_id) = (preparation.shop_id, preparation.id)
    AND preparation.kind = 'prepare_order'
    AND preparation.state = 'cancelled'
    AND recovery.kind = 'recovery'
    AND recovery.source_type = 'notification_schedule'
    AND recovery.state IN ('queued', 'claimed', 'working', 'blocked')
  RETURNING recovery.shop_id, recovery.id, recovery.version
)
INSERT INTO outbox_events (shop_id, event_type, payload)
SELECT shop_id, 'work_item.updated',
       jsonb_build_object('resourceType', 'work_item', 'resourceId', id, 'resourceVersion', version)
FROM cancelled_tasks;

COMMIT;
