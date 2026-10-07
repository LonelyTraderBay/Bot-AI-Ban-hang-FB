# FE028 — Architecture review — 05/10/2026

**Scope:** `FRONTEND_WITH_SYNTHETIC_MOCK_API`. Reviewer: Codex self-review; no independent peer review. Implementation boundary: React/TypeScript under `apps/web`; MSW is limited to demo/test. Backend, provider and staging behavior are outside this checkout.

## Evidence-backed findings

- The app remains one React application with one MUI theme/provider, one Router and one query cache. It has 16 business modules and 54 canonical routes; UI027 changes Vite chunk grouping only.
- The current boundary check reports 430 import edges, zero unresolved/cycle/boundary issues and 10/10 fixtures. UI027's full verify also passes generated freshness (11 outputs, 283 schemas, 210 operations, 54 routes), source checks, strict typecheck and lint.
- Canonical OpenAPI, route/permission catalogs and design tokens remain the sources for UI/API structure. No generated contract output was edited by hand. The production artifact uses live HTTP transport and excludes MSW startup/seed data; the demo uses synthetic MSW.
- The current built-demo browser suite passes 388/388 across Chromium and Firefox. The FE027 matrix links its 54-route, 64-feature, 65-interaction, 22-journey and role/state evidence to the same local synthetic-API scope.
- UI027 reduced the largest production chunk from 738.39 to 328.33 kB raw by grouping measured vendor/contract ownership. The React runtime and router dependencies stay together to avoid a chunk cycle; route/API semantics and app source remain unchanged.

## Residual limits

- The project defines no separate weighted architecture-only score. The evidence rubric remains 7/9; it is not a code-completion percentage.
- UI027's paired browser profile is synthetic and local. It does not establish performance on physical devices, a CDN, hosted infrastructure or backend SLOs.
- Dependency audit evidence dated 04/10 reports zero vulnerabilities. Npm still prints `allowScripts` notices for esbuild/MSW; no script was silently approved.
- FE-G05 still lacks Narrator speech/transcript and broad human conformance evidence. Hosted CI is `NOT_RUN`; FE-G08 accepts the clean local equivalent. FE-G09 remains the user's final acceptance.

**Conclusion:** current architecture and runtime checks support a Frontend-with-mock handoff at `READY_FOR_ACCEPTANCE`. They do not certify Backend, whole-system production readiness, or user acceptance.
