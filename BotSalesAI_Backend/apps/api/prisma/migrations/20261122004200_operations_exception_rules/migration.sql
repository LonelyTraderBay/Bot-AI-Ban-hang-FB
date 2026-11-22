ALTER TYPE work_item_kind ADD VALUE 'low_stock';
ALTER TYPE work_item_kind ADD VALUE 'unmatched_bank';

ALTER TABLE work_items ADD COLUMN rule_version varchar(48);

CREATE INDEX work_items_automation_idx
ON work_items (kind, source_type, updated_at, shop_id, id)
WHERE rule_version IS NOT NULL AND state IN ('queued', 'claimed', 'working', 'blocked');
