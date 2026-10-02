# FE016.S01 — Inbox contract and source map

Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`. This task owns the inbox module, its mock handlers/fixtures and related tests. It does not own the shared shell, session transport or order module.

| Route | Read contract | Mutations and permission | Current UI owner |
| --- | --- | --- | --- |
| R05 `/s/:shopId/inbox` | `listConversations` (`conversations.read`), `getInboxMetadata` (`conversations.read`) | No mutation | `apps/web/src/modules/inbox/index.tsx` |
| R06 `/s/:shopId/inbox/:conversationId` | `getConversation`, `listMessages`, `getInboxMetadata`, `getCommand` (`conversations.read`) | `sendMessage`, `addInternalNote` (`conversations.reply`); `takeoverConversation`, `releaseConversation`, `assignConversation`, `resolveConversation` (`conversations.assign`); `createFeedback` (`conversations.read`) | Inbox module; app-owned order composition is a route link with `customerId` and `conversationId` |

The generated operation contract carries `listConversations` query fields `q`, `status`, `mode`, `channelId`, `assignedUserId`, `cursor`, `limit` and `sort`. Inspection found the page initially sent only `q` and `limit`; FE016 now sends the supported status/mode/channel/assignee filters and cursor, applies the same filters in MSW, keeps them when opening a conversation, and separates the list cursor from message pagination. Detail sends a versioned `MessageWrite` with `clientMessageId`, text and `expectedConversationVersion`; command writes use the shared `useCommand` polling/idempotency/unknown-outcome handling. `ScopeEvents` is mounted by the shell and invalidates scoped queries on reconnect, duplicate/out-of-order events and `resync.required`; `CommandRecovery` reads `getCommand` before unlocking an unresolved intent.

Message renders text through React text nodes. `Message.sourceEvidence` is a typed array of opaque `{type,id}` refs rendered as inert labels. `Conversation.customerId` is the only typed contact reference and links only when `customers.read` is present. The composer uses the app route `/orders/new?customerId=…&conversationId=…` and appears only with `orders.write`.

Known contract gap retained visibly: canonical `Message` has text and source references but no media/attachment DTO or media read operation. The frontend cannot invent upload/download endpoints or render an arbitrary URL from message data. Keep the current unsupported-media notice and cover HTML-like message text as inert content. No provider send, bot execution, delivery claim, or published knowledge mutation belongs in this mock UI.

Primary sources: `contracts/route-manifest.json` R05/R06, `contracts/openapi.json` schemas and operations above, `contracts/permission-catalog.json`, `contracts/events.schema.json`, `docs/06_API_AND_REALTIME.md`, `docs/07_AI_AND_CHANNELS.md`, `docs/09_STATE_AND_DATA_ACCESS.md`, and current inbox/mock/shared recovery source.
