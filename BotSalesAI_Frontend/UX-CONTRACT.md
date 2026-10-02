# UX Contract

This contract records observable frontend behavior. Business and permission policy remains in the canonical contracts; this file does not create API capabilities or backend guarantees.

## Product context

- Audience: shop owners and sales, warehouse, accounting and bot-operations teammates.
- Primary jobs: review workspace state, handle customer conversations, manage catalog/stock/orders/procurement/finance and configure AI behavior.
- Target market: not legally classified by this frontend scope. Do not infer tax, privacy or payment obligations from the UI language or demo currency.
- Active locale: Vietnamese (`vi`).
- Timezone/calendar: retain the shop timezone for timestamps; date-only API values remain date-only strings and are not timezone-shifted.
- Accessibility target: WCAG 2.2 AA for the frontend implementation; manual screen-reader and actual browser-zoom evidence is tracked separately.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Permission model | `botsales-kit/contracts/permission-catalog.json`, `route-manifest.json` | Permission/API contract | 2026-10-02 |
| Data lifecycle and command outcomes | `botsales-kit/contracts/openapi.json`, `botsales-kit/docs/06_API_AND_REALTIME.md` | API/domain contract | 2026-10-02 |
| Deletion and retention | Contract operations only; no separate retention policy is defined in this frontend scope | API contract / unresolved owner policy | 2026-10-02 |
| Billing and payment | `botsales-kit/contracts/openapi.json`, relevant finance operations; server accounting policy is outside frontend scope | API contract | 2026-10-02 |
| Legal/regulatory copy | No legal-copy authority is supplied for this UI scope; do not add compliance claims | Unresolved owner input | 2026-10-02 |

## Visual contract

- Project design system: `DESIGN.md`.
- Token ownership: existing runtime package remains canonical; `botsales-kit/design/tokens.json` → `scripts/generate.mjs` → generated token package/CSS → `apps/web/src/shared/ui/theme.ts`.
- Drift gate: `npm run generate:check`; never hand-edit generated contract/token outputs.
- Supported theme: approved Graphite Gold dark-only (`botsales-kit/design/decision.json`).
- Locale and surface: Vietnamese product UI, all 54 routes; no marketing register within app flows.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | Not implemented; lists have row actions but no bulk row-selection workflow | Route manifest and current module source | N/A until a feature contract defines selection scope | Add component and E2E coverage before introducing selection |
| Select/Listbox | MUI `Select` / `TextField select` under the shared MUI theme | MUI 7.3.1 and `design/tokens.json` | Authored popup; no screen-local listbox | Browser keyboard and popup-state tests |
| Date | Native date input via MUI `TextField` | OpenAPI date-only fields and browser platform control | Native popup for date-only values; no timezone conversion | Browser input/validation E2E; verify locale in supported browsers |
| Form | MUI fields plus owning module mutation and shared `EditDialog`/`ErrorNotice` | OpenAPI operations, feature schema and API problem response | Create page or edit dialog by workflow | Component and browser validation, 422 retention, dirty-navigation tests |
| Scrollbar | Global app stylesheet and MUI theme | Generated design tokens and `bootstrap.css` | Geometry exceptions may set local overflow; never opt in for base styling | Computed-style/reflow and keyboard-scroll checks |
| Toast | No global toast provider; inline `Alert`, `QueryState` and live status are canonical | Shared `components.tsx` | Inline page/field status only; add a provider only if a durable workflow requires it | Assertive errors and polite status tests |
| CRUD | Owning feature module API hooks; shared `EditDialog` for dialog edits | OperationId/DTO in OpenAPI and route manifest | Route page, inline action or edit dialog according to operation | Full-flow browser test and mutation failure/recovery test |

## Component behavior

