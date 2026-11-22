BEGIN;

ALTER TABLE notification_devices
    ADD COLUMN push_subscription_ciphertext TEXT,
    ADD CONSTRAINT notification_device_web_push_scope CHECK (
        push_subscription_ciphertext IS NULL OR
        (channel = 'web_push' AND status IN ('pending', 'active') AND fixture_outcome = 'unknown')
    );

CREATE UNIQUE INDEX notification_devices_shop_id_id_user_id_key ON notification_devices (shop_id, id, user_id);

ALTER TABLE app_notifications
    ADD COLUMN push_device_id UUID,
    ADD COLUMN push_policy_version INTEGER,
    ADD COLUMN push_work_version INTEGER,
    ADD COLUMN push_deadline_at TIMESTAMPTZ(3),
    ADD COLUMN delivery_started_at TIMESTAMPTZ(3),
    ADD CONSTRAINT app_notifications_shop_id_push_device_id_recipient_user_id_fkey
        FOREIGN KEY (shop_id, push_device_id, recipient_user_id)
        REFERENCES notification_devices (shop_id, id, user_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    ADD CONSTRAINT app_notifications_web_push_scope CHECK (
        (num_nonnulls(push_device_id, push_policy_version, push_work_version, push_deadline_at) = 0 AND delivery_started_at IS NULL) OR
        (num_nonnulls(push_device_id, push_policy_version, push_work_version, push_deadline_at) = 4
          AND channel = 'web_push' AND work_item_id IS NOT NULL AND push_policy_version > 0 AND push_work_version > 0)
    );

CREATE INDEX app_notifications_delivery_queue_idx ON app_notifications (channel, delivery_status, created_at, id);

COMMIT;
