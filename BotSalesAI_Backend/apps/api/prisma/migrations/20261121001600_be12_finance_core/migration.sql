BEGIN;

-- CreateEnum
CREATE TYPE "account_group" AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "accounting_period_state" AS ENUM ('open', 'closing', 'closed');

-- CreateEnum
CREATE TYPE "posting_status" AS ENUM ('draft', 'posted', 'reversed');

-- CreateEnum
CREATE TYPE "finance_entry_kind" AS ENUM ('receipt', 'disbursement');

-- CreateEnum
CREATE TYPE "finance_classification" AS ENUM ('sales_receipt', 'inventory_purchase', 'shipping', 'platform_fee', 'payment_fee', 'ai_expense', 'operating_expense', 'capital', 'loan_principal', 'transfer', 'other');

-- CreateEnum
CREATE TYPE "payment_evidence_kind" AS ENUM ('cash_receipt', 'bank_receipt', 'provider_receipt', 'carrier_collection', 'observed_refund');

-- CreateTable
CREATE TABLE "finance_accounts" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "group" "account_group" NOT NULL,
    "status" "account_status" NOT NULL DEFAULT 'active',
    "system_key" VARCHAR(64),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "finance_accounts_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "accounting_periods" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "state" "accounting_period_state" NOT NULL DEFAULT 'open',
    "closed_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "finance_journals" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_type" VARCHAR(100) NOT NULL,
    "source_id" VARCHAR(160) NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "source_revision" INTEGER NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "status" "posting_status" NOT NULL DEFAULT 'draft',
    "effective_date" DATE NOT NULL,
    "period_id" UUID NOT NULL,
    "policy_version" VARCHAR(100) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "reversal_of" UUID,
    "replaces_journal_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "finance_journals_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "finance_journal_lines" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "journal_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "account_id" UUID NOT NULL,
    "debit" DECIMAL(78,18) NOT NULL,
    "credit" DECIMAL(78,18) NOT NULL,
    "description" VARCHAR(300) NOT NULL,

    CONSTRAINT "finance_journal_lines_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "finance_entries" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "finance_entry_kind" NOT NULL,
    "classification" "finance_classification" NOT NULL,
    "amount" DECIMAL(78,18) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "posting_status" NOT NULL DEFAULT 'draft',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "source_type" VARCHAR(64),
    "source_id" VARCHAR(160),
    "journal_id" UUID,
    "reversal_of" UUID,
    "order_id" UUID,
    "evidence_id" UUID,
    "payment_reference" VARCHAR(160),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "payment_evidence" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "kind" "payment_evidence_kind" NOT NULL,
    "reference" VARCHAR(160) NOT NULL,
    "amount" DECIMAL(78,18) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "observed_at" TIMESTAMPTZ(3) NOT NULL,
    "verified_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_evidence_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateTable
CREATE TABLE "opening_balances" (
    "shop_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "effective_date" DATE NOT NULL,
    "policy_version" VARCHAR(100) NOT NULL,
    "lines" JSONB NOT NULL,
    "inventory" JSONB NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "status" "posting_status" NOT NULL DEFAULT 'draft',
    "journal_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "opening_balances_pkey" PRIMARY KEY ("shop_id","id")
);

-- CreateIndex
CREATE INDEX "finance_accounts_shop_id_created_at_id_idx" ON "finance_accounts"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_accounts_shop_id_code_key" ON "finance_accounts"("shop_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "finance_accounts_shop_id_system_key_key" ON "finance_accounts"("shop_id", "system_key");

-- CreateIndex
CREATE INDEX "accounting_periods_shop_id_created_at_id_idx" ON "accounting_periods"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_shop_id_start_date_key" ON "accounting_periods"("shop_id", "start_date");

-- CreateIndex
CREATE INDEX "finance_journals_shop_id_effective_date_id_idx" ON "finance_journals"("shop_id", "effective_date", "id");

-- CreateIndex
CREATE INDEX "finance_journals_shop_id_created_at_id_idx" ON "finance_journals"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_journals_source_key" ON "finance_journals"("shop_id", "source_type", "source_id", "event_type", "source_revision");

-- CreateIndex
CREATE UNIQUE INDEX "finance_journals_shop_id_reversal_of_key" ON "finance_journals"("shop_id", "reversal_of");

-- CreateIndex
CREATE UNIQUE INDEX "finance_journals_shop_id_replaces_journal_id_key" ON "finance_journals"("shop_id", "replaces_journal_id");

