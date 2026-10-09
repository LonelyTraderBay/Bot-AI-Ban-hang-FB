# FE018 — Canonical route, operation and capability map

| Route | Canonical reads | Mutations and permission | Frontend owner |
| --- | --- | --- | --- |
| R26 `/s/:shopId/bot` | `getBotConfig`, `listAIConnections`, `listBotRevisions`, `getBotRevision` | `updateBotDraft` (`bot.configure`), `publishBotConfig`, `pauseBot`, `restoreBotRevision` (`bot.publish`) | `apps/web/src/modules/bot/index.tsx` |
| R27 `/s/:shopId/bot/playground` | `getBotConfig`, `listAIConnections`, `listKnowledge` | `runPlayground` (`bot.test`) | same module |
| R28 `/s/:shopId/bot/evaluations` | `listEvaluations`, `getEvaluation`, `getBotConfig` | `createEvaluation` (`bot.test`) | same module |
| R51 `/s/:shopId/bot/team` | `listAgentRoles`, `listBudgetPolicies` | `updateAgentRole` (`agents.manage`), `controlAutomation` (`operations.manage`) | same module |

## Revalidation against current source — 2026-10-08

- The FE018 plan's 18 operation IDs equal the unique read/action union for R26, R27, R28, and R51. F01, H02, and H03 each map to R51 in the feature catalog, and R51 declares those feature IDs.
- The bot module calls updateBudgetPolicy with the OpenAPI-defined operations.manage permission. That operation is absent from both the FE018 task operationIds and R51 actions, despite the task covering budget editing. This remains a plan/route traceability gap; no canonical route or plan migration was applied during this verification.
- The canonical schemas still lock requireHumanOrderConfirmation to true, omit BotConfig.allowedActions, prohibit AgentRoleWrite from granting allowedToolIds, and do not define Evaluation.mockOnly. The UI/mock keep these boundaries and label model evaluations as synthetic.
- Current focused browser run: 26/26, comprising 10 FE018 scenarios twice (20 results), one shared FE027 scenario twice (2 results), and two UI004 cursor scenarios twice (4 results). FE018 source-map tests: 2/2; current group: 16/16. Current full E2E: 512/512; unit: 138/138; domain/network: 88/88.
- Results verify local React/MSW behavior only. They do not demonstrate a real AI provider call, model-quality measurement, external publication, or production budget/kill-switch enforcement.

## Explicit route gap

OpenAPI also defines `updateBudgetPolicy` with `operations.manage`; the UI uses this canonical operation for versioned, approval-bound limit edits. Route R51 currently omits that operation from its `actions` map, so the route/source test verifies the OpenAPI permission while this map records the manifest gap. No route-manifest or OpenAPI edits are made.

The module reads provider capabilities and role tool IDs from canonical schemas. `AgentRoleWrite` cannot grant `allowedToolIds`. `BotConfigWritePatch.requireHumanOrderConfirmation` is contract-locked true, and `BotConfig.allowedActions` is absent. The frontend preserves these constraints. Playground and evaluation outputs are labeled synthetic, return unknown cost/token values when unmeasured, and never send an external message.

Primary sources: `contracts/route-manifest.json` R26/R27/R28/R51, `contracts/openapi.json` operation and DTO schemas, `contracts/permission-catalog.json`, and current bot module/mock source.
