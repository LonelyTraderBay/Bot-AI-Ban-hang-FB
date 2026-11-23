WITH movement_totals AS (
    SELECT shop_id, warehouse_id, variant_id, sum(quantity_delta) AS on_hand, sum(reserved_delta) AS reserved,
           sum(quarantine_delta) AS quarantine, sum(transit_delta) AS transit, sum(inbound_delta) AS inbound,
           sum(carrying_delta) AS carrying_value
    FROM public.stock_movements GROUP BY shop_id, warehouse_id, variant_id
), stock_drift AS (
    SELECT count(*) AS violations
    FROM public.stock_positions p
    LEFT JOIN movement_totals m USING (shop_id, warehouse_id, variant_id)
    WHERE (p.on_hand, p.reserved, p.quarantine, p.transit, p.inbound, p.carrying_value) <>
          (coalesce(m.on_hand,0), coalesce(m.reserved,0), coalesce(m.quarantine,0),
           coalesce(m.transit,0), coalesce(m.inbound,0), coalesce(m.carrying_value,0))
), unbalanced_journals AS (
    SELECT count(*) AS violations FROM (
        SELECT j.shop_id, j.id
        FROM public.finance_journals j
        LEFT JOIN public.finance_journal_lines l ON l.shop_id = j.shop_id AND l.journal_id = j.id
        WHERE j.status IN ('posted','reversed')
        GROUP BY j.shop_id, j.id
        HAVING count(l.id) < 2 OR sum(l.debit) IS DISTINCT FROM sum(l.credit)
    ) invalid
), blob_drift AS (
    SELECT count(*) AS violations
    FROM public.file_objects f
    LEFT JOIN public.file_blobs b ON (b.shop_id, b.file_id) = (f.shop_id, f.id)
    LEFT JOIN public.file_storage s ON (s.shop_id, s.file_id) = (f.shop_id, f.id)
    WHERE (b.file_id IS NOT NULL AND
           (octet_length(b.bytes) <> f.size_bytes OR encode(sha256(b.bytes), 'hex') <> f.sha256))
       OR (b.file_id IS NULL AND f.status = 'ready'
           AND (f.expires_at IS NULL OR f.expires_at > now())
           AND s.state IS DISTINCT FROM 'stored')
)
SELECT jsonb_build_object(
    'stockBalanceMismatches', (SELECT violations FROM stock_drift),
    'unbalancedJournals', (SELECT violations FROM unbalanced_journals),
    'fileIntegrityMismatches', (SELECT violations FROM blob_drift)
) AS integrity_report
\gset
