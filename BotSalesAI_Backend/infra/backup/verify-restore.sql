\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL timezone = 'UTC';

-- Compare output from a quiesced source or an exported backup snapshot with the isolated restore.
\ir integrity-counts.sql
\ir external-effect-fingerprints.sql
WITH state AS (
    SELECT 'shops' AS component, count(*) AS records,
        md5(coalesce(string_agg(md5(to_jsonb(s)::text), '' ORDER BY id), '')) AS snapshot FROM public.shops s
    UNION ALL SELECT 'memberships', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(m)::text), '' ORDER BY shop_id, id), '')) FROM public.memberships m
    UNION ALL SELECT 'products', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(p)::text), '' ORDER BY shop_id, id), '')) FROM public.products p
    UNION ALL SELECT 'variants', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(v)::text), '' ORDER BY shop_id, id), '')) FROM public.variants v
    UNION ALL SELECT 'customers', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(c)::text), '' ORDER BY shop_id, id), '')) FROM public.customers c
    UNION ALL SELECT 'sales_orders', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(o)::text), '' ORDER BY shop_id, id), '')) FROM public.sales_orders o
    UNION ALL SELECT 'audit_entries', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(a)::text), '' ORDER BY shop_id, id), '')) FROM public.audit_entries a
    UNION ALL SELECT 'stock_positions', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(p)::text), '' ORDER BY shop_id, id), '')) AS snapshot FROM public.stock_positions p
    UNION ALL SELECT 'stock_movements', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(m)::text), '' ORDER BY shop_id, id), '')) FROM public.stock_movements m
    UNION ALL SELECT 'finance_journals', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(j)::text), '' ORDER BY shop_id, id), '')) FROM public.finance_journals j
    UNION ALL SELECT 'finance_lines', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(l)::text), '' ORDER BY shop_id, id), '')) FROM public.finance_journal_lines l
    UNION ALL SELECT 'file_objects', count(*),
        md5(coalesce(string_agg(md5(jsonb_build_array(to_jsonb(f), to_jsonb(s))::text), '' ORDER BY f.shop_id, f.id), ''))
        FROM public.file_objects f LEFT JOIN public.file_storage s ON (s.shop_id, s.file_id) = (f.shop_id, f.id)
    UNION ALL SELECT 'file_blobs', count(*),
        md5(coalesce(string_agg(encode(sha256(bytes), 'hex'), '' ORDER BY shop_id, file_id), '')) FROM public.file_blobs
    UNION ALL SELECT 'jobs/' || status::text, count(*),
        md5(coalesce(string_agg(md5(to_jsonb(j)::text), '' ORDER BY shop_id, id), '')) FROM public.jobs j GROUP BY status
    UNION ALL SELECT 'commands/' || status, count(*),
        md5(coalesce(string_agg(md5(to_jsonb(c)::text), '' ORDER BY shop_id, id), '')) FROM public.commands c GROUP BY status
    UNION ALL SELECT 'outbox', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(e)::text), '' ORDER BY shop_id, id), '')) FROM public.outbox_events e
    UNION ALL SELECT 'consents', count(*),
        md5(coalesce(string_agg(md5(to_jsonb(c)::text), '' ORDER BY shop_id, id), '')) FROM public.customer_consents c
    UNION ALL SELECT 'customer_tombstones', count(*),
        md5(coalesce(string_agg(md5((shop_id, id, privacy_erased_at)::text), '' ORDER BY shop_id, id), ''))
        FROM public.customers WHERE privacy_erased_at IS NOT NULL
    UNION ALL SELECT 'migration_checksums', count(*),
        md5(coalesce(string_agg(checksum, '' ORDER BY migration_name), '')) FROM public._prisma_migrations
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
)
SELECT jsonb_build_object('format', 3,
    'databaseFingerprint', encode(sha256(convert_to(jsonb_build_array(current_database(), inet_server_addr(), inet_server_port(),
        pg_postmaster_start_time())::text, 'UTF8')), 'hex'),
    'observations', (SELECT jsonb_agg(to_jsonb(state) ORDER BY component) FROM state),
    'externalEffects', :'external_effect_report'::jsonb)
    || :'integrity_report'::jsonb;
COMMIT;
