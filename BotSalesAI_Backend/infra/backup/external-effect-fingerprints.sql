WITH components(component) AS (VALUES
    ('external/messenger_receipts'), ('external/messenger_dispatches'), ('external/ai_approvals'),
    ('external/ai_inbound_runs'), ('external/ai_daily_usage'), ('external/purchase_dispatches'),
    ('external/purchase_evidence'), ('external/notification_deliveries'), ('external/notification_devices'),
    ('external/telegram_pairings'), ('external/carrier_events')
), ledger(component, sort_key, data) AS (
    SELECT 'external/messenger_receipts', jsonb_build_array(r.shop_id, r.channel_id, r.external_id)::text, to_jsonb(r)
    FROM public.channel_events r
    UNION ALL
    SELECT 'external/messenger_dispatches', jsonb_build_array(d.shop_id, d.message_id)::text,
        jsonb_build_array(to_jsonb(d), m.external_id, m.client_message_id, m.conversation_id, m.status, m.redacted_at, m.version)
    FROM public.message_dispatches d JOIN public.channel_messages m ON (m.shop_id, m.id) = (d.shop_id, d.message_id)
    UNION ALL
    SELECT 'external/ai_approvals', jsonb_build_array(e.shop_id, e.id)::text, to_jsonb(e)
    FROM public.evaluations e WHERE e.approval_run_id IS NOT NULL
    UNION ALL
    SELECT 'external/ai_inbound_runs', jsonb_build_array(t.shop_id, t.message_id)::text,
        jsonb_build_array(to_jsonb(t), m.external_id, m.conversation_id, m.origin, m.direction, m.redacted_at,
            encode(sha256(convert_to(m.text, 'UTF8')), 'hex'))
    FROM public.bot_inbound_tasks t JOIN public.channel_messages m ON (m.shop_id, m.id) = (t.shop_id, t.message_id)
    WHERE t.provider_run_id IS NOT NULL
    UNION ALL
    SELECT 'external/ai_daily_usage', jsonb_build_array(u.shop_id, u.accounting_date)::text, to_jsonb(u)
    FROM public.bot_daily_usage u
    UNION ALL
    SELECT 'external/purchase_dispatches', jsonb_build_array(d.shop_id, d.purchase_order_id)::text, jsonb_build_array(to_jsonb(d), to_jsonb(p))
    FROM public.purchase_dispatches d JOIN public.purchase_orders p ON (p.shop_id, p.id) = (d.shop_id, d.purchase_order_id)
    UNION ALL
    SELECT 'external/purchase_evidence', jsonb_build_array(e.shop_id, e.id)::text, to_jsonb(e)
    FROM public.procurement_evidence e
    UNION ALL
    SELECT 'external/notification_deliveries', jsonb_build_array(n.shop_id, n.id)::text, to_jsonb(n)
    FROM public.app_notifications n WHERE n.channel IN ('web_push', 'telegram')
    UNION ALL
    SELECT 'external/notification_devices', jsonb_build_array(d.shop_id, d.id)::text, to_jsonb(d)
    FROM public.notification_devices d
    UNION ALL
    SELECT 'external/telegram_pairings', jsonb_build_array(p.shop_id, p.id)::text, to_jsonb(p)
    FROM public.telegram_pairings p
    UNION ALL
    SELECT 'external/carrier_events', jsonb_build_array(e.shop_id, e.shipment_id, e.external_event_id)::text,
        jsonb_build_array(to_jsonb(e), s.state, s.version, s.last_event_at, to_jsonb(o))
    FROM public.shipment_events e JOIN public.shipments s ON (s.shop_id, s.id) = (e.shop_id, e.shipment_id)
    LEFT JOIN public.shipment_observations o ON (o.shop_id, o.shipment_id, o.id) = (e.shop_id, e.shipment_id, e.observation_id)
    UNION ALL
    SELECT 'external/carrier_events', jsonb_build_array(o.shop_id, o.shipment_id, 'observation', o.id)::text, to_jsonb(o)
    FROM public.shipment_observations o
    WHERE NOT EXISTS (
        SELECT 1 FROM public.shipment_events e
        WHERE (e.shop_id, e.shipment_id, e.observation_id) = (o.shop_id, o.shipment_id, o.id)
    )
), fingerprints AS (
    SELECT c.component, count(l.sort_key) AS records,
        encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(l.data::text, 'UTF8')), 'hex'),
            '' ORDER BY l.sort_key COLLATE "C"), ''), 'UTF8')), 'hex') AS snapshot
    FROM components c LEFT JOIN ledger l USING (component) GROUP BY c.component
)
SELECT jsonb_agg(to_jsonb(fingerprints) ORDER BY component) AS external_effect_report FROM fingerprints
\gset
