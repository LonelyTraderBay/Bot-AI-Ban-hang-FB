# UI021/S37 — current-source crosswalk after EditDialog regression fix

**Date:** 2026-10-04 · **Scope:** `apps/web/src`, `premium-ui.json`, strict mode · **HEAD:** `e68cb65e61c5c1aab2ae169dd8033df305df8872`

## Current strict result

The current `frontend-design-premium` v1.4.0 report is [S36 JSON](S36-current-frontend-design-audit-20261004.json); its exact runner, config, report and root artifact provenance are in [S36 log](S36-current-audit-run-20261004.log). It reports **13 errors/violations, 0 warnings, 0 unresolved**, all `affordance.actionless-button`, and exits **1**. The report is byte-identical to S34 (SHA-256 `177E057F838073FF1083C7E72780EBD40B15481CC5CF3647928EB4197339FF99`). Root `premium-audit.json` remains unchanged at SHA-256 `12E315CB06ABF4C2390EAC41C1C8E2C58472530ADFEC542F374CE621FB655A01`.

## Finding-to-source review

| Finding | Current React behavior | Review result |
|---|---|---|
| `app/Shell.tsx:96` | MUI button renders as a RouterLink to `/workspaces`. | Real navigation. |
| `app/Shell.tsx:106` | Shop selector renders as a RouterLink to `/workspaces`. | Real navigation. |
| `app/router.tsx:143` | Route error action calls `window.location.reload()`; the adjacent control is a RouterLink. | Real recovery/navigation. |
| `app/router.tsx:144` | Not-found action renders as a RouterLink to `/workspaces`. | Real navigation. |
| `modules/catalog/imports.tsx:36` | Label button opens its associated hidden CSV input; `onChange` validates and stores the selected file. | Real file selection. |
| `modules/catalog/imports.tsx:51` | Download anchor has a concrete CSV URL and `download` filename. | Real download. |
| `modules/inbox/index.tsx:93` | Back action renders as a RouterLink to the Inbox list URL. | Real navigation. |
| `modules/knowledge/index.tsx:132` | The grouped JSX line includes a draft mutation handler and a label-associated file input with validation. | Real submit/file selection. |
| `modules/workspace/index.tsx:41` | Login branch invokes `login()`; the existing-session branch renders a RouterLink. | Real login/navigation. |
| `modules/workspace/index.tsx:48` | Shop create/open controls render as RouterLinks. | Real navigation. |
| `modules/workspace/index.tsx:68` | Shop form invokes its save handler; adjacent back control is a RouterLink. | Real save/navigation. |
| `modules/workspace/index.tsx:232` | Customer CTA renders as a RouterLink only when `customers.read` is present. | Real permission-gated navigation. |
| `shared/ui/components.tsx:227` | Shared `RouteLink` passes a concrete `to` destination through MUI's `component={RouterLink}`. | Real navigation. |

## Current-source fingerprints

| File | SHA-256 |
|---|---|
| `apps/web/src/app/Shell.tsx` | `423BCB9BB2D197459058F480C511EC5836AF9EB2C6D8CB276BF079304809AF54` |
| `apps/web/src/app/router.tsx` | `288F2F6B882623A72F583FE440487BC46297E601FCE2C3E59A2069D7BD3A36A8` |
| `apps/web/src/modules/catalog/imports.tsx` | `392FA4D18F22D4C565A49D84217420B0FBED4970F4121D1F688B1C978C685F86` |
| `apps/web/src/modules/inbox/index.tsx` | `8B527DAEBDC4B3388703DD593B6A771C449AFDF9BADCE6B821C9CF1C87A8685D` |
| `apps/web/src/modules/knowledge/index.tsx` | `2488E7AC7C35EE8BA50A47F086587B847DB563CA3FD8D33BADFBE8D48F8BC50A` |
| `apps/web/src/modules/workspace/index.tsx` | `14D4C9BA6F9F0F8D1B7F3C0AC114DDCC24C81C67C86A7BC7475FED3158F7543D` |
| `apps/web/src/shared/ui/components.tsx` | `FF17CFFD41AEEBBF4E681514390DF6981F2490D9BD879AB8DABBACE2F983E3A0` |

The shared UI file hash now reflects the Firefox dirty-dialog timing fix. None of the 13 scanned anchors changed, and the report's findings and hash stayed identical. This crosswalk is source review, not 13 independent click-throughs, and does not change the strict scanner exit code.
