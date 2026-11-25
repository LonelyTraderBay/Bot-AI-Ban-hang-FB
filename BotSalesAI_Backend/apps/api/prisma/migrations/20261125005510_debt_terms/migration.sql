BEGIN;

CREATE TABLE "debt_terms" (
    "shop_id" UUID NOT NULL,
    "debt_line_id" UUID NOT NULL,
    "due_date" DATE,
    "dispute_hold" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "debt_terms_pkey" PRIMARY KEY ("shop_id", "debt_line_id"),
    CONSTRAINT "debt_terms_shop_id_debt_line_id_fkey" FOREIGN KEY ("shop_id", "debt_line_id")
        REFERENCES "finance_journal_lines" ("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "debt_terms_version_check" CHECK ("version" > 0)
);

GRANT SELECT, INSERT, UPDATE ON "debt_terms" TO botsales_runtime;

COMMIT;
