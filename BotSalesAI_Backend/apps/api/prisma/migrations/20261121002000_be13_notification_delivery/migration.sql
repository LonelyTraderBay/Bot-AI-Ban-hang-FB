BEGIN;

-- CreateEnum
CREATE TYPE "device_status" AS ENUM ('pending', 'active', 'denied', 'revoked', 'expired');

-- CreateTable
CREATE TABLE "notification_devices" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "device_name" VARCHAR(120) NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "status" "device_status" NOT NULL DEFAULT 'pending',
    "fingerprint" VARCHAR(64) NOT NULL,
    "fixture_outcome" "notification_delivery" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "last_verified_at" TIMESTAMPTZ(3),
    "last_test_at" TIMESTAMPTZ(3),

    CONSTRAINT "notification_devices_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "telegram_pairings" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_pairings_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "notification_policies" (
    "shop_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" VARCHAR(100) NOT NULL,
    "quiet_start" VARCHAR(5),
    "quiet_end" VARCHAR(5),
    "remind_after_minutes" INTEGER,
    "max_reminders" INTEGER NOT NULL DEFAULT 0,
    "primary_user_ids" UUID[],
    "fallback_user_ids" UUID[],
    "fallback_channel" "notification_channel",
    "urgent_may_bypass_quiet_hours" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notification_policies_pkey" PRIMARY KEY ("shop_id")
);

-- CreateTable
CREATE TABLE "work_notification_schedules" (
    "shop_id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "next_due_at" TIMESTAMPTZ(3),

    CONSTRAINT "work_notification_schedules_pkey" PRIMARY KEY ("shop_id","work_item_id")
);

-- CreateIndex
CREATE INDEX "notification_devices_shop_id_created_at_id_idx" ON "notification_devices"("shop_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "notification_devices_shop_id_user_id_channel_status_idx" ON "notification_devices"("shop_id", "user_id", "channel", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_devices_shop_id_fingerprint_key" ON "notification_devices"("shop_id", "fingerprint");

-- CreateIndex
CREATE INDEX "telegram_pairings_shop_id_user_id_created_at_idx" ON "telegram_pairings"("shop_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "work_notification_schedules_next_due_at_idx" ON "work_notification_schedules"("next_due_at");

-- AddForeignKey
ALTER TABLE "notification_devices" ADD CONSTRAINT "notification_devices_shop_id_user_id_fkey" FOREIGN KEY ("shop_id", "user_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "telegram_pairings" ADD CONSTRAINT "telegram_pairings_shop_id_user_id_fkey" FOREIGN KEY ("shop_id", "user_id") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_policies" ADD CONSTRAINT "notification_policies_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_notification_schedules" ADD CONSTRAINT "work_notification_schedules_shop_id_work_item_id_fkey" FOREIGN KEY ("shop_id", "work_item_id") REFERENCES "work_items"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "shipments" ADD CHECK (handed_over_at IS NULL OR last_event_at IS NOT NULL);
ALTER TABLE "notification_devices" ADD CHECK (version > 0 AND channel IN ('web_push', 'telegram')
  AND fingerprint ~ '^[0-9a-f]{64}$' AND fixture_outcome <> 'queued'
  AND (status <> 'active' OR last_verified_at IS NOT NULL));
ALTER TABLE "telegram_pairings" ADD CHECK (expires_at > created_at
  AND (used_at IS NULL OR (used_at >= created_at AND used_at < expires_at)));
ALTER TABLE "notification_policies" ADD CHECK (version > 0 AND max_reminders BETWEEN 0 AND 48
  AND (remind_after_minutes IS NULL OR remind_after_minutes BETWEEN 1 AND 10080)
  AND ((quiet_start IS NULL AND quiet_end IS NULL) OR (quiet_start IS NOT NULL AND quiet_end IS NOT NULL
    AND quiet_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND quiet_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND quiet_start <> quiet_end))
  AND (fallback_channel IS NULL OR fallback_channel = 'telegram')
  AND (NOT enabled OR (remind_after_minutes IS NOT NULL AND cardinality(primary_user_ids) > 0)));
ALTER TABLE "work_notification_schedules" ADD CHECK (policy_version > 0 AND reminder_count BETWEEN 0 AND 49);

GRANT SELECT, INSERT, UPDATE ON "notification_devices", "telegram_pairings",
  "notification_policies", "work_notification_schedules" TO botsales_runtime;

COMMIT;
