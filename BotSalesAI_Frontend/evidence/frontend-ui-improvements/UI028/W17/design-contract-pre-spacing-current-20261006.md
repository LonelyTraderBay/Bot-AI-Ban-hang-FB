# UI028.W17 — Knowledge pre-spacing design contract, 06/10/2026

## Provenance and scope

- W item UI028.W17, C03, dependency W09; route owners R23/R24/R25 only.
- Owner `apps/web/src/modules/knowledge/index.tsx` SHA-256 at W17 intake: `FFCE0192D394F55B1F2C98336BB1502F27C8B9BE0A678FCA1BA9586982773785`.
- The source already had staged and unstaged changes before this W17 step. Baseline records this exact checkout. It does not claim a clean-HEAD baseline; the implementation delta must preserve all pre-existing work and must not stage or reset it.
- Canonical input hashes at intake: `route-manifest.json` `360871C008FAC723CFC77DEC79417838D24D4FAE844452909EB347EC8893F2B2`; `openapi.json` `D88A70957A9DE36402FF5AC0CB757A2F1C496519C7E1FD2E28DF17E867F78C7C`; `UX-CONTRACT.md` `DA010ABF3CF9BA37FD3AD9F7EE3EE201ADF985D8A84C3FEF2FF7469B5D2E72F2`; mock `service.ts` `E9043A25B86F7AC07DEA9D609593397EA9BC2B0FAA945058C7EA4566F16CCD69`; mock `seed.json` `FA115CADBE18A035602D1FE1ACFFE9714B0EAF99354927F99823BF8B6C3D744D`; shared layout bridge `layout.ts` `984AC6CDB9406FC285403BD0BCFA1039091FC3A7FDC652D3B80B5E8F23F122ED`.
- Strict spacing baseline is 251 findings globally, with 19 in Knowledge. A fresh report and paired browser baseline are required before any W17 source edit.

## Canonical route/action trace

| Route | Contract operations and permission | UI invariants to preserve |
|---|---|---|
| R23 `/s/:shopId/knowledge` | `listKnowledge`, `getFile` (`knowledge.read`); `createKnowledge` (`knowledge.write`); `uploadFile` uses the existing purpose-specific `knowledge_source` flow | Manual content or an allowed file creates a draft. An upload/processing state is not published or indexed proof. Keep validation, 5 MB/type limits, retained file ID on safe retry, PII warnings, cursor/filter scope and explicit draft status. |
| R24 `/s/:shopId/knowledge/:knowledgeId` | `getKnowledge`, `listKnowledgeRevisions`, `getKnowledgeRevision`, optional `getFile` (`knowledge.read`); `updateKnowledge`, `createKnowledgeRevision`, `submitKnowledgeReview`, `restoreKnowledgeRevision` (`knowledge.write`); `publishKnowledge`, `retireKnowledge` (`knowledge.publish`) | Published content is immutable; edits create a revision; restore creates a draft and never auto-publishes. Publishing is gated by the evaluation run for that exact revision, version and reason. Keep stale-evaluation, permission, pending/error/unknown and retired-source warnings explicit. The `Knowledge` schema does not define `allowedActions`; do not invent it. |
| R25 `/s/:shopId/knowledge/review` | `listFeedback` (`knowledge.read`); `reviewFeedback` (`knowledge.write`) | Review uses redacted correction and a reason; approval creates a candidate/draft reference only. It does not train or publish automatically. Keep source-message identity, decision, conflict/error and PII boundaries visible. |

## Layout contract and baseline plan

- Shell owns page gutter. `Panel` owns its body inset. Knowledge subpanels for product content/catalog sources, revision history, and feedback review must not add a second inset around an already inset panel.
- Form fields and grouped actions use typed semantic roles. Two missing relationships are justified for this owner before consumer use: `surface.contentGap` for medium vertical rhythm between mixed alert/query/table/reference content inside a panel body; `actions.relatedLinksGap` for the medium, wrapping group of related catalog/inventory navigation links. Both derive from existing canonical factors and are defined once in `apps/web/src/shared/ui/layout.ts`. Form stacks reuse `form.fieldGap`; detail and notice spacing reuse existing surface/notice roles.
- Preserve long source content and filenames, text wrapping, file/remove/error states, revision table geometry, action grouping, and dialog bounds. Do not create visual token literals or alter the feedback/publish lifecycle.
- Before-code captures cover R23 list/create dialog, R24 draft detail/editor dialog, and R25 review list/dialog at 390×844 and 1280×900 (12 observations). The canonical default seed has no feedback rows, so one synthetic pending feedback is created via the existing inbox flow per isolated viewport; the two setup POSTs are recorded separately. The capture itself has 0 writes and 0 page errors; no upload, review decision, knowledge mutation, or publish is submitted.
- Paired after render must use the same route/state/mock reset/browser/viewport. Responsive tests also cover 320/390/768/1280/1440 CSS px. The W17 delta must clear all 19 owner findings and add zero findings anywhere else.

## Intended verification

Run targeted FE017 lifecycle/upload/revision/feedback/PII/permission regressions, route-state checks and the existing layout suite; then run generator, source, boundaries, lint, typecheck, domain/MSW, Vitest, production build and layout fixtures/full verify. Keep UI and ARCH verdicts separate. The global strict gate can remain nonzero only for remaining W18–W25 debt; no suppression or threshold change is allowed. This is synthetic/local Frontend evidence only.
