CREATE TYPE "file_rejection_reason" AS ENUM (
    'invalid_format', 'unsupported_content', 'spreadsheet_limit', 'unsafe_file', 'validation_failed'
);

ALTER TABLE "file_objects" ADD COLUMN "rejection_reason" "file_rejection_reason";

ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_rejection_reason_status_check"
    CHECK ("rejection_reason" IS NULL OR "status" IN ('quarantined', 'rejected'));
