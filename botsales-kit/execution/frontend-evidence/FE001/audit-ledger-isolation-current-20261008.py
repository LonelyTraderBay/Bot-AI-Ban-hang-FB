"""Verify the Frontend ledger while proving full-product tracker files remain read-only."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
KIT = REPOSITORY / "botsales-kit"
LOG = SCRIPT.with_name("S05-frontend-ledger-isolation-current-20261008.log")
RECEIPT = SCRIPT.with_name("S05-frontend-ledger-isolation-current-20261008.json")
FULL_PLAN = KIT / "execution/plan.json"
FULL_PROGRESS = KIT / "execution/progress.json"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run(args: list[str]) -> tuple[str, dict]:
    result = subprocess.run(["node", str(KIT / "scripts/progress.mjs"), *args], cwd=KIT,
                            capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
    output = result.stdout.rstrip()
    if result.stderr:
        output += ("\n" if output else "") + "[stderr]\n" + result.stderr.rstrip()
    if result.returncode != 0:
        raise RuntimeError(f"progress command failed ({result.returncode}) for {args}:\n{output}")
    return output, json.loads(result.stdout)


full_hashes_before = {
    "execution/plan.json": digest(FULL_PLAN.read_bytes()),
    "execution/progress.json": digest(FULL_PROGRESS.read_bytes()),
}
frontend_validate_text, frontend_validate = run(["validate"])
frontend_status_text, frontend_status = run(["status"])
frontend_next_text, frontend_next = run(["next"])
full_validate_text, full_validate = run(["--full-product", "validate"])
full_status_text, full_status = run(["--full-product", "status"])
full_next_text, full_next = run(["--full-product", "next"])
full_hashes_after = {
    "execution/plan.json": digest(FULL_PLAN.read_bytes()),
    "execution/progress.json": digest(FULL_PROGRESS.read_bytes()),
}

assert frontend_validate.get("valid") is True
assert frontend_validate.get("tasks") == 28 and frontend_validate.get("checkpoints") == 140
assert frontend_status.get("totalSteps") == 140 and frontend_status.get("verifiedSteps") == 4
next_task = frontend_next.get("id")
next_step = next((step for step in frontend_next.get("steps", []) if step.get("status") != "VERIFIED"), None)
assert next_task == "FE001" and next_step and next_step.get("id") == "S05"
assert full_validate.get("valid") is True and full_validate.get("tasks") == 84 and full_validate.get("checkpoints") == 420
assert full_status.get("totalSteps") == 420
assert full_next.get("id") is not None
assert full_hashes_before == full_hashes_after, "Full-product plan/progress changed during read-only inspection"

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
fe_plan = json.loads((KIT / "execution/frontend-plan.json").read_text(encoding="utf-8"))
full_plan = json.loads(FULL_PLAN.read_text(encoding="utf-8"))
assert len(fe_plan["tasks"]) == 28 and len(full_plan["tasks"]) == 84

receipt_names = [
    "S01-current-20261008.json",
    "S02-route-map-audit-current-20261008.json",
    "S03-current-reconciliation-20261008.json",
    "S04-first-target-change-budget-current-20261008.json",
]
receipt_paths = [KIT / "execution/frontend-evidence/FE001" / name for name in receipt_names]
for file in receipt_paths:
    assert file.is_file(), f"Missing fresh FE001 evidence: {file.name}"
    entry = json.loads(file.read_text(encoding="utf-8"))
    assert entry.get("result") == "PASS", f"Evidence is not PASS: {file.name}"

lines = [
    "FE001.S05 Frontend/full-product ledger isolation (current 2026-10-08)",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "Commands: frontend validate/status/next and --full-product validate/status/next; all are read-only.",
    f"Frontend validate exit=0: {json.dumps(frontend_validate, ensure_ascii=False)}",
    f"Frontend status exit=0: overall={frontend_status.get('overallPercent')}% verified={frontend_status.get('verifiedSteps')}/{frontend_status.get('totalSteps')} next={frontend_status.get('next')}",
    f"Frontend next exit=0: task={next_task}; nextStep={next_step.get('id')}",
    f"Full-product validate exit=0: {json.dumps(full_validate, ensure_ascii=False)}",
    f"Full-product status exit=0: overall={full_status.get('overallPercent')}% verified={full_status.get('verifiedSteps')}/{full_status.get('totalSteps')} blocked={len(full_status.get('blocked', []))} stale={len(full_status.get('stale', []))}",
    f"Full-product next (read-only) exit=0: {json.dumps(full_next, ensure_ascii=False)}",
    "Full-product plan/progress SHA-256 before:",
    *[f"  {name} {value}" for name, value in full_hashes_before.items()],
    "Full-product plan/progress SHA-256 after:",
    *[f"  {name} {value}" for name, value in full_hashes_after.items()],
    "Fresh FE001.S01-S04 receipts: " + ", ".join(receipt_names),
    "Conclusion: Frontend tracker denominator remains 28 tasks/140 checkpoints; full-product reference remains 84 tasks/420 checkpoints and both protected files are byte-identical before/after.",
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

source_paths = [
    "botsales-kit/scripts/progress.mjs",
    "botsales-kit/scripts/test_progress.py",
    "botsales-kit/evidence/tracker-tests.json",
    "botsales-kit/execution/frontend-plan.json",
    "botsales-kit/execution/frontend-command-map.json",
    "botsales-kit/execution/plan.json",
    "botsales-kit/execution/progress.json",
    "botsales-kit/execution/frontend-evidence/FE001/audit-ledger-isolation-current-20261008.py",
    *[file.relative_to(REPOSITORY).as_posix() for file in receipt_paths],
]
source_files = [{"path": relative, "sha256": digest((REPOSITORY / relative).read_bytes())}
                for relative in sorted(set(source_paths))]
snapshot = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
evidence = {
    "taskId": "FE001", "stepId": "S05", "kind": "artifact_review", "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Validate/status/next the canonical FE ledger, confirm the next checkpoint, and prove full-product tracker references stayed read-only with their original denominator.",
    "observed": "Frontend tracker validates 28 tasks/140 checkpoints and has FE001.S05 as next with four FE001 checkpoints currently effective. Full-product tracker validates 84 tasks/420 checkpoints; plan.json and progress.json SHA-256 values are identical before and after read-only commands. This is tracker bookkeeping, not product or backend acceptance.",
    "command": "python botsales-kit/execution/frontend-evidence/FE001/audit-ledger-isolation-current-20261008.py",
    "cwd": str(REPOSITORY), "reviewer": "Codex",
    "environment": {"name": "Local Windows tracker CLI review", "details": "Node.js progress CLI limited to validate/status/next for the Frontend and full-product scopes.", "dataSource": "source-only"},
    "checksTotal": 18, "failed": 0, "sourceFiles": source_files, "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(), "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print("PASS: Frontend ledger 28/140; full-product reference 84/420 unchanged")
print(f"Frontend next: {next_task}.{next_step.get('id')}")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
