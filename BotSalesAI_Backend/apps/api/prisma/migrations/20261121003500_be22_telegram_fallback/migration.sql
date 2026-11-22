BEGIN;

ALTER TABLE telegram_pairings
    ADD COLUMN telegram_bot_id VARCHAR(16),
    ADD COLUMN telegram_update_id BIGINT,
    ADD CONSTRAINT telegram_pairing_update_scope CHECK (
        telegram_update_id IS NULL OR (telegram_bot_id IS NOT NULL AND used_at IS NOT NULL AND telegram_update_id >= 0)
    );
CREATE UNIQUE INDEX telegram_pairings_telegram_bot_id_telegram_update_id_key ON telegram_pairings (telegram_bot_id, telegram_update_id);

ALTER TABLE notification_devices
    ADD COLUMN telegram_chat_ciphertext TEXT,
    ADD CONSTRAINT notification_device_telegram_scope CHECK (
        telegram_chat_ciphertext IS NULL OR (channel = 'telegram' AND status = 'active' AND fixture_outcome = 'unknown')
    );

ALTER TABLE app_notifications
    ADD COLUMN push_device_version INTEGER,
    DROP CONSTRAINT app_notifications_web_push_scope,
    ADD CONSTRAINT app_notifications_external_scope CHECK (
        (num_nonnulls(push_device_id, push_policy_version, push_work_version, push_deadline_at, push_device_version) = 0 AND delivery_started_at IS NULL) OR
        (num_nonnulls(push_device_id, push_policy_version, push_work_version, push_deadline_at) = 4
          AND channel IN ('web_push', 'telegram') AND work_item_id IS NOT NULL AND push_policy_version > 0 AND push_work_version > 0
          AND (push_device_version IS NULL OR push_device_version > 0))
    );

COMMIT;
