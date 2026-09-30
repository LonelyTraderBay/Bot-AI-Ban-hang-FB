# BotSales AI project kit

This file governs this kit folder only; do not assume it is automatically loaded for the whole target repo. Respect target root instructions and Universal AI_RULES.md unchanged. Read START_HERE.md, AI_RULES_PROJECT.md and IMPLEMENTATION_PLAN.md before code. Runtime policy is docs/27_RUNTIME_POLICY.md, separate from coding rules.

Canonical: contracts/*.json (except generated operation-index), execution/plan.json and execution/progress.json. Never modify generated reports/DTO/YAML to override source. prototype/ is a UI review artifact, not production architecture. All application progress starts unverified. Do not touch reference historical ZIP unless comparing migration sources. Use a single writer for shared contracts/router/tokens/lockfiles/CI and progress ledger.

Approved visual policy: `design/decision.json` (ADR-VIS-021, Graphite Gold dark-only). Exact colors come only from `design/tokens.json`; never reopen palette choice or introduce a second app theme. Paths are kit-relative. See `release.json` and `UPGRADE.md` before adopting a newer kit into an active repository.
