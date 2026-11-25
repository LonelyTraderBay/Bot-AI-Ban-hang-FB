ALTER TYPE "file_purpose" ADD VALUE 'payment_evidence_image';

CREATE INDEX "file_objects_shop_id_purpose_resource_id_status_idx" ON "file_objects" ("shop_id", "purpose", "resource_id", "status");
