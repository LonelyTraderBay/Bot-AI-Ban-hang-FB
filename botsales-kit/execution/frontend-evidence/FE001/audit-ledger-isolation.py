"""Capture FE-only tracker commands and prove the full-product ledger stays read-only."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
KIT = REPOSITORY / "botsales-kit"
LOG = SCRIPT.with_name("S05-frontend-ledger-isolation-current-20261007.log")
RECEIPT = SCRIPT.with_name("S05-frontend-ledger-isolation-current-20261007.json")
FULL_PLAN = KIT / "execution/plan.json"
FULL_PROGRESS = KIT / "execution/progress.json"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run(label: str, args: list[str]) -> tuple[str, dict]:
    result = subprocess.run(["node", str(KIT / "scripts/progress.mjs"), *args], cwd=KIT,
                            capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
    output = result.stdout.rstrip()
    if result.stderr:
        output += ("\n" if output else "") + "[stderr]\n" + result.stderr.rstrip()
    if result.returncode != 0:
        raise RuntimeError(f"{label} failed ({result.returncode}):\n{output}")
    return output, json.loads(result.stdout)


full_hashes_before = {
    "execution/plan.json": digest(FULL_PLAN.read_bytes()),
    "execution/progress.json": digest(FULL_PROGRESS.read_bytes()),
}
validate_output, validate = run("frontend validate", ["validate"])
status_output, status = run("frontend status", ["status"])
next_output, next_task = run("frontend next", ["next"])
full_validate_output, full_validate = run("full-product validate", ["--full-product", "validate"])
full_status_output, full_status = run("full-product status", ["--full-product", "status"])
full_next_output, full_next = run("full-product next", ["--full-product", "next"])
full_hashes_after = {
    "execution/plan.json": digest(FULL_PLAN.read_bytes()),
    "execution/progress.json": digest(FULL_PROGRESS.read_bytes()),
}

fe_plan = json.loads((KIT / "execution/frontend-plan.json").read_text(encoding="utf-8"))
full_plan = json.loads(FULL_PLAN.read_text(encoding="utf-8"))
assert validate.get("valid") is True and validate.get("tasks") == 28 and validate.get("checkpoints") == 140
assert status.get("totalSteps") == 140 and status.get("verifiedSteps") == 4
first_unverified = next((step for step in next_task.get("steps", []) if step.get("status") != "VERIFIED"), None)
assert next_task.get("id") == "FE001" and first_unverified and first_unverified.get("id") == "S05"
assert full_validate.get("valid") is True
assert len(full_plan["tasks"]) == 84 and full_status.get("totalSteps") == 420
assert full_hashes_before == full_hashes_after, "Full-product plan/progress changed during FE-only status reads"
assert full_validate.get("checkpoints") == 420 and full_validate.get("tasks") == 84

checks = 13
lines = [
    "FE001.S05 Frontend/full-product ledger isolation",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "Commands were read-only validate/status/next; no report generation or full-product write command was run.",
    f"Frontend validate: exit=0 {json.dumps(validate, ensure_ascii=False)}",
    f"Frontend status: exit=0 {json.dumps(status, ensure_ascii=False)}",
    f"Frontend next: exit=0 task={next_task.get('id')} nextStep={first_unverified.get('id')}",
    f"Full-product validate: exit=0 {json.dumps(full_validate, ensure_ascii=False)}",
    f"Full-product status summary: exit=0 overall={full_status.get('overallPercent')}% verified={full_status.get('verifiedSteps')}/{full_status.get('totalSteps')} blocked={len(full_status.get('blocked', []))} stale={len(full_status.get('stale', []))}",
    f"Full-product next (read-only): {json.dumps(full_next, ensure_ascii=False)}",
    "Full-product source hashes before:",
    *[f"  {name} {value}" for name, value in full_hashes_before.items()],
    "Full-product source hashes after:",
    *[f"  {name} {value}" for name, value in full_hashes_after.items()],
    "Observed: FE001.S01–S04 are effective from current receipts; S05 remains next. The Frontend denominator remains 28 tasks/140 checkpoints. The separately-scoped full-product reference remains 84 tasks/420 checkpoints and both original files retained identical SHA-256 values.",
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
source_paths = [
    "botsales-kit/scripts/progress.mjs",
    "botsales-kit/scripts/test_progress.py",
    "botsales-kit/evidence/tracker-tests.json",
    "botsales-kit/execution/frontend-plan.json",
    "botsales-kit/execution/frontend-command-map.json",
    "botsales-kit/execution/plan.json",
    "botsales-kit/execution/progress.json",
    "botsales-kit/execution/frontend-evidence/FE001/audit-ledger-isolation.py",
]
for receipt_name in (
    "S01-intake-baseline-current-20261007.json",
    "S02-route-map-audit-current-20261007.json",
    "S03-current-report-package-reconciliation-20261007.json",
    "S04-first-target-change-budget-current-20261007.json",
):
    receipt = KIT / "execution/frontend-evidence/FE001" / receipt_name
    assert receipt.is_file(), f"Missing current FE001 receipt: {receipt_name}"
    source_paths.append(receipt.relative_to(REPOSITORY).as_posix())
source_files = [{"path": relative, "sha256": digest((REPOSITORY / relative).read_bytes())}
                for relative in sorted(source_paths)]
snapshot = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
evidence = {
    "taskId": "FE001",
    "stepId": "S05",
    "kind": "artifact_review",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Validate/status/next the canonical FE ledger, confirm the next task, and demonstrate that full-product references remain read-only with an unchanged denominator.",
    "observed": f"FE ledger validates 28 tasks/140 checkpoints, 4 checkpoint receipts are currently effective, and FE001.S05 is current next. Full-product ledger validates 84 tasks/420 checkpoints; original plan/progress SHA-256 values are identical before/after read-only status commands.",
    "command": "python execution/frontend-evidence/FE001/audit-ledger-isolation.py",
    "reviewer": "Codex",
    "environment": {"name": "Local tracker CLI review", "details": "Node.js CLI on Windows checkout; frontend and full-product commands limited to validate/status/next.", "dataSource": "source-only"},
    "checksTotal": checks,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: FE={status['verifiedSteps']}/{status['totalSteps']} effective; FE next={next_task['id']}.{first_unverified['id']}")
print(f"Full-product={full_status['verifiedSteps']}/{full_status['totalSteps']} effective; original plan/progress hashes unchanged")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
