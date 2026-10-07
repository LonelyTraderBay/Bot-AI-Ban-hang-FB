# FE028 — Architecture review — 04/10/2026

**Scope:** `FRONTEND_WITH_SYNTHETIC_MOCK_API`. Reviewer: Codex self-review; no independent peer review. Source boundary: React/TypeScript app at `apps/web`; synthetic API in demo/test; no backend runtime in this checkout.

Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`.

## Evidence-backed findings

- The application composition remains one React app with one MUI theme/provider, one Router and one query cache; the plan and current package/source do not introduce a second frontend framework or microfrontend. There are 16 business modules and 54 canonical routes.
- Module ownership is guarded by the current boundary checker: 430 import edges, zero unresolved/cycle/boundary issues, and 10/10 positive/negative boundary fixtures. Generated freshness and strict TypeScript/lint pass.
- Canonical API schemas, route/permission catalogs and design tokens remain the integration source. Current generator check reports 283 schemas, 210 operations and 54 routes. Generated package files are not hand-edited.
- UI code calls the shared transport; MSW is restricted to the selected demo/test mode. The production artifact excludes the MSW worker and mock fixtures; the demo artifact includes the worker and synthetic data. Live mode does not silently fall back to mock on API failure.
- Route/feature/state/role coverage ties UI behavior to the current React implementation: 54 route smoke, 65 feature-route interaction rows, 22 journeys and 357 private-route role assertions. This is UI permission behavior and contract traceability, not server security proof.
- Source and runtime quality gates pass: domain/MSW 88/88, Vitest 85/85 and Chromium/Firefox 388/388. The FE027 UAT matrix is linked to current source/contract/log hashes.

## Residual architecture and quality limits

- No numeric architecture-only score is defined by the project rubric; a standalone percentage would be invented. The measured gate rubric is 7/9.
- Production bundle keeps Vite's >500 kB raw-chunk advisory (largest current chunk 738.39 kB raw / 186.88 kB gzip). Local preview transfer budgets pass; this evidence does not establish mobile/CDN or product SLOs.
- npm audit is clean, while npm install still prints allowScripts notices for esbuild/MSW. The install/build/test path works; those scripts were not silently approved.
- FE-G05 remains incomplete for Narrator speech/transcript and broad human conformance. FE-G09 awaits the user's final acceptance. Hosted CI, backend/provider, persistence, staging and production are not established here.

**Conclusion:** architecture and runtime checks meet the documented Frontend-with-mock criteria for this source/artifact. Handoff is `READY_FOR_ACCEPTANCE`; do not certify the whole system as Production-Ready/Enterprise-Grade.
