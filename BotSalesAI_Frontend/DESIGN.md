---
version: alpha
name: BotSales AI — Graphite Gold
description: "Giao diện vận hành bán hàng đa module: dữ liệu rõ, thao tác an toàn, điểm nhấn vàng trên nền graphite."
colors:
  primary: "#F6C85F"
  on-primary: "#15181E"
  canvas: "#111318"
  surface: "#1C2028"
  raised: "#282F3A"
  input: "#171B22"
  text: "#F5F7FA"
  text-secondary: "#B9C2D0"
  success: "#4DD7A3"
  success-surface: "#193B33"
  warning: "#FFB078"
  warning-surface: "#3E3027"
  danger: "#FF8596"
  danger-surface: "#402832"
  info: "#8ABCFB"
  info-surface: "#25354B"
typography:
  sans:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: "1.5"
rounded:
  DEFAULT: "8px"
  control: "8px"
  card: "12px"
  dialog: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
components:
  page:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    typography: "14px/1.5 system sans"
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "14px/1.5, 650"
    rounded: "8px"
    padding: "8px 16px"
    height: "44px minimum"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "12px"
    padding: "16px"
  dialog:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "16px"
    padding: "24px"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.text}"
    rounded: "8px"
    height: "44px minimum"
  secondary-text:
    textColor: "{colors.text-secondary}"
    typography: "12px/1.5 system sans"
  success-status:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success}"
    rounded: "8px"
    padding: "4px 8px"
  warning-status:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.warning}"
    rounded: "8px"
    padding: "4px 8px"
  danger-status:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
    rounded: "8px"
    padding: "4px 8px"
  info-status:
    backgroundColor: "{colors.info-surface}"
    textColor: "{colors.info}"
    rounded: "8px"
    padding: "4px 8px"
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
- **Token ownership/runtime mapping:** `botsales-kit/design/tokens.json` is canonical. `scripts/generate.mjs` emits the workspace token package/CSS; `apps/web/src/shared/ui/theme.ts` maps those tokens into MUI. `npm run generate:check` is the drift gate. This file mirrors the approved values and does not generate a second token system.

## Colors

The exact palette is owned by `botsales-kit/design/tokens.json` and ADR-VIS-021; the frontmatter lists the values used by shared components. `primary` is the action/focus accent; `canvas`, `surface` and `raised` create three graphite depth levels. Success, warning, danger and info use their semantic tokens and corresponding surface tokens. Status always has text or an icon as well as color. The control outline uses canonical token `borderControl` from `tokens.json`; the design frontmatter schema has no border-color component slot, so its runtime mapping is documented here and in the MUI theme. Decorative borders do not communicate interactivity. Forced-colors remains system-controlled.

## Typography

Use the system sans stack already shipped by the app; do not download fonts or introduce a second display family. Body text uses the 14px token with 1.5 line height; comfortable copy and headings use the existing MUI theme scale. Numeric values use tabular figures where available. Preserve Vietnamese diacritics and allow long shop, customer and document names to wrap or expose a full-value path instead of clipping.

## Layout

Follow the generated breakpoints: mobile below 768px, tablet from 768px and desktop from 1280px. Desktop uses the 240px navigation rail, with a 72px compact variant where supported; the mobile app header is 56px. Use the 4/8/12/16/24/32/48px spacing tokens. Inbox list and context columns use the approved 300px and 320px targets while the conversation keeps the remaining width and its own scroll region. Tables may scroll horizontally on narrow screens; keep labels and actions available. Reserve geometry for loading and errors and do not clip long forms to fit a table viewport.

## Elevation & Depth

Hierarchy comes from the canvas/surface/raised/elevated token layers and restrained borders. Static panels do not need decorative shadows. Modal overlay uses the approved overlay token; z-index roles come from the token file. Keep sticky headers and drawers legible above content without obscuring focused controls.

## Shapes

Controls use 8px radius, cards 12px and dialogs 16px. Use the 44px touch target for primary controls and icon buttons. Dividers use the decorative border token; focus uses a visible 2px accent outline with offset.

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
