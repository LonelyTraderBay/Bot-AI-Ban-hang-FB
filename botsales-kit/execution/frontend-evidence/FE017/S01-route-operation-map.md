# FE017.S01 — Knowledge routes, API operations and gaps

Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`. FE017 owns the knowledge module, its mock behavior and focused tests. The canonical OpenAPI/route/permission files remain the source of truth and are not changed here.

| Route | Canonical reads | Mutations and permission | Current UI |
| --- | --- | --- | --- |
| R23 `/s/:shopId/knowledge` | `listKnowledge`, `getFile` — `knowledge.read` | `createKnowledge` — `knowledge.write`; `uploadFile` uses multipart `purpose=knowledge_source`, requiring `knowledge.write` per the operation description | `apps/web/src/modules/knowledge/index.tsx` |
| R24 `/s/:shopId/knowledge/:knowledgeId` | `getKnowledge`, `listKnowledgeRevisions`, `getKnowledgeRevision` — `knowledge.read` | `updateKnowledge`, `createKnowledgeRevision`, `restoreKnowledgeRevision`, `submitKnowledgeReview` — `knowledge.write`; `publishKnowledge`, `retireKnowledge` — `knowledge.publish` | Knowledge detail component in the same module |
| R25 `/s/:shopId/knowledge/review` | `listFeedback` — `knowledge.read` | `reviewFeedback` — `knowledge.write`; approving creates a draft candidate only | Feedback review component in the same module |

Implemented and browser-verified in FE017: typed read/command hooks cover all 15 mapped operations, including `getFile` status and `getKnowledgeRevision` detail; the source form keeps retry input and the uploaded file ID; review, publish, restore, and feedback actions retain reasons and bind to current versions/revisions. Publish is gated by the canonical `knowledge.publish` session capability plus lifecycle state. The mock checks current version, review state, exact draft revision and a passed evaluation for that revision. Review jobs/commands are asynchronous; command success is not inferred from a request being accepted. Six Chromium scenarios cover the draft-to-publish lifecycle, immutable published history, upload purpose/status, invalid inputs, feedback HTML-like text, manager denial and stale review.

The implementation gaps identified at intake are resolved: knowledge uploads include the required `purpose=knowledge_source`; the detail view reads `getFile` and labels `quarantined`, `ready` and `rejected` file states; browser tests cover invalid extension/size, stale review, server-side purpose permission denial and inert HTML-like feedback. Mock uploads currently produce `ready`, so quarantined/rejected display states are contract-backed labels but are not separately seeded as mock outcomes.

Contract gap that must remain explicit: the canonical `Knowledge` schema does not declare `allowedActions`, while this frontend task's AC01 asks that publish follow `allowedActions`. The schema only exposes lifecycle `status`, `draftRevisionId` and `publishedRevisionId`; route/operation permissions describe `knowledge.publish`. Do not invent or add an untyped response property. The UI may gate using canonical lifecycle state and the session capability, and the mock must still reject stale/invalid publish requests, but the `allowedActions` criterion remains unverified until the contract owner adds that field.

Shared upload limitation remains outside this task: other product-import and finance-import callers use `uploadFile` without a canonical purpose, and the enum has no finance-import purpose. This module sends `knowledge_source`; the synthetic handler enforces purpose-specific permissions when a purpose is supplied and temporarily preserves legacy missing-purpose callers. Do not silently treat the missing finance purpose as a knowledge upload or change the OpenAPI enum here; reconcile those callers/contracts in their owning task scope.

Primary sources: `contracts/route-manifest.json` R23–R25, `contracts/openapi.json` operations and schemas `Knowledge`, `KnowledgeWrite`, `KnowledgePublishRequest`, `FeedbackReview`, `FileUpload`, `FileObject`; `contracts/permission-catalog.json`; `docs/02_ARCHITECTURE.md`, `docs/06_API_AND_REALTIME.md`, `docs/07_AI_AND_CHANNELS.md`, `docs/09_STATE_AND_DATA_ACCESS.md`, and `docs/18_CODING_STANDARDS.md`.

## Revalidation against current source — 2026-10-08

- Canonical FE017 still owns routes R23–R25 and 15 operations; the route operation union matches the task's 15 operation IDs.
- The feature catalog maps H07 to R34 and H08 to R52. The FE017 task instead lists R23–R25, whose route-manifest entries omit featureIds. This is an unresolved feature-to-route traceability mismatch. It is recorded as a contract gap; no route or feature mapping was guessed or changed.
- Knowledge.allowedActions remains absent from the canonical schema. The verified UI gate is the previously approved substitute: knowledge.publish permission plus the canonical ready_for_review lifecycle state. This is not evidence of a server-provided allowed-actions field.
- Current focused Chromium/Firefox run: 20/20. It contains 8 FE017-specific scenarios twice (16 results) plus 2 shared FE027 scenarios twice (4 results). Current source-map group: 16/16, including FE017's 4 source-map assertions. Current full E2E: 512/512; current unit: 138/138; current domain/network: 88/88.
- All results are local React/MSW synthetic behavior. They do not verify a live file processor, publication service, feedback service, or backend authorization.

## Acceptance decisions confirmed during the 01/10/2026 run

- The canonical `Knowledge` schema still has no `allowedActions`. Per the user's latest instruction to fully unblock frontend implementation with mock data, FE017 uses an explicitly documented frontend substitute: `knowledge.publish` permission plus canonical resource lifecycle/version/review/evaluation checks. Tests assert that the field is absent and unauthorized/stale publish requests are rejected. This is not server-provided `allowedActions`; no DTO field, permission or endpoint is invented. Production API authorization remains unverified.
- FE017.AC02 uses separate canonical `listProducts` and timestamped `listStockSnapshots` responses, each guarded by its own read capability. Knowledge text and cached embeddings do not become price/stock authority. These read APIs are app-composed shared services, not knowledge-module imports.
- Current source-map tests pass 4/4. Current task browser coverage is eight cases across `fe017-validation.spec.ts` and `fe017.spec.ts`; the full Chromium suite passed 123/123. These verify synthetic frontend behavior only.
