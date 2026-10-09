# C09 — Media Inbox contract and baseline

**Scope:** R06 conversation composer and message list; canonical OpenAPI + generated Frontend contract + synthetic MSW. This is a local implementation contract, not evidence of Meta/provider delivery, antivirus scanning, Backend enforcement, or production media storage.

## Baseline frozen before source edits

- Git HEAD: `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` (working tree was already dirty and is preserved).
- API source version: `2.4.0`; the release metadata still names `2.2.0`, so the API-version pointer is stale and will be reconciled with the extension record.
- Selected source/test/plan fingerprint: `cae7bf768d61a91cae932c50f2b5af328ff08da63212976b7ec7c59a64b86714` in [C09-before-source-20261009.json](C09-before-source-20261009.json).
- Before-render was built from that checkout after `generate:check` and TypeScript passed. The built demo served on `127.0.0.1:4174`, route `/s/shop-demo/inbox/cv2`; screenshot: [C09-before-inbox-build-1440x1000.png](C09-before-inbox-build-1440x1000.png). Observed: text-only composer, no attachment controls, and an explicit informational sample preview that does not make API writes.

## Verified root cause

1. `MessageWrite` requires text and has no file IDs; `Message` has no attachment metadata. Thus the send endpoint cannot represent media.
2. `getFile` is declared in OpenAPI but has no MSW implementation, so message attachments cannot be read back through the scoped API.
3. `getInboxMetadata` exposes only channel labels. Seed channels advertise text only, and there is no channel-specific MIME/count/size policy for the composer to follow.
4. The upload mock accepts only five pre-existing purposes, applies one generic 5 MB limit, marks files `ready` immediately, and the service permission map has no conversation-media purpose.
5. The Inbox preview is deliberately static and unsendable; FE016.B08 codifies that limitation.

The underlying failure is the missing end-to-end contract and ownership path (channel policy → purpose-scoped upload → send by file ID → scoped readback), not a layout or spacing defect.

## Contract decisions

- Add optional `mediaPolicy` to a channel and expose its sanitized copy in Inbox metadata. Missing, malformed, or empty policy means media is unavailable. The policy owns allowed MIME types, per-file bytes, and attachment count; the UI is advisory and MSW rechecks it.
- Add `conversation_media` upload purpose, required conversation resource scope, and `conversations.reply` permission. Upload and send validate shop, conversation, channel capability, MIME, size, count, purpose, resource ID, and `ready` status.
- Keep existing text-only requests valid. `MessageWrite` accepts optional text and optional `fileIds`, but requires a non-empty text or a non-empty file list. The persisted `Message` read model includes safe attachment metadata (file ID, name, MIME, size), never an arbitrary URL. The `sendMessage` command response remains the canonical `ResourceRef` (`type`, `id`); the UI reads attachment metadata from the message list and file bytes through scoped `getFile`.
- Implement existing `getFile` as a scoped read that checks the original purpose/resource and current permission. In the local MSW, it returns an ephemeral object URL only for a ready conversation attachment; Frontend revokes that URL on replacement/unmount and mock reset revokes remaining URLs.
- The mock may return `ready` only as a synthetic scan-pass fixture; any `quarantined` or `rejected` file is rejected at send time. This is not a real antivirus result.
- While sending, keep the composer editable. On acknowledged success remove only the submitted attachment IDs and clear the exact submitted text if it is still unchanged. On error/unknown retain the original and newer draft, preserve the same unresolved command intent, and prevent blind resend.

## Required regression states

- text-only compatibility; image, audio, and document upload; policy absent; unsupported MIME; oversized file; count limit; conversation/shop mismatch; wrong purpose; quarantined/rejected file; getFile authorization and read URL cleanup.
- Message response renders safe media metadata and supported image/audio previews with accessible names/controls; a file link is only rendered from the scoped `getFile` response.
- While a send is pending, enter new text and add another file; acknowledged completion clears only the submitted snapshot. Unknown completion retains both and emits one send command until recovery.
- Route coverage: R06, selected conversation `cv2`, demo owner; permissions `conversations.read` and `conversations.reply`; narrow viewport, keyboard focus, and dialog-free composer flow.

## Contract and plan ownership

- Canonical API: [`../../../botsales-kit/contracts/openapi.json`](../../../botsales-kit/contracts/openapi.json); generated contracts use the Frontend generator.
- Plan/status owner: [FRONTEND_UI_IMPROVEMENT_PLAN.md §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). C09 is `VERIFIED_SCOPED` after focused unit/browser/source/contract gates; C11 owns full-suite and built-demo closeout.
- UI owner and spacing: `apps/web/src/modules/inbox/conversation-components.tsx`, existing Shared UI/layout tokens; no new dependency or parallel spacing rule.
