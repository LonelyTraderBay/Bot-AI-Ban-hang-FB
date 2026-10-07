# UI021/S10 — provenance strict audit

- Date: 2026-10-03.
- Tool: installed `frontend-design-premium` v1.4.0, `C:\Users\Joker-PC\.codex\plugins\cache\openai-curated-remote\frontend-design-premium\1.4.0\skills\frontend-design-premium\scripts\audit_project.py`.
- Scope: project root `.`, config `premium-ui.json`, strict mode; React source root `apps/web/src`.
- Command: `python C:\Users\Joker-PC\.codex\plugins\cache\openai-curated-remote\frontend-design-premium\1.4.0\skills\frontend-design-premium\scripts\audit_project.py . --mode strict --config premium-ui.json --output evidence/frontend-ui-improvements/UI021/S10-current-frontend-design-audit.json`.
- Process exit: **1**. Result: 13 errors/violations, 0 warnings, 0 unresolved; every finding is `affordance.actionless-button`. This is not a clean strict audit.
- Runner SHA-256: `67FD35597C85A2F37DD3C566F0BD79768CBE059114EDCF28074FC5AFA3E0CE68`.
- Config SHA-256: `99723F9FD2485AC6634496AB259A8C1C0DEEB4E4B1B6B3079C1E82B799F7BCBB`.
- S10 report SHA-256: `F7902E3B69AD4B226BB4980F7F2015B53A61A6B93D304F4D02055C121D8A56C3`.
- S10 log SHA-256: `9E57E05C855D359FAF763AE9176A5C4DD6D8B4E46E9129284417C5F9A4C805B6`.
- Crosswalk SHA-256: `6B2AD678BA6A981B9FB3F4889A38B97FC1042A54ACDBDE39761A5B78115C104E`.
- Root user-owned `premium-audit.json` SHA-256 before and after: `12E315CB06ABF4C2390EAC41C1C8E2C58472530ADFEC542F374CE621FB655A01`.
- S10 report is byte-identical to S09 because the scanner emitted the same findings. Reports label styling was the only app-source change since S09; none of the S09 crosswalked files changed.
- Current application verification is [UI012/S30](../UI012/S30-marketing-chart-label-legibility-20261003.md): `verify` PASS and full rebuilt-demo E2E 194/194. Local evidence does not establish hosted CI, backend authorization, staging, production runtime or owner UAT.
