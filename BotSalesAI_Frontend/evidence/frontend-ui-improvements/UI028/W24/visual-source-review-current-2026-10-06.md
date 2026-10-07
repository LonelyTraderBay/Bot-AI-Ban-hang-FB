# UI028.W24 Inbox source and visual review

**Date:** 2026-10-06  
**Source revision:** `e68cb65e61c5c1aab2ae169dd8033df305df8872` plus the working-tree changes recorded in the paired render source hashes.  
**Scope:** React/TypeScript Inbox routes R05/R06, shared semantic spacing bridge, and synthetic MSW preview only.

## Design contract and implementation

- R05 and R06 were mapped to `route-manifest.json`, OpenAPI and `UX-CONTRACT.md` before source edits. Search/filter state, independent `cursor` and `listCursor`, selected conversation, mobile Back, message scroll owner, composer draft, context pane and permission-aware actions remain unchanged.
- Inbox now consumes the shared `layoutSx` bridge. No module-local spacing scale, literal spacing override, new API operation, mock write, backend behavior or route change was added.
- Semantic roles express the Inbox profile: pane inset 16px; bubble inset 12px; sender/body gap 4px; body/source/metadata gap 8px; message group gap 12px; composer inset 16px and 8px control/action flow; context inset 16px/24px at the 768px breakpoint. List rows use 16px inset, 12px avatar/content gap, unread marker horizontal inset 8px and preview/status gap 4px/8px.
- The list inset/gap roles target MUI's stable `MuiListItemButton-root` utility class. This is necessary because the primitive emits its own `padding: 8px 16px`; the computed-style browser test verifies that the semantic 16px row inset wins. The inbox list selector in the generic capture metrics can match the app sidebar, so list-row role values are taken from the focused route-aware Playwright assertion instead.
- Demo preview panels reuse `surface.*`, `actions.*` and `form.*`. Existing route geometry remains 300px list / 260px context at its current breakpoints. At 1280px the two shared 24px grid gutters reduce the thread width by 16px total; screenshots show the selected row, thread, composer and context remain visible without document overflow.

## Paired render observations

Chromium captures compare the exact same three states at 390×844 and 1280×900: default Inbox list, latest messages in `cv1`, and deep-linked `cv2?listCursor=cv1&cursor=m2`. Six baseline and six after screenshots and metrics are linked from the paired render JSON. All 12 observations have `scrollWidth === clientWidth`; there were zero route writes, API errors and page errors before or after. The selected conversation, paging state, composer and context pane remained present. The mobile, latest-message and desktop-paged screenshot pairs were visually reviewed; spacing was normalized without changing the route flow or introducing clipped page content.

The inbox-owned strict spacing findings fell from 46 to zero (35 in `index.tsx`, 11 in `conversation-components.tsx`). All 20 pre-existing Reports/W25 findings are byte-for-byte equivalent by file, line, property, value and checker message; no finding was added outside W24. The checker remains globally `FAIL` until W25 is migrated; no rule or threshold was relaxed.

## Verification and verdict

- Focused Inbox and UI028.W24 Chromium regression: **22/22 PASS**. This includes existing R05/R06 filter/cursor/Back, draft, permission, unknown-send and preview scenarios plus measured 16/12/8 list roles, 16/12/4/8/12 message roles, responsive 16/24 context inset, no overflow/writes/page errors and draft retention during 390/768/1280 viewport changes.
- `generate.mjs --check`: **PASS**, 11 outputs / 283 schemas / 210 operations / 54 routes.
- Source check + fixtures: **PASS**, 66 files / 220 operation calls / 54 routes and 3/3 fixtures. Boundary check: **PASS**, 456 imports and 10/10 negative fixtures. TypeScript strict check and ESLint: **PASS**. Layout checker fixtures: **9/9 PASS**.
- Production Vite build: **PASS**, 2,056 modules; demo build: **PASS**, 2,272 modules. Both outputs were isolated under the Windows temp directory. Production artifact scan found no `setupWorker`, `WorkerChannel`, `msw/browser` or `@mswjs/interceptors`; the demo bundle contains `setupWorker` as expected. Tree hashes are in the W24 verification JSON.
- Strict full-source spacing check: **FAIL**, exit 1, exactly 20 findings in `apps/web/src/modules/reports/index.tsx` owned by W25. The W24 owner files contain zero findings.

**UI verdict: PASS. Architecture verdict: PASS_WITH_KNOWN_W25_DEBT.** No FE/full-product ledger, generated artifact, owner-acceptance field, hosted CI status or manual accessibility claim was changed. Evidence is local Frontend with synthetic MSW and does not establish backend, staging, hosted CI, screen-reader or owner acceptance.
