BEGIN;

ALTER TABLE "bank_transactions" ADD COLUMN "payment_evidence_id" UUID;

UPDATE "bank_transactions" b
SET payment_evidence_id = e.id
FROM payment_evidence e
JOIN finance_entries fe ON fe.shop_id=e.shop_id AND fe.evidence_id=e.id AND fe.status='posted'
JOIN finance_journals j ON j.shop_id=fe.shop_id AND j.id=fe.journal_id AND j.status='posted'
JOIN shops s ON s.id=e.shop_id
WHERE b.shop_id=e.shop_id AND b.external_transaction_id=e.reference AND b.direction='credit' AND e.kind='bank_receipt'
  AND b.currency=e.currency AND b.amount=e.amount AND (b.occurred_at AT TIME ZONE s.timezone)::date=j.effective_date
  AND EXISTS (SELECT 1 FROM finance_journal_lines l WHERE l.shop_id=j.shop_id AND l.journal_id=j.id AND l.account_id=b.account_id AND l.debit=b.amount)
  AND EXISTS (SELECT 1 FROM reconciliation_cases c WHERE c.shop_id=b.shop_id AND c.transaction_id=b.id AND c.state='matched')
  AND NOT EXISTS (SELECT 1 FROM settlement_allocations a WHERE a.shop_id=b.shop_id AND a.transaction_id=b.id);

CREATE UNIQUE INDEX "bank_transactions_shop_id_payment_evidence_id_key" ON "bank_transactions"("shop_id", "payment_evidence_id");
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_shop_id_payment_evidence_id_fkey"
  FOREIGN KEY ("shop_id", "payment_evidence_id") REFERENCES "payment_evidence"("shop_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE FUNCTION "protect_bank_transaction_source"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.version <> OLD.version + 1
     OR (OLD.payment_evidence_id IS NOT NULL AND NEW.payment_evidence_id IS DISTINCT FROM OLD.payment_evidence_id)
     OR to_jsonb(OLD) - ARRAY['version','updated_at','payment_evidence_id'] <> to_jsonb(NEW) - ARRAY['version','updated_at','payment_evidence_id'] THEN
    RAISE EXCEPTION 'Bank statement content and bound evidence are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "bank_transactions_protect_source"
  BEFORE UPDATE ON "bank_transactions" FOR EACH ROW EXECUTE FUNCTION "protect_bank_transaction_source"();

COMMIT;