| Component | Default | Hover | Focus | Active | Disabled | Busy | Error |
|---|---|---|---|---|---|---|---|
| Button | MUI hierarchy; 44px minimum target | Theme hover token | Visible 2px accent outline | Theme pressed token | Mutations guard the handler and explain permission/capability where needed | Stable label/size and visible progress where used | Inline error remains available |
| Icon button | Use only for compact utility action with accessible name | Theme hover | Visible outline and tooltip where useful | Same semantic intent | Native disabled behavior | Preserve geometry | Inline status, not color alone |
| Input | Visible label and theme border | Border contrast increases | Accent border/outline | N/A | Native disabled/read-only semantics | Preserve field size | `aria-invalid` and associated help/error where field state is owned |
| Secret input | Masked by default | N/A | Visible outline | N/A | Native disabled | N/A | Never expose secret in URL/log/toast |
| Search | Committed query in URL; app-owned clear when non-empty | Theme hover | Return focus after clear | Submit with Enter/button | Disable only when route access disallows reading | Pending state owned by query | Preserve query and show query error |
| Textarea | MUI multiline field with adequate rows | Theme hover | Visible outline | N/A | Native disabled | Stable dimensions | Preserve content and show API validation feedback |
| Table/list | Accessible label, stable row key, cursor pagination | Row hover is supplemental | Scroll region is keyboard focusable | Row actions remain separate | Permission-specific content/action behavior | Shared `QueryState` | Distinct error/empty/stale composition |

## Dataset navigation

- Shop/admin collections use bounded cursor pagination from the API contract; do not invent arbitrary pages or totals.
- Search commits through the shared `Toolbar`; committed `q` stays in URL and changing it clears cursor. Clear is immediate and restores input focus. Search is submit-driven; it does not send a request for each keystroke.
- Page size and sort are exposed only where the operation supports them. Do not imply all-results selection; there is no bulk selection in current scope.
- Loading, empty, error, forbidden and stale-with-data are distinct. Read retries are explicit; mutation retries preserve current form state and must not create a second command.
- Back/route navigation preserves URL query state. Dirty forms/dialogs warn before discard; successful mutations update or invalidate the owning query cache.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Create | Owning module action | Disable duplicate mutation and retain form | Owning list/detail per operation | Inline success/status at owning surface; no global toast | Keep entered values; show inline `ErrorNotice`; retry only under operation idempotency rules | Return focus to trigger or route heading according to navigation | OpenAPI operation; module tests; `EditDialog` where applicable |
| Edit | Owning row/page action opens `EditDialog` | Stable dialog with busy action | Close only after acknowledged success; update owning query cache | Inline status | Keep dialog/draft and expose field/API error | Restore focus to opener on close | OpenAPI operation; `EditDialog`; FE023 browser tests |
| Delete/archive | Only when the canonical operation and permission exist | Confirm object and consequence for irreversible/high-risk actions | Keep route context and remove/update owning row after acknowledgement | Inline status | Keep confirmation/form open on failure; no false success | Restore focus to the prior row/action where it remains | Operation and permission catalog; module test |
| Search | Shared toolbar submit or clear | Query state owns loading | Same route with URL state | Results count/status where available | Keep committed query and show retryable error | Clear returns focus to search input | `Toolbar`; route state tests |
| Bulk action | Not implemented in current route map | N/A | N/A | N/A | N/A | N/A | No selection owner in current UI |
| Upload/background job | Feature-specific file or command action | Show supported file limits and pending state | Keep user in owning feature; follow canonical command status when available | Inline status with synthetic label in demo | Preserve draft/file metadata when safe; distinguish unknown outcome | Return focus to action or relevant status | Upload purpose in OpenAPI; FE017/FE021 tests |
| Cancel/back | Close, route link or browser navigation | N/A | Previous route/context when safe | Discard dialog if dirty | Keep current values if user cancels discard | Restore prior focus target | Shared `EditDialog` and dirty-draft guards |
| Soft-delete | Only for operations explicitly modeled by contract | Confirmation per operation risk | Keep list context and remove/archive according to response | Inline status | Preserve row and show error | Restore list focus | OpenAPI lifecycle operation |
| Hard-delete | No generic hard-delete capability is inferred | Requires explicit contract, authorization and consequence confirmation | N/A until an operation exists | N/A | N/A | N/A | Escalate policy to owner; do not invent endpoint |

