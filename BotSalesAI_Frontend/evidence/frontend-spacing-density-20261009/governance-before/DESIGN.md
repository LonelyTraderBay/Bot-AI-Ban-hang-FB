---
version: alpha
name: BotSales AI — Graphite Gold
description: "Giao diện vận hành bán hàng đa module: dữ liệu rõ, thao tác an toàn, điểm nhấn vàng trên nền graphite."
tokens: ../botsales-kit/design/tokens.json
uiRules: docs/FRONTEND_SPACING_STANDARD.md
sharedUiCatalog: apps/web/src/shared/ui/README.md
---

# BotSales AI Design System

## Overview

### Creative North Star

BotSales AI is a merchant operations workbench: inbox, orders, stock, procurement and finance belong to one calm workspace. The approved Graphite Gold identity uses charcoal surfaces as the working canvas and reserves gold for primary action, focus and selected navigation. The signature is the thin gold signal against layered graphite; tables and operational data stay quiet and readable.

### Product context and register

- **Audience and primary job:** shop owners and their sales, warehouse, accounting and AI-operation teammates manage commerce workflows and respond to customers.
- **Target market(s) and evidence:** market-specific legal, tax and accounting rules are not established by the frontend brief. Currency and timezone are shop-scoped contract values; do not infer a legal jurisdiction from the Vietnamese interface.
- **Locale(s) and language policy:** Vietnamese (`vi`) is the supported application locale. Use Vietnamese for visible copy, validation and accessible names. Do not claim multilingual support until translations are complete and reviewed.
- **Usage scene:** frequent desktop operations with dense lists and a responsive mobile shell; preserve the main action and record identity at narrow widths.
- **Register:** product UI across all routes; no marketing landing-page treatment inside authenticated workflows.
- **Memorable signature:** gold is a restrained state/action signal, never a decorative glow or a substitute for text labels.
- **Restraint:** use borders, spacing and hierarchy before shadows, gradients or motion. Dense data surfaces remain neutral.
- **Anti-references:** neon chatbot dashboards, decorative gradients on every card, color-only status, and generic KPI hero layouts without operational meaning.
- **Token ownership/runtime mapping:** `../botsales-kit/design/tokens.json` is canonical. `scripts/generate.mjs` emits the workspace token package/CSS; `apps/web/src/shared/ui/theme.ts` maps those tokens into MUI. `npm run generate:check` is the drift gate. Frontmatter provides canonical pointers only; it does not duplicate token values or layout rules.

## Colors

The exact palette is owned by `../botsales-kit/design/tokens.json` and ADR-VIS-021. This document describes identity and intent; runtime values come from the generated token package and shared MUI theme. `primary` is the action/focus accent; `canvas`, `surface` and `raised` create three graphite depth levels. Success, warning, danger and info use their semantic tokens and corresponding surface tokens. Status always has text or an icon as well as color. The control outline uses canonical token `borderControl` from `tokens.json`; the design frontmatter schema has no border-color component slot, so its runtime mapping is documented here and in the MUI theme. Decorative borders do not communicate interactivity. Forced-colors remains system-controlled.

## Typography

Use the system sans stack already shipped by the app; do not download fonts or introduce a second display family. Body copy and headings use the current canonical typography tokens and MUI theme variants; do not create a local type scale. Numeric values use tabular figures where available. Preserve Vietnamese diacritics and allow long shop, customer and document names to wrap or expose a full-value path instead of clipping.

## Layout

The sole normative UI policy is [FRONTEND_SPACING_STANDARD v1.28](docs/FRONTEND_SPACING_STANDARD.md), SPC-001–075. Every UI task uses its [canonical workflow](docs/FRONTEND_SPACING_STANDARD.md#unified-workflow); this design context owns product identity and intent, not a parallel checklist or numeric layout standard. Its frontmatter contains pointers only; `../botsales-kit/design/tokens.json` remains the canonical value source. UI evidence must pass the repository validator and `npm run verify`; a clean document or source scan alone cannot close rendered route/state coverage.

Use the [shared catalog CURRENT/TARGET](apps/web/src/shared/ui/README.md) to select an existing owner and distinguish planned contracts from runtime APIs. Responsive geometry and semantic profiles are defined by canonical tokens and the spacing standard. Tables may scroll within a named region; inbox panes retain independent scroll owners, record identity and primary actions remain usable, and long content reflows.

The [v16.0 plan §16](docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan) owns rollout priorities, dependencies and current status. [Plan §16.17](docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#preimplementation-review-20261007) records the shared-UI review rationale. Earlier W/UI028/shared-composition evidence is historical by source hash. This document does not grant a source/browser PASS, checkpoint or Enterprise certification.

## Elevation & Depth

Hierarchy comes from the canvas/surface/raised/elevated token layers and restrained borders. Static panels do not need decorative shadows. Modal overlay uses the approved overlay token; z-index roles come from the token file. Keep sticky headers and drawers legible above content without obscuring focused controls.

## Shapes

Shape, touch-target and focus values resolve through canonical tokens and the shared MUI theme. The metadata header does not contain visual values; shape and touch targets resolve through canonical tokens and the shared MUI theme. Dividers use decorative border roles; focus remains visible and distinguishable.

## Components

### Foundational visual states

Shared MUI theme owns focus, hover, active, selected, disabled and forced-colors behavior. Loading, empty, error, forbidden, stale and unknown-command states must remain distinct in copy and semantics. Async states reserve layout; reduced-motion preference removes animation and smooth scrolling.

### Buttons and actions

Use one solid primary action per decision area, neutral outline/text actions for secondary work, and danger styling for destructive intent. Labels name the result. Busy actions retain their dimensions and expose a perceivable pending state. Icon-only controls require accessible names and tooltips when their meaning is not universal.

### Navigation and data display

Use the MUI theme and shared `PageHeader`, `Panel`, `DataTable`, `Toolbar`, `Pager`, `QueryState` and `Status` owners. Tables use stable resource IDs, bounded cursor pagination and an accessible region name. Keep status text visible and never derive totals from only the current page.

### Forms and overlays

MUI `TextField` and the shared `EditDialog`/`ErrorNotice` own field presentation, dirty-draft protection and API error feedback. Form state remains local to the owning workflow; server state remains in TanStack Query. Native date fields are an explicit platform-owned variant for date-only values; store `YYYY-MM-DD` without timezone conversion. MUI authored selects own their popup. Keep validation inline, preserve entered values on failure and guard navigation when drafts are dirty.

### Iconography

Use MUI Material Icons Rounded. Icons support labels and status; they do not replace text for actions or state.

### Motion

Motion is functional only. Current global CSS honors `prefers-reduced-motion`; do not add entrance choreography or repeated list animation to operational screens.

### Content and data visualization

Write Vietnamese copy in plain, action-first terms. Use the shared date, timezone, currency and money formatters. Charts use semantic tokens and provide a table or text alternative; synthetic values must be identified as demo data.

## Do's and Don'ts

- **Do:** reserve gold for focus, selection and the main action, using approved tokens.
- **Do:** keep loading, empty, stale, error and forbidden states distinct and recoverable.
- **Don't:** add light mode, a new palette, raw color literals, external fonts or a second component library.
- **Don't:** hide overflow, remove browser zoom, or communicate permission/status only by color.
