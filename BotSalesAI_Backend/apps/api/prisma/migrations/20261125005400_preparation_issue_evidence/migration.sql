ALTER TYPE "file_purpose" ADD VALUE 'preparation_issue_image';

ALTER TABLE "prep_lines"
    ADD COLUMN "issue_evidence_file_id" UUID,
    ADD CONSTRAINT "prep_lines_shop_id_issue_evidence_file_id_fkey"
        FOREIGN KEY ("shop_id", "issue_evidence_file_id") REFERENCES "file_objects" ("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "prep_lines_shop_id_issue_evidence_file_id_key" ON "prep_lines" ("shop_id", "issue_evidence_file_id");
