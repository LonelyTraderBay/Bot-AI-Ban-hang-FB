# UI022 — Workflow static validation

Date: 2026-10-03
Base revision: `e68cb65e61c5c1aab2ae169dd8033df305df8872`

## Results

The repository-root workflow parsed with Python PyYAML `BaseLoader`. The saved [validation script](S03-validate-workflow.py) passed assertions for the two event filters, frontend working directory, required commands, full-SHA action pins, and SHA-scoped artifact name/path; output is in [S03 log](S03-static-validation.log). `npm.cmd run generate:check` passed (11 outputs/283 schemas/210 operations/54 routes) and `npm.cmd audit --audit-level=low` passed with 0 vulnerabilities; their outputs are in [generator log](S03-generate-check.log) and [audit log](S03-npm-audit.log). `git diff --check` exited 0; Git emitted existing LF-to-CRLF advisory messages for dirty frontend files. `actionlint` is unavailable, so no actionlint result is claimed.

The current frontend source has a separate local `npm run verify` PASS in [UI021/S04](../UI021/S04-frontend-verify.log): generator 11/283/210/54; source 64 files/220 API refs/54 routes; boundaries 427 imports and negative fixtures 8/8; lint and typecheck; domain/MSW 88/88; Vitest 85/85; production build. The latest full rebuilt-demo browser run remains [UI017/S05](../UI017/S05-full-e2e-current.log), 187/187. These are local runs, not GitHub Actions runs.

## Paired result and limits

- **UI:** PASS for static trigger/working-directory configuration. An actual GitHub dispatch is not part of this result.
- **ARCH:** PASS for command and artifact ownership structure. YAML parsing does not validate GitHub's hosted runner behavior, npm installation, dependency audit result or uploaded artifacts.
- **Not run:** `npm ci` from a clean GitHub runner, `npm audit` in the proposed workflow, GitHub Actions, and the workflow's artifact upload step.
- **Evidence boundary:** no local output is described as CI. A remote run on the commit containing the root workflow is still required for C04.