## Navigation and responsive behavior

- Route title comes from route metadata and shell; 403, 404 and route error are app-owned and distinguishable. The shop shell remains navigable where the route is scoped to a shop.
- Desktop uses sidebar navigation; mobile keeps route access through the responsive shell. No action or permission is lost when layout changes.
- Data tables may scroll horizontally on narrow viewports with a visible hint and keyboard-focusable region. Inbox conversation and context panes have independent bounded scroll areas.
- Full values must remain accessible by wrapping or a deliberate disclosure; do not depend on hover-only access.
- Sticky regions cannot obscure keyboard focus; focus is restored after dialog dismissal.

## Overlays and feedback

- Dialog owner: MUI `Dialog` via shared `EditDialog`; `AlertDialog` semantics are used for discard confirmation.
- Confirmation: required for destructive, permission-changing, bulk, costly or irreversible operation; do not add confirmation to routine reversible saves.
- Feedback: shared inline MUI `Alert` and live-region states; no global toast. Critical correction remains inline.
- Unsaved changes: `EditDialog` compares draft baseline, app navigation guard warns, and browser unload guard is limited to actual unload.
- Layer ordering follows generated z-index tokens; dialogs, menus/popovers and status do not cover the focused control.

## Async and resilience

- TanStack Query owns server state. Mutations are pessimistic for finance, publish, permission and external effects; never claim completion before acknowledged result.
- Mutations are not blindly retried. Reads may expose explicit retry; stale requests use `AbortSignal`/query invalidation and shop changes clear or scope cache.
- Unsaved form input is preserved on 422, version conflict, network failure and unknown result. Unknown command results keep the command ID and reconcile before another intent.
- Offline disables unsupported writes and shows the reason; there is no silent queue. Session, shop change or revoke clears scoped state and rejects late responses.
- Long-running work displays the contract status or an explicitly synthetic preview; refresh/reload is not represented as durable persistence in demo mode.

## Validation

- API DTOs and operation schema are canonical in OpenAPI; frontend field constraints are a UI layer, not a copied API model.
- Validation is inline and localized. Preserve values, identify the field error, focus the first invalid field where mapped and prevent duplicate submit.
- All owned app forms use app validation rather than browser bubbles; prefer `noValidate` and shared error feedback when a literal form is used.
- Secrets and API keys are masked/write-only; do not persist them in local storage, URLs, analytics, logs or feedback.

## Permission and clipboard

- Hide navigation/actions without required frontend capability, but retain app-owned 403 handling on direct route access. Client permission display is not server authorization.
- Permission source is the canonical catalog and route manifest. `allowedActions` is used only when defined by the contract; FE017 mock publish uses `knowledge.publish` plus lifecycle checks per the user's scope decision.
- Do not copy secrets or unredacted sensitive data to clipboard; long values need a deliberate copy action and visible confirmation.

## Verification

- Static/runtime commands: `npm run generate:check`, `npm run verify`, `npm run test:e2e`, `npm audit`.
- Browser matrix currently evidenced: Chromium desktop plus route reflow at 320 CSS px. Other browsers/devices are not inferred from Chromium.
- Accessibility: Playwright/Axe and keyboard skip-link checks on 54 routes; actual browser zoom and full screen-reader review remain unverified until separately evidenced.
- Component/state coverage: `apps/web/src/shared/ui/components.tsx`, `tests/states/`, `tests/accessibility/routes.spec.ts`.
- Canonical sibling workflow: catalog→stock→order and inbox→knowledge/bot from `tests/vertical-slices/fe022-flows.spec.ts`.
- Project audit: `py -3 <frontend-design-premium>/scripts/audit_project.py . --mode strict`; latest report is in `evidence/frontend-design-audit-current-20261002.json` and findings must be resolved or explained with direct source evidence.
- CRUD full-flow evidence: `tests/vertical-slices/fe022-flows.spec.ts`; failure-path evidence: `tests/states/route-error-composition.spec.ts`.
