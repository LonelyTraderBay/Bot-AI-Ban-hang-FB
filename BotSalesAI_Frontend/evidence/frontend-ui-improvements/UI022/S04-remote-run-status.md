# UI022 — GitHub runner status

Checked: 2026-10-03
Repository: `LonelyTraderBay/Bot-AI-Ban-hang-FB`
Local base revision: `e68cb65e61c5c1aab2ae169dd8033df305df8872`

The unauthenticated GitHub REST API reported zero registered repository workflows and zero workflow runs at the time of the check; the repository-root `.github/workflows` contents endpoint returned 404. The tracked frontend workflow was nested under `BotSalesAI_Frontend/.github/workflows`, which explains why the remote did not list it. `gh auth status` reported no authenticated GitHub host.

The workflow is now configured at the correct repository-root path in the local working tree. That edit has not been committed or pushed, and no run URL, runner image, install result, exit code or artifact URL exists for it yet. The project plan and existing delivery preferences prohibit treating local logs as CI and do not authorize an automatic push. Therefore UI022.C04 remains **PARTIAL / awaiting remote run**, not PASS.

To finish C04, the root workflow must be included in an authorized commit/PR or push; then record the actual run URL, exact revision, runner, install/audit/verify/E2E exits and uploaded artifact identity. Do not change the run to green by skipping a required gate.
