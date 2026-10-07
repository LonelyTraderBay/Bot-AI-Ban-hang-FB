# UI008.C01 — baseline inventory: channel and related integration card lists

**Date:** 2026-10-02 · **Scope:** React/TypeScript frontend with synthetic MSW data. No API contract or generated file was changed.

## Baseline identity

- Git `HEAD`: `e68cb65e61c5c1aab2ae169dd8033df305df8872`. The checkout already contained unrelated/local changes before UI008; hashes below identify the working files used for this inventory and do not attribute the whole worktree to UI008.
- Canonical contracts: `botsales-kit/contracts/route-manifest.json`, `openapi.json`, `permission-catalog.json`; visual tokens: `botsales-kit/design/tokens.json`.
- Browser repro: [S01-baseline-browser.log](S01-baseline-browser.log), screenshots [R29](S01-R29-empty-before.png) and [R30](S01-R30-empty-before.png). Both API calls returned HTTP 200 with `data: []`; both page shells and their header actions remained, while their card regions rendered no explanatory status. The two repro tests passed because they explicitly recorded the blank-success baseline.

## Routes, contract and permission boundary

| Route | Contract reads | Required permission | Empty-capable content | Write action permission |
|---|---|---|---|---|
| R29 `/s/:shopId/integrations/channels` | `listChannels`; route also lists `getChannel`, `getJob` | `integrations.read` | Facebook Page cards | `integrations.manage` for connect, reconnect, disconnect, health check |
| R30 `/s/:shopId/integrations/ai` | `listAIConnections`, `getProviderCatalog` | `integrations.read` | AI connection cards | `integrations.manage` for create/update/test/delete |

`listChannels` returns `ChannelListResponse` (`data`, `meta`, `page`) and `listAIConnections` returns its collection response; both GET operations declare `integrations.read`. The permission catalog grants `integrations.read` to `bot_admin` but not `integrations.manage`, so it is a useful read-only acceptance role. `MutationButton` calls `useCan` and renders no button when the action permission is absent; server enforcement remains outside this frontend mock audit.

## UI/source findings

| Location | Observed behavior for successful empty response | State owner and architecture implication |
|---|---|---|
| `apps/web/src/modules/integrations/index.tsx:11-27` — `ChannelsPage` | `QueryState` correctly owns pending/error/403/retry. On success, `<Stack>` maps `list.data?.data` into `Panel` cards with no empty branch; R29 therefore shows its title, demo alert and permission-gated header CTA above a large blank area. | The list query is a single `useApi('listChannels')`, scoped by shared query hook to user/shop/permission version. Empty is distinct from request failure; render explicit empty only on successful data `[]`. Existing `integrations.manage` CTA must remain hidden from read-only users. |
| `apps/web/src/modules/integrations/index.tsx:29-40` — `AIProvidersPage` | `QueryState` correctly owns list pending/error; successful `listAIConnections=[]` creates an empty grid with no content message. Header action exists for users with `integrations.manage`. | List and provider catalog are separate queries. Empty-state content should depend on connection-list success, not catalog success; the “add” action opens an editor that also depends on provider catalog. Do not claim a usable provider exists if catalog is unavailable. |
| `apps/web/src/shared/ui/components.tsx:77-104` — `Empty` / `QueryState` | Shared `Empty` uses `role=status`, `aria-live=polite`, token-based touch target/raised color, and accepts optional action. `QueryState` distinguishes pending, error/403, stale error and successful child rendering. | Reuse shared primitives. Prevent error/403 from taking the empty branch. Keep action permission-guarded; avoid duplicating the same primary action in both page header and empty state. |
| `apps/web/src/shared/ui/components.tsx:194-210` — `MutationButton` | Calls `useCan`; when permission is absent it returns `null`. | R29/R30 page read access and action access are distinct by design. Test with `bot_admin` to prove read-only empty state remains visible without forbidden CTA. |
| `tests/states/route-empty-composition.spec.ts:14` | Canonical empty-route composition currently covers 9 routes (`R07`, `R09`, `R12`, `R17`, `R21`, `R39`, `R44`, `R48`, `R50`); neither R29 nor R30 is included. | `9/9` is not evidence for integration card empty states. Add route-level acceptance for the affected cards; do not rewrite generated route data. |
| `tests/fe019.spec.ts:34-62,144-172` | Existing FE019 coverage checks route/operation/permission mapping and synthetic OAuth/reconnect failures, not successful empty card rendering. | Extend dedicated UI008 coverage while retaining FE019 source/contract assertions. |

Shared tokens checked: dark Graphite Gold palette, 8 px control radius, 12 px card radius, 44 px minimum target; use existing `Empty` component rather than new colors/spacing literals. The empty route has no search/filter parameter, so its state is first-use/no-resource. R29 must not imply a real Meta authorization from the mock CTA. R30 must not imply a configured AI provider from the mock CTA.

## Confirmed scope and non-scope

- **Confirmed UI008 defects:** R29 successful empty Page list and R30 successful empty AI-connection list render blank content regions. Screenshots reproduce the actual built demo and HTTP 200 `data: []` responses.
- **Already correct / retain:** loading and error/403 are owned by `QueryState`; the shell already applies action permission; shared `Empty` supplies accessible status semantics and accepts an action.
- **Reviewed, not promoted to defect:** version/history and budget collections are table-backed and use `DataTable` empty handling; they are not card lists in R29/R30. No unrelated inventory/product/order card is added to this task without separate reproduction.
- **Frontend-only limit:** roles, API replies, OAuth failures and permissions in this evidence are mock fixtures and do not prove backend authorization or real provider behavior.

## Working-tree SHA256 before UI008 implementation

| File | SHA256 |
|---|---|
| `apps/web/src/modules/integrations/index.tsx` | `1C5ECB6961044B812ED6F189F44BAEEAC78708AA404423431C698EEC76AE2256` |
| `apps/web/src/shared/ui/components.tsx` | `110D98CDDA975C3D98D2BE0A89A66EE8AB76AC260A06DDDC82AD38933D191B2C` |
| `apps/web/src/mocks/service.ts` | `E9043A25B86F7AC07DEA9D609593397EA9BC2B0FAA945058C7EA4566F16CCD69` |
| `botsales-kit/contracts/route-manifest.json` | `360871C008FAC723CFC77DEC79417838D24D4FAE844452909EB347EC8893F2B2` |
| `botsales-kit/contracts/openapi.json` | `D88A70957A9DE36402FF5AC0CB757A2F1C496519C7E1FD2E28DF17E867F78C7C` |
| `botsales-kit/contracts/permission-catalog.json` | `58461BEB5D4AD1A19107CDF01361E2A649A41DEA611272D84EE79FCD376D55D1` |
| `botsales-kit/design/tokens.json` | `B4083EB2032D9EBAC7F1F793F3AAE1CDA6A30E075B0DD9E19F241567651D1895` |
| `tests/states/route-empty-composition.spec.ts` | `8355C4F884590E5951E00BBCE8A2A4221D9C20DE7949A889AAAA02C70DD906A5` |
| `tests/fe019.spec.ts` | `96310D25E03FE47D512EFE3CADBF9FD53997C82B4B95FF5099272D6A68633425` |
