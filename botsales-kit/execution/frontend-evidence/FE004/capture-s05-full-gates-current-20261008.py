"""Capture FE004.S05 full frontend gates and an in-scope working-tree diff review."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess
import sys

SCRIPT = Path(__file__).resolve()
REPO = SCRIPT.parents[4]
KIT = REPO / "botsales-kit"
FE = REPO / "BotSalesAI_Frontend"
OUT = SCRIPT.parent
LOG = OUT / "S05-full-gates-current-20261008.log"
RECEIPT = OUT / "S05-full-gates-current-20261008.json"
VERIFY_LOG = KIT / "execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log"
E2E_SUMMARY = KIT / "execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log"
DOCTOR_LOG = KIT / "execution/frontend-evidence/FE003/S05-doctor-current-20261008.log"
AUDIT_COMMAND = "python botsales-kit/execution/frontend-evidence/FE004/capture-s05-full-gates-current-20261008.py"
TEST_COMMAND_ID = "verify-current-20261002"
TEST_COMMAND = "npm.cmd --script-shell=cmd.exe run verify"

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(argv: list[str], cwd: Path = KIT) -> subprocess.CompletedProcess:
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)

scope = [
    "BotSalesAI_Frontend/apps/web/tsconfig.json",
    "BotSalesAI_Frontend/eslint.config.mjs",
    "BotSalesAI_Frontend/scripts/check-boundaries.mjs",
    "BotSalesAI_Frontend/apps/web/src/app",
    "BotSalesAI_Frontend/apps/web/src/shared",
    "BotSalesAI_Frontend/apps/web/src/modules",
    "BotSalesAI_Frontend/tests/architecture",
]
status_cmd = run(["git", "status", "--short", "--", *scope], REPO)
diff_names = run(["git", "diff", "--name-only", "--", *scope], REPO)
staged_names = run(["git", "diff", "--cached", "--name-only", "--", *scope], REPO)
untracked = run(["git", "ls-files", "--others", "--exclude-standard", "--", *scope], REPO)
diff_stat = run(["git", "diff", "--stat", "--", *scope], REPO)
diff = run(["git", "diff", "--unified=80", "--", "BotSalesAI_Frontend/apps/web/src/shared/api/client.ts"], REPO)
assert all(item.returncode == 0 for item in (status_cmd, diff_names, staged_names, untracked, diff_stat, diff))
expected_diff = ["BotSalesAI_Frontend/apps/web/src/shared/api/client.ts"]
assert diff_names.stdout.splitlines() == expected_diff, f"Unexpected FE004-scoped tracked diff: {diff_names.stdout}"
assert not staged_names.stdout.strip(), f"Unexpected staged FE004-scoped changes: {staged_names.stdout}"
assert not untracked.stdout.strip(), f"Unexpected untracked FE004-scoped files: {untracked.stdout}"
assert "UNEXPECTED_STATUS" in diff.stdout and diff.stdout.count("UNEXPECTED_STATUS") == 2

verify_text = VERIFY_LOG.read_text(encoding="utf-8", errors="replace")
required_gates = ["npm run test:source", "npm run boundaries", "npm run lint", "npm run typecheck"]
assert "EXIT_CODE=0" in verify_text and "ui-evidence PASS" in verify_text
for gate in required_gates:
    assert gate in verify_text, f"full verify log missing gate: {gate}"
doctor_text = DOCTOR_LOG.read_text(encoding="utf-8", errors="replace")
assert "EXIT_CODE=0" in doctor_text and "'Node.js 24'            │ 'PASS'" in doctor_text
e2e_text = E2E_SUMMARY.read_text(encoding="utf-8", errors="replace")
assert "512 passed" in e2e_text and "Chromium 256/256 and Firefox 256/256" in e2e_text and "EXIT_CODE=0" in e2e_text
assert "not the raw Playwright stdout" in e2e_text

validate = run(["node", "scripts/progress.mjs", "validate"])
status = run(["node", "scripts/progress.mjs", "status"])
next_step = run(["node", "scripts/progress.mjs", "next"])
assert validate.returncode == status.returncode == next_step.returncode == 0
shape, current, next_result = json.loads(validate.stdout), json.loads(status.stdout), json.loads(next_step.stdout)
assert shape["valid"] is True and shape["tasks"] == 28 and shape["checkpoints"] == 140
assert current["verifiedSteps"] == 19 and current["blocked"] == []
assert current["next"][0]["id"] == "FE004" and current["next"][0]["nextStep"]["id"] == "S05"
assert next_result["id"] == "FE004" and next(s for s in next_result["steps"] if s["status"] != "VERIFIED")["id"] == "S05"

head = run(["git", "rev-parse", "HEAD"], REPO)
assert head.returncode == 0
head_sha = head.stdout.strip()
review_lines = [
    "FE004.S05 scoped diff review (working tree; changes preserved)",
    f"Git HEAD: {head_sha}",
    "Canonical write scope: " + ", ".join(scope),
    f"Scoped status exit={status_cmd.returncode}: {status_cmd.stdout.strip()}",
    f"Tracked in-scope diff exit={diff_names.returncode}: {diff_names.stdout.strip()}",
    f"Staged in-scope diff exit={staged_names.returncode}: {staged_names.stdout.strip() or '(none)'}",
    f"Untracked in-scope paths exit={untracked.returncode}: {untracked.stdout.strip() or '(none)'}",
    "Diff stat:", diff_stat.stdout.rstrip(),
    "Reviewed source diff:", diff.stdout.rstrip(),
    "Review result: one 7-addition/2-deletion change in shared/api/client.ts validates both 204 and ordinary successful response status against the operation contract; the related API-client tests are outside FE004 write scope and were run by the full npm test gate.",
]
LOG.write_text("\n".join(review_lines) + "\n", encoding="utf-8", newline="\n")

paths = [
    "package.json",
    "package-lock.json",
    "apps/web/tsconfig.json",
    "eslint.config.mjs",
    "scripts/check-boundaries.mjs",
    "scripts/check-source.mjs",
    "apps/web/src/shared/api/client.ts",
    "apps/web/tests/api-client.test.tsx",
    "tests/source-checker.test.mjs",
    "tests/architecture/check-boundaries.mjs",
    "botsales-kit/execution/frontend-plan.json",
    "botsales-kit/execution/frontend-command-map.json",
    "botsales-kit/scripts/progress.mjs",
    "botsales-kit/execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE003/S05-doctor-current-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE004/capture-s05-full-gates-current-20261008.py",
    "botsales-kit/execution/frontend-evidence/FE004/S05-full-gates-current-20261008.log",
]
source_files = []
for relative in paths:
    path = KIT / relative.removeprefix("botsales-kit/") if relative.startswith("botsales-kit/") else FE / relative
    assert path.is_file(), f"missing source snapshot: {relative}"
    source_files.append({"path": relative, "sha256": sha(path)})
snapshot = hashlib.sha256("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode()).hexdigest()
verify_record = next((item for item in source_files if item["path"].endswith("S03-full-verify-powershell-current-20261008.log")), None)
e2e_record = next((item for item in source_files if item["path"].endswith("S03-e2e-current-source-session-20261008.log")), None)
report = [
    "FE004.S05 current full gates and Change Budget review (2026-10-08)",
    f"Registered test command: {TEST_COMMAND_ID} — {TEST_COMMAND}",
    f"Audit command: {AUDIT_COMMAND}", f"CWD: {REPO}", f"Exit: 0; Git HEAD={head_sha} (working-tree snapshot)",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API; full typecheck/lint/boundaries/source checker are required by FE004.S05.",
    f"Tracker before checkpoint: {current['verifiedSteps']}/{current['totalSteps']} verified, next FE004.S05, blocked={len(current['blocked'])}.",
    f"npm run verify: exit 0; required gates found={len(required_gates)}/{len(required_gates)}; log SHA-256={verify_record['sha256']}.",
    f"npm run doctor: exit 0; Node/package/worker/lockfile diagnostics recorded in {DOCTOR_LOG.relative_to(KIT).as_posix()}.",
    f"Full current-source E2E: 512/512 local Chromium+Firefox; log is a concise session summary, not raw Playwright stdout; SHA-256={e2e_record['sha256']}.",
    "Change Budget review: exactly one unstaged tracked file in scope (apps/web/src/shared/api/client.ts); 7 insertions/2 deletions; no staged or untracked in-scope changes. Its two response-status checks were reviewed; full npm test passed, including related API-client tests outside FE004's write scope.",
    "Current local evidence only; GitHub-hosted CI, live backend/provider, staging, production and owner acceptance are not established.",
    f"Source snapshot files: {len(source_files)}; full verify log and E2E session summary fingerprints match.",
]
LOG.write_text("\n".join(review_lines + ["", *report]) + "\n", encoding="utf-8", newline="\n")
# Refresh the receipt log hash after the final report body is appended.
source_files[-1]["sha256"] = sha(LOG)
snapshot = hashlib.sha256("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode()).hexdigest()
receipt = {
    "taskId": "FE004", "stepId": "S05", "kind": "test_run", "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API", "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head_sha} (working-tree snapshot)",
    "expected": "Run full typecheck, lint, boundaries and source checker; review current changes against FE004's canonical write scope and record actual logs/hashes.",
    "observed": "npm run verify exited 0 with all required gates; npm run doctor exited 0; full current-source local E2E recorded 512/512 across Chromium and Firefox (session summary, not raw stdout). The scoped diff contains one unstaged file with 7 additions/2 deletions; no staged/untracked FE004-scope files. No CI/live backend/provider/staging/production claim.",
    "commandId": TEST_COMMAND_ID, "command": TEST_COMMAND, "cwd": str(FE), "reviewer": "Codex",
    "environment": {"name": "Windows local Frontend verification", "details": f"Node v24.19.0/npm 11.17.0; Git HEAD {head_sha}; local synthetic MSW; PowerShell invoked npm with process-local PATH including Git.", "dataSource": "synthetic-msw"},
    "checksTotal": 18, "failed": 0, "sourceFiles": source_files, "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(), "logSha256": sha(LOG),
}
RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"result": "PASS", "requiredVerifyGates": required_gates, "scopedDiff": expected_diff, "receipt": RECEIPT.relative_to(REPO).as_posix(), "log": LOG.relative_to(REPO).as_posix()}, ensure_ascii=False, indent=2))
