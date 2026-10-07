# UI028.W24 — Inbox design contract, pre-source edit

**Phase:** `PRE_SOURCE_EDIT` · **Date:** 2026-10-06 · **Revision:** `e68cb65e61c5c1aab2ae169dd8033df305df8872` · **Scope:** Frontend React/TypeScript + synthetic MSW only.

## Route and behavior contract

| Route | Canonical source | Read/action contract | Invariants to preserve |
|---|---|---|---|
| R05 `/s/:shopId/inbox` — Hộp thư | `botsales-kit/contracts/route-manifest.json` | `conversations.read`; `listConversations`, `getInboxMetadata` | Search/status/mode/channel/assignee filters and list cursor stay in URL; selecting a row preserves filters/cursor; empty inbox differs from no filter results; event refresh must not jump list position; shop scope rejects late responses. |
| R06 `/s/:shopId/inbox/:conversationId` — Chi tiết hội thoại | `botsales-kit/contracts/route-manifest.json`, `contracts/openapi.json`, `UX-CONTRACT.md` | Reads: `getConversation`, `listMessages`, `getCommand`, `getInboxMetadata`. Writes stay exactly as contracted: send/note require `conversations.reply`; assign/takeover/release/resolve require `conversations.assign`; feedback uses `createFeedback`. | List and message cursors remain independent (`listCursor` vs `cursor`); refresh/deep link/Back restore the correct page; unsent draft survives viewport resize and message pagination; selected conversation/context remain stable; message scroll owner and newest-message behavior stay unchanged; unknown sends are not retried; hidden permissions remain hidden; no media/API behavior is invented. |

## Profile and design reference

Profile is **Queue/workflow/panes**, using `docs/FRONTEND_SPACING_STANDARD.md` §13.3. No same-profile route in the current migrated set was established as a reference, so this contract uses that semantic profile table; Dashboard R04 and collection-only routes are not treated as visual peers. Recheck this choice if the migrated route set changes before implementation.

Keep existing geometry and behavior: inbox list/detail breakpoint composition, 300 px list column, 260 px context column at its existing breakpoint, internal message/context scroll regions, keyboard order, focus targets and mobile Back action. This task normalizes spacing ownership; it does not redesign workflow, typography, colors, density, permissions, API state or route geometry.

| Region / relationship | Semantic owner to use | Expected rule |
|---|---|---|
| Page header, outer list/detail panes | `pageHeader.afterGap`, `grid.gutter` | Header and grid each own one boundary; grid gutter follows canonical 24 px role. |
| Search/filter region | `toolbar.inset`, `toolbar.controlGap`, `surface.bodyInsetAfterHeader` | Keep the filter region horizontally aligned to the list surface; do not add a second top inset after the search toolbar. |
| Conversation row | `inbox.listInset`, `inbox.messageContentGap`, existing inline/status role or a justified typed Inbox role | Row inset 16; identity, unread count, preview and mode status remain readable and wrap safely. |
| Thread header/notice/message viewport | `inbox.paneInset` and existing action/notice roles | One owner for each inset; message viewport inset 16; warning spacing must not double with Panel padding. |
| Bubble and message content | `inbox.bubbleInset`, `inbox.messageContentGap`, `inbox.messageMetaGap`, `inbox.messageGroupGap` | Bubble inset 12; caption-to-body 4; content-to-source/meta 8; message-to-message 12. |
| Composer and customer context | `inbox.composerInset`, `inbox.composerActionGap`, `inbox.contextInset` | Composer inset 16 and action flow 8; context inset 16/24 responsive; preserve draft and independently scrollable context. |
| Demo-only previews in R06 | Existing `surface.*`, `actions.*`, `form.*` roles; add an Inbox role only if meaning/owner differs | Keep disclosure and labels visible; previews remain clearly simulated and do not trigger writes. |

Any missing role must be added to the single typed bridge in `apps/web/src/shared/ui/layout.ts`, justified by semantic relationship, units/responsiveness, consumers and regression evidence, then listed in the standard before a consumer uses it. No module-local spacing maps, raw spacing literals, generic style escape hatches, or route-specific visual override.

## Pre-edit source baseline

`layout-before-spacing-current-2026-10-06.json` records the source checker report used by the render capture. It is migration debt, not a pass: **66 total findings; 35 in `inbox/index.tsx`; 11 in `inbox/conversation-components.tsx`; 20 owned by W25 Reports.** `baseline-manifest-current-20261006.json` records current input hashes and checkout revision. The two Inbox source files already had staged/unstaged edits; hashes represent the exact pre-edit working tree and these edits must be preserved.

Before/after render cases: R05 default list, R06 selected latest messages, and R06 deep link `/s/shop-demo/inbox/cv2?listCursor=cv1&cursor=m2`; Chromium at 390×844 and 1280×900. Capture local demo/MSW only, record document overflow, API writes and page errors. R06 deep-link cursor validity is grounded in `tests/fe016.spec.ts`.

## Close criteria

- Reduce W24 owner findings to zero; no new finding in either target file or outside the W24 owner boundary. Keep W25 findings assigned to W25; do not lower checker thresholds or add blanket exceptions.
- Run actual strict layout check and fixtures, generator freshness, source/boundary/lint/type checks, focused Inbox browser regressions and relevant builds. A strict whole-app failure from W25 debt must remain reported accurately.
- Compare before/after captures at identical route/state/viewport; prove no page overflow, no unexpected write, no page error, selected/context/composer remain present and geometry/scroll semantics remain intact.
- Record UI and ARCH verdicts separately. Do not modify the FE/full-product ledger or mark owner acceptance.