-- CreateIndex
CREATE INDEX "finance_journal_lines_shop_id_account_id_journal_id_idx" ON "finance_journal_lines"("shop_id", "account_id", "journal_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_journal_lines_shop_id_journal_id_position_key" ON "finance_journal_lines"("shop_id", "journal_id", "position");

-- CreateIndex
CREATE INDEX "finance_entries_shop_id_order_id_kind_status_idx" ON "finance_entries"("shop_id", "order_id", "kind", "status");

-- CreateIndex
CREATE INDEX "finance_entries_shop_id_created_at_id_idx" ON "finance_entries"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_entries_shop_id_journal_id_key" ON "finance_entries"("shop_id", "journal_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_entries_shop_id_evidence_id_key" ON "finance_entries"("shop_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_entries_shop_id_reversal_of_key" ON "finance_entries"("shop_id", "reversal_of");

-- CreateIndex
CREATE UNIQUE INDEX "payment_evidence_shop_id_kind_reference_key" ON "payment_evidence"("shop_id", "kind", "reference");

-- CreateIndex
CREATE INDEX "opening_balances_shop_id_created_at_id_idx" ON "opening_balances"("shop_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "opening_balances_shop_id_journal_id_key" ON "opening_balances"("shop_id", "journal_id");

-- AddForeignKey
ALTER TABLE "finance_accounts" ADD CONSTRAINT "finance_accounts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_shop_id_closed_by_fkey" FOREIGN KEY ("shop_id", "closed_by") REFERENCES "memberships"("shop_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_journals" ADD CONSTRAINT "finance_journals_shop_id_period_id_fkey" FOREIGN KEY ("shop_id", "period_id") REFERENCES "accounting_periods"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_journals" ADD CONSTRAINT "finance_journals_shop_id_reversal_of_fkey" FOREIGN KEY ("shop_id", "reversal_of") REFERENCES "finance_journals"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_journals" ADD CONSTRAINT "finance_journals_shop_id_replaces_journal_id_fkey" FOREIGN KEY ("shop_id", "replaces_journal_id") REFERENCES "finance_journals"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_shop_id_journal_id_fkey" FOREIGN KEY ("shop_id", "journal_id") REFERENCES "finance_journals"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_shop_id_account_id_fkey" FOREIGN KEY ("shop_id", "account_id") REFERENCES "finance_accounts"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_shop_id_journal_id_fkey" FOREIGN KEY ("shop_id", "journal_id") REFERENCES "finance_journals"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "sales_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_shop_id_evidence_id_fkey" FOREIGN KEY ("shop_id", "evidence_id") REFERENCES "payment_evidence"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_shop_id_reversal_of_fkey" FOREIGN KEY ("shop_id", "reversal_of") REFERENCES "finance_entries"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_evidence" ADD CONSTRAINT "payment_evidence_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "sales_orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_shop_id_journal_id_fkey" FOREIGN KEY ("shop_id", "journal_id") REFERENCES "finance_journals"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;


ALTER TABLE "finance_accounts" ADD CHECK (version > 0 AND code ~ '^[A-Za-z0-9_.-]{1,40}$');
ALTER TABLE "accounting_periods" ADD CHECK (version > 0 AND start_date <= end_date);
ALTER TABLE "finance_journals" ADD CHECK (version > 0 AND source_revision >= 0 AND request_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE "finance_journal_lines" ADD CHECK (position >= 0 AND ((debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)));
ALTER TABLE "finance_entries" ADD CHECK (version > 0 AND amount > 0 AND (source_type IS NULL) = (source_id IS NULL));
ALTER TABLE "payment_evidence" ADD CHECK (amount > 0 AND verified_at >= observed_at);
ALTER TABLE "opening_balances" ADD CHECK (version > 0 AND status <> 'reversed' AND (status = 'posted') = (journal_id IS NOT NULL));
CREATE UNIQUE INDEX "opening_balances_posted_shop_key" ON "opening_balances" (shop_id) WHERE status = 'posted';

CREATE FUNCTION "enforce_draft_finance_journal_line"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "finance_journals" WHERE shop_id = NEW.shop_id AND id = NEW.journal_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Journal lines require a draft parent' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "finance_journal_lines_draft_only" BEFORE INSERT ON "finance_journal_lines"
  FOR EACH ROW EXECUTE FUNCTION "enforce_draft_finance_journal_line"();

CREATE FUNCTION "protect_finance_journal_history"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.status IN ('posted','reversed') AND (
    OLD.status <> 'posted' OR NEW.status <> 'reversed' OR NEW.version <> OLD.version + 1
    OR to_jsonb(OLD) - ARRAY['status','version','updated_at'] <> to_jsonb(NEW) - ARRAY['status','version','updated_at']
  ) THEN
    RAISE EXCEPTION 'Posted journal content is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "finance_journals_history_immutable" BEFORE UPDATE ON "finance_journals"
  FOR EACH ROW EXECUTE FUNCTION "protect_finance_journal_history"();

CREATE FUNCTION "assert_finance_journal_balanced"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.status IN ('posted','reversed') AND NOT EXISTS (
    SELECT 1 FROM "finance_journal_lines" WHERE shop_id = NEW.shop_id AND journal_id = NEW.id
    GROUP BY journal_id HAVING COUNT(*) >= 2 AND SUM(debit) = SUM(credit)
  ) THEN
    RAISE EXCEPTION 'Posted journal must contain balanced debit and credit lines' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'posted' AND NOT EXISTS (
    SELECT 1 FROM "accounting_periods" WHERE shop_id = NEW.shop_id AND id = NEW.period_id
      AND state = 'open' AND NEW.effective_date BETWEEN start_date AND end_date
  ) THEN
    RAISE EXCEPTION 'Posting date requires an open accounting period' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER "finance_journals_balanced_at_commit"
  AFTER INSERT OR UPDATE ON "finance_journals" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "assert_finance_journal_balanced"();

GRANT SELECT, INSERT, UPDATE ON "finance_accounts", "accounting_periods", "finance_journals", "finance_entries", "opening_balances" TO botsales_runtime;
GRANT SELECT, INSERT ON "finance_journal_lines" TO botsales_runtime;
GRANT SELECT ON "payment_evidence" TO botsales_runtime;

COMMIT;
