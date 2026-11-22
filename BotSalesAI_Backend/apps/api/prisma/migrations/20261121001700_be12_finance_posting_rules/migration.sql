BEGIN;

ALTER TABLE "opening_balances" DROP CONSTRAINT "opening_balances_check";
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_posting_valid"
  CHECK (version > 0 AND status <> 'reversed' AND jsonb_typeof(lines) = 'array'
    AND (status = 'posted' OR journal_id IS NULL)
    AND (status <> 'posted' OR journal_id IS NOT NULL OR jsonb_array_length(lines) = 0));

CREATE UNIQUE INDEX "finance_entries_observed_source_key" ON "finance_entries" (shop_id, source_type, source_id)
  WHERE order_id IS NULL AND source_id IS NOT NULL AND status IN ('posted','reversed');

CREATE FUNCTION "protect_finance_entry_history"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.status IN ('posted','reversed') AND (
    OLD.status <> 'posted' OR NEW.status <> 'reversed' OR NEW.version <> OLD.version + 1
    OR to_jsonb(OLD) - ARRAY['status','version','updated_at'] <> to_jsonb(NEW) - ARRAY['status','version','updated_at']
  ) THEN
    RAISE EXCEPTION 'Posted finance entry content is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "finance_entries_history_immutable" BEFORE UPDATE ON "finance_entries"
  FOR EACH ROW EXECUTE FUNCTION "protect_finance_entry_history"();

CREATE FUNCTION "protect_opening_history"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Posted opening balance content is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "opening_balances_history_immutable" BEFORE UPDATE ON "opening_balances"
  FOR EACH ROW EXECUTE FUNCTION "protect_opening_history"();

COMMIT;
