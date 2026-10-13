# Frontend design audit reconciliation — snapshot 02/10/2026 (superseded for current source on 03/10/2026)

Historical snapshot only. The line mappings below were refreshed against current React source in [UI021/S01](frontend-ui-improvements/UI021/S01-current-source-inventory.md). Do not use this file as a current-source crosswalk; the latest audit JSON itself has not been rerun after subsequent source changes.

Scope: `apps/web/src` as declared by `premium-ui.json`. The strict audit exits 1 with 12 `affordance.actionless-button` findings and no unresolved ownership findings. The previous MUI select ownership finding is resolved: demo controls now use labelled MUI `TextField select` fields with a 44px minimum control height.

The remaining 12 findings are parser false positives. The bundled auditor only recognizes literal HTML `onclick`/Vue click attributes and submit behavior on its parsed `<button>` tags; it does not understand React/MUI props such as `onClick`, `component={RouterLink}`, `to`, or a file input nested inside a label button. Source inspection confirms each flagged control has a real action or navigation target:

| Finding | Implemented behavior |
|---|---|
| `Shell.tsx:96`, `Shell.tsx:106` | MUI buttons render React Router links to `/workspaces`; the corresponding `to` prop owns navigation. |
| `Shell.tsx:100` | Retry invokes `shopQuery.refetch()` from `onClick`. |
| `router.tsx:143` | “Tải lại” calls `window.location.reload()`; “Chọn cửa hàng” navigates through `RouterLink`. |
| `router.tsx:144` | “Về cửa hàng” is a React Router link. |
| `catalog/imports.tsx:36` | Label button activates its nested hidden CSV input; `onChange` validates file type/size and updates form state. |
| `catalog/imports.tsx:51` | Sample download is an anchor (`component="a"`) with `href` and `download`. |
| `inbox/index.tsx:94` | Conversation action calls the owning send/note mutation from `onClick`; current conversation browser flows are covered by FE014/FE016 specs. |
| `knowledge/index.tsx:125` | Label button activates a hidden upload input; `onChange` validates type/size and updates the knowledge draft. |
| `workspace/index.tsx:41` | Login button calls `login()`; the signed-in branch is a RouterLink to `/workspaces`. |
| `workspace/index.tsx:48` | “Tạo cửa hàng” and shop cards navigate through RouterLink targets. |
| `workspace/index.tsx:68` | “Tạo cửa hàng” submits validated form state; “Quay lại” is a RouterLink. |
| `shared/ui/components.tsx:191` | The shared `RouteLink` renders a MUI button backed by a React Router link target. |

Current runtime evidence is the full Chromium suite at `../botsales-kit/execution/frontend-evidence/FE027/e2e-ui-select-and-feplan-002-current-20261002.log`; it covers app navigation, feature actions, file validation, route errors, and keyboard/accessibility checks. This reconciliation explains the static tool limitations; it does not claim the strict audit exits 0 or replace runtime verification.
