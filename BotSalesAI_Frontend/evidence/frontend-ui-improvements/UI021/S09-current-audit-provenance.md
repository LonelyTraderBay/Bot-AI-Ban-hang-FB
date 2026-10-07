# UI021/S09 — strict auditor provenance

- Date: 2026-10-03.
- Tool: installed **frontend-design-premium v1.4.0**, script `scripts/audit_project.py`.
- Scope: project root `.`, config `premium-ui.json`, strict mode; configured React source root is `apps/web/src`.
- Command: `python C:/Users/Joker-PC/.codex/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py . --mode strict --config premium-ui.json --output evidence/frontend-ui-improvements/UI021/S09-current-frontend-design-audit.json`.
- Exit code: **1**, as reported by the process and appended to the run log. This is the strict finding result, not a clean audit.
- Result: 13 errors / 13 violations / 0 warnings / 0 unresolved; all `affordance.actionless-button`.
- SHA-256: runner `67FD35597C85A2F37DD3C566F0BD79768CBE059114EDCF28074FC5AFA3E0CE68`; config `99723F9FD2485AC6634496AB259A8C1C0DEEB4E4B1B6B3079C1E82B799F7BCBB`; report `F7902E3B69AD4B226BB4980F7F2015B53A61A6B93D304F4D02055C121D8A56C3`; log `5F3A3E6B1125F29D0036E73CB6D4A00E8036324D993863B778B4E949445758EC`; crosswalk `9F0BC9983696B66F825AA0540BF43AE6D3D0EA40B5BDCEF00716178B08B3118D`.
- Root user-owned `premium-audit.json`: before/after the run SHA-256 `12E315CB06ABF4C2390EAC41C1C8E2C58472530ADFEC542F374CE621FB655A01` (unchanged).
- Runner upstream resolution was MATCH at digest `1608ea77fbb6fc30d13a97d12cfa8ebf31358d40f0dd97beed24829d6b3f45dd` in the earlier S04 status check; this rerun used that installed v1.4.0 copy. Current project source root contains 64 `.ts`/`.tsx` files.
- Worktree: `main`, HEAD `e68cb65e61c5c1aab2ae169dd8033df305df8872`, dirty; current scan outputs and hashes are scoped in `S09-current-scan-fingerprint.json`.

The associated `npm.cmd run generate:check` gate was rerun with an isolated process PATH and passed 11 outputs / 283 schemas / 210 operations / 54 routes; the default inherited shell invocation failed to resolve `node`. See `S09-generate-check-20261003.log` (initial failure), `S09-generate-check-direct-20261003.log` and `S09-generate-check-npm-isolated.log` (successful checks). Static scan scope does not certify runtime, hosted CI, backend authorization, staging, production or owner UAT.
