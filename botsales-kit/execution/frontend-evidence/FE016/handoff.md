# FE016 — Inbox and conversation takeover

Scope: React inbox routes R05/R06 with canonical operations and deterministic synthetic MSW records. The app shell owns shop/session scope, cross-module composition, event resynchronization and unresolved command recovery.

## Current verification — 01/10/2026

- The current full Chromium suite passed 123/123, including the FE016 route/source map (3 checks) and all nine FE016 browser scenarios.
- Browser coverage includes URL-backed conversation filters and bookmarks, separate conversation/message cursors with back navigation, versioned takeover and reply, explicit mock send state without claiming delivery, inert HTML-like content, feedback saved only as a review draft, unknown-send draft retention and no blind resend, permission-gated customer/order references, stale takeover conflict retention, sample promotion preview without discount, and local synthetic image/voice preview.
- Current Vitest passed 66/66; simulator/network passed 88/88; mock schemas passed 356/356; generation passed 11 outputs / 283 schemas / 210 operations / 54 routes. Source mapping passed 58 files / 224 operation references / 54 routes; architecture boundaries passed 402 imports and 8/8 negative fixtures. Typecheck and lint passed.
- Production and demo builds exited 0; the >500 kB chunk-size warning remains recorded.

## Limits

The canonical Message contract has no media/attachment field or media read operation. The UI therefore presents media only as a local demo preview and does not invent upload/download endpoints. Mock send state is not provider delivery. Live Meta/provider traffic, server-side permission enforcement, real SSE guarantees, CI, staging, production deployment, and user UAT were not verified.

Current FE016 checkpoint evidence is `S01-priority-refresh-20261001.json` through `S05-priority-refresh-20261001.json`. `S01-route-operation-map.md` records source ownership and the media contract gap.
