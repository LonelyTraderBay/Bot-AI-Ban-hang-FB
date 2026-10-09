# FE020 route/operation verification — 2026-10-08

Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API. Current audit of work items, approvals, operations digests and automation controls in the React demo.

| Route | Feature IDs | Canonical reads | Canonical actions |
| --- | --- | --- | --- |
| R37 /s/:shopId/operations | F02, F03, F07 | getOperationsSummary, listWorkItems | claimWorkItem, updateWorkItem |
| R38 /s/:shopId/approvals | F04, F05 | listApprovals, getApproval | decideApproval |
| R52 /s/:shopId/operations/digests | F06, F07, F08, H01, H04, H08 | listDigests, getOperationsSummary | controlAutomation |

The nine FE020 planned operation IDs equal the unique operation union for R37, R38 and R52. Feature catalog mappings agree with the route manifest. Source-map assertions confirm generated permissions, OpenAPI permissions and current mock behavior.

Approval decisions bind to current approval version, intent hash, policy version and resource version. Work-item actions are checked against each item's allowedActions. Automation pause uses the versioned controlAutomation operation and is scoped to the selected automation.

Contract boundary: OpenAPI has no operation to create or edit a digest schedule. The interface explicitly says that schedule create/edit is not available; no API or capability is invented. Dependency/health panels retain unknown readiness for integrations without a real backend check.

Current focused browser run: 14/14 across Chromium and Firefox. Six FE020 scenarios run twice (12 results); one shared FE027 readiness scenario runs twice (2 results). FE020 source-map tests: 2/2. Results are synthetic local MSW behavior only; they do not verify real worker readiness, external integrations, a live approval service or deployment rehearsal.
