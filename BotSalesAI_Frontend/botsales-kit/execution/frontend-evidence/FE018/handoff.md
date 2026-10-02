# FE018 — Bot configuration, sandbox and evaluations

Scope: React bot/team/playground/evaluation frontend with deterministic synthetic MSW data. The UI does not call an LLM/provider or send customer messages or orders.

## Current verification — 02/10/2026

- Full Chromium passed 142/142. FE018 cases cover versioned draft writes and 412 retention; revision-bound synthetic evaluation and publish; pause boundary; playground isolation with unknown cost/token values; budget and tool denial; per-role kill switch; expired, wrong-scope and matching approval; permission denials; unresolved command recovery.
- Domain/MSW passed 88/88, Vitest 71/71 and mock schemas 356/356. `generate:check` passed 11 outputs / 283 schemas / 210 operations / 54 routes; source mapping passed 60 files / 226 operation references / 54 routes; boundaries passed 406 imports and 8/8 negative fixtures. Typecheck and lint passed.
- Production and demo builds exited 0. The >500 kB raw chunk-size warning remains; largest production chunk is 730.53 kB raw / 184.34 KiB gzip.

## Contract gaps and limits

- R51 omits `updateBudgetPolicy` from its route-action list. The UI uses the canonical OpenAPI operation and `operations.manage` permission, records the mapping gap and does not change the route manifest.
- `requireHumanOrderConfirmation` remains locked true. The frontend does not create a bypass for human confirmation or invent `BotConfig.allowedActions`.
- Evaluations, token/cost data, budget faults and provider status are synthetic. No real LLM quality, backend authorization, CI, staging, production deployment or owner acceptance is claimed.

The route/operation owner map is `S01-route-operation-map.md`; task checkpoint evidence is stored in `S01-priority-refresh-20261001.json` through `S05-priority-refresh-20261001.json` and refreshed by the frontend progress ledger.
