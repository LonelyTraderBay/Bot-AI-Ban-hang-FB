# FE018 — Canonical route, operation and capability map

| Route | Canonical reads | Mutations and permission | Frontend owner |
| --- | --- | --- | --- |
| R26 `/s/:shopId/bot` | `getBotConfig`, `listAIConnections`, `listBotRevisions`, `getBotRevision` | `updateBotDraft` (`bot.configure`), `publishBotConfig`, `pauseBot`, `restoreBotRevision` (`bot.publish`) | `apps/web/src/modules/bot/index.tsx` |
| R27 `/s/:shopId/bot/playground` | `getBotConfig`, `listAIConnections`, `listKnowledge` | `runPlayground` (`bot.test`) | same module |
| R28 `/s/:shopId/bot/evaluations` | `listEvaluations`, `getEvaluation`, `getBotConfig` | `createEvaluation` (`bot.test`) | same module |
| R51 `/s/:shopId/bot/team` | `listAgentRoles`, `listBudgetPolicies` | `updateAgentRole` (`agents.manage`), `controlAutomation` (`operations.manage`) | same module |

## Explicit route gap

OpenAPI also defines `updateBudgetPolicy` with `operations.manage`; the UI uses this canonical operation for versioned, approval-bound limit edits. Route R51 currently omits that operation from its `actions` map, so the route/source test verifies the OpenAPI permission while this map records the manifest gap. No route-manifest or OpenAPI edits are made.

The module reads provider capabilities and role tool IDs from canonical schemas. `AgentRoleWrite` cannot grant `allowedToolIds`. `BotConfigWritePatch.requireHumanOrderConfirmation` is contract-locked true, and `BotConfig.allowedActions` is absent. The frontend preserves these constraints. Playground and evaluation outputs are labeled synthetic, return unknown cost/token values when unmeasured, and never send an external message.

Primary sources: `contracts/route-manifest.json` R26/R27/R28/R51, `contracts/openapi.json` operation and DTO schemas, `contracts/permission-catalog.json`, and current bot module/mock source.
