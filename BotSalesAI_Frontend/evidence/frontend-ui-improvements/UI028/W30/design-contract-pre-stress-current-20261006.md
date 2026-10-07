# UI028.W30 — stress layout contract

**Phase:** `PRE_SOURCE_EDIT` · **Date:** 2026-10-06 · **Scope:** Frontend React routes and shared UI, synthetic MSW only. The source hash set is recorded in [source-baseline-current-20261006.json](source-baseline-current-20261006.json).

## Profiles and states

- R01 auth, R04 dashboard, R09/R10 product table and editor, R05/R06 inbox list/composer, R31 report form/table, shell navigation, validation message and unsaved-draft dialog.
- Exercise long product/SKU values, required-field error text, long inbox reply draft, long dialog reason and an extended navigation label as browser-local synthetic text. No API write or durable data change is part of this task.
- Run narrow/short CSS viewports separately from 200% computed-text stress; record viewport dimensions, actual `devicePixelRatio`, mode and evidence separately. Apply text scale and letter/word/line spacing together to test reflow, focus and scrolling.

## Expected invariants

- No document-level horizontal overflow; any deliberate horizontal table overflow stays inside its designated scroll container.
- Primary actions, composer controls and dialog actions remain measurable and inside the viewport; text and validation/error content remains reachable by scroll and does not clip its owning surface.
- Keyboard focus remains visible after the stress styles are applied; dialog bounds and scroll behavior are measured, not inferred from screenshots.
- All observations are local and use synthetic MSW. This contract does not claim live API, server, hosted CI, screen-reader, owner or deployment evidence.

## Zoom distinction

The Playwright stress path will multiply each visible text element's existing computed font size and apply simultaneous letter/word/line spacing overrides. This is a deterministic text-reflow stress, **not browser chrome zoom**. CSS viewport profiles are reported separately. Browser zoom is only marked verified if a separate browser-UI measurement records the actual zoom level and effective CSS viewport; the stress test itself cannot assert that value.
