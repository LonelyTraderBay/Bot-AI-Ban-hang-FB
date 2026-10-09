"""Exercise the FE tracker read-only commands and evidence freshness/fixture gates."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess
import sys


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
OUT = SCRIPT.parent
LOG = OUT / "S04-tracker-validation-evidence-audit-current-20261007.log"
RECEIPT = OUT / "S04-tracker-validation-evidence-audit-current-20261007.json"
NODE = Path(r"C:\Program Files\nodejs\node.exe")
CLI = KIT / "scripts/progress.mjs"
COMMAND = "python botsales-kit/execution/frontend-evidence/FE003/capture-s04-progress-audit.py"

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(label: str, argv: list[str]) -> tuple[subprocess.CompletedProcess, Path]:
    result = subprocess.run(argv, cwd=KIT, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
    output = result.stdout.rstrip() + (("\n[stderr]\n" + result.stderr.rstrip()) if result.stderr else "")
    target = OUT / f"S04-{label}-current-20261007.log"
    target.write_text(f"Command: {' '.join(argv)}\nCWD: {KIT}\nExit: {result.returncode}\n\n{output}\n", encoding="utf-8", newline="\n")
    return result, target

full_plan = KIT / "execution/plan.json"
full_progress = KIT / "execution/progress.json"
frontend_progress = KIT / "execution/frontend-progress.json"
frontend_progress_before = sha(frontend_progress)
full_before = {"plan": sha(full_plan), "progress": sha(full_progress)}
command_map_path = KIT / "execution/frontend-command-map.json"
command_map_before = sha(command_map_path)

validate, validate_log = run("validate", [str(NODE), "scripts/progress.mjs", "validate"])
status_run, status_log = run("status", [str(NODE), "scripts/progress.mjs", "status"])
next_run, next_log = run("next", [str(NODE), "scripts/progress.mjs", "next"])
fixtures, fixtures_log = run("fixture-tests", [sys.executable, "scripts/test_progress.py"])
assert validate.returncode == 0 and json.loads(validate.stdout).get("valid") is True
shape = json.loads(validate.stdout)
assert shape["tasks"] == 28 and shape["checkpoints"] == 140
status = json.loads(status_run.stdout)
assert status_run.returncode == 0 and status["verifiedSteps"] == 13 and status["totalSteps"] == 140
assert len(status["blocked"]) == 1 and status["blocked"][0]["id"] == "FE005"
assert status["blocked"][0]["reason"].strip()
assert status["next"][0]["id"] == "FE003" and status["next"][0]["nextStep"]["id"] == "S04"
assert next_run.returncode == 0 and "FE003" in next_run.stdout and "S04" in next_run.stdout
fixture_result = json.loads(fixtures.stdout)
assert fixtures.returncode == 0 and fixture_result["scope"] == "TRACKER_SELF_TEST_ONLY_ISOLATED_COPIES"
assert fixture_result["passed"] == fixture_result["total"] == 26
assert all(row["status"] == "PASS" for row in fixture_result["results"])
assert sha(command_map_path) == command_map_before, "Command map changed during read-only CLI/fixture checks."
assert {"plan": sha(full_plan), "progress": sha(full_progress)} == full_before, "Full-product plan/progress changed."

ledger = json.loads(frontend_progress.read_text(encoding="utf-8"))
sample_steps = [("FE001", step) for step in ("S01", "S02", "S03", "S04", "S05")]
sample_steps += [("FE003", step) for step in ("S01", "S02", "S03")]
sample_steps += [("FE002", "S05")]
sample_receipts = [KIT / ledger["tasks"][task]["steps"][step]["evidence"]["path"]
                   for task, step in sample_steps]
checked_receipts = []
all_source_pairs: dict[str, Path] = {}
for (expected_task, expected_step), receipt_path in zip(sample_steps, sample_receipts, strict=True):
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    assert receipt["taskId"] == expected_task and receipt["stepId"] == expected_step
    assert receipt["result"] == "PASS" and receipt["verificationScope"] == "FRONTEND_WITH_SYNTHETIC_MOCK_API"
    log_path = KIT / receipt["logFile"]
    assert log_path.is_file() and sha(log_path) == receipt["logSha256"]
    snapshot = hashlib.sha256("\n".join(sorted(f"{f['path']}:{f['sha256']}" for f in receipt["sourceFiles"])).encode()).hexdigest()
    assert snapshot == receipt["sourceSnapshotSha256"]
    for source in receipt["sourceFiles"]:
        rel = source["path"]
        path = (REPOSITORY / rel) if rel.startswith("botsales-kit/") else (FRONTEND / rel)
        path = path.resolve()
        root = (REPOSITORY if rel.startswith("botsales-kit/") else FRONTEND).resolve()
        assert path == root or root in path.parents, f"source path escape: {rel}"
        assert path.is_file() and sha(path) == source["sha256"], f"source hash drift: {rel}"
        all_source_pairs[rel] = path
    checked_receipts.append({"path": str(receipt_path.relative_to(REPOSITORY)).replace("\\", "/"),
                             "sha256": sha(receipt_path), "task": receipt["taskId"], "step": receipt["stepId"],
                             "sourceCount": len(receipt["sourceFiles"]), "logSha256": receipt["logSha256"]})

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
logs = [validate_log, status_log, next_log, fixtures_log]
report_lines = [
    "FE003.S04 current frontend tracker and evidence validation audit",
    f"Command: {COMMAND}", f"CWD: {REPOSITORY}", "Audit script exit: 0",
    f"node scripts/progress.mjs validate: exit=0; valid={shape['valid']}; {shape['tasks']} tasks/{shape['checkpoints']} checkpoints; validator scope explicitly says structure only.",
    f"status: exit=0; {status['verifiedSteps']}/{status['totalSteps']} effective checkpoints; next={status['next'][0]['id']}.{status['next'][0]['nextStep']['id']}; FE005 remains intentionally blocked pending ordered FE001-FE004 refresh: {status['blocked']}.",
    f"next: exit=0; output={next_run.stdout.strip()}",
    f"python scripts/test_progress.py: exit=0; {fixture_result['passed']}/{fixture_result['total']} negative/positive tracker fixtures passed. This includes invalid evidence and path/hash rejection fixtures, not app behavior.",
    f"Sample current receipts rechecked for scope/result/log hash/source snapshot/source hashes: {len(checked_receipts)}/{len(checked_receipts)}.",
    f"frontend-command-map SHA unchanged: {command_map_before}; no new application command was needed or registered.",
    f"Frontend progress ledger SHA immediately before the read-only audit: {frontend_progress_before}; omitted from receipt sourceFiles because the subsequent checkpoint writes this live ledger.",
    f"Full-product plan/progress SHA unchanged: {full_before}.",
    "FE CLI source hash resolution retains separate Frontend root and botsales-kit prefix; the test harness copies the intended full-product fixture without the FE override.",
    "No hosted CI claim; app command map remains unchanged because all gate commands already exist and their actual current runs are separately logged.",
]
LOG.write_text("\n".join(report_lines) + "\n", encoding="utf-8", newline="\n")

source_pairs = [
    ("botsales-kit/execution/frontend-plan.json", KIT / "execution/frontend-plan.json"),
    ("botsales-kit/execution/frontend-command-map.json", command_map_path),
    ("botsales-kit/scripts/progress.mjs", CLI), ("botsales-kit/scripts/test_progress.py", KIT / "scripts/test_progress.py"),
    ("botsales-kit/evidence/tracker-tests.json", KIT / "evidence/tracker-tests.json"),
    ("botsales-kit/execution/plan.json", full_plan), ("botsales-kit/execution/progress.json", full_progress),
    ("botsales-kit/execution/frontend-evidence/FE003/capture-s04-progress-audit.py", SCRIPT),
    *[(f"botsales-kit/execution/frontend-evidence/FE003/{p.name}", p) for p in logs],
]
source_pairs.extend(sorted(all_source_pairs.items()))
unique_pairs: dict[str, Path] = {}
for rel, path in source_pairs:
    if rel == "botsales-kit/execution/frontend-progress.json":
        continue  # The receipt checkpoints into this live ledger and cannot fingerprint its post-write hash.
    resolved = path.resolve()
    if rel in unique_pairs:
        assert unique_pairs[rel].resolve() == resolved, f"conflicting path resolution: {rel}"
    else:
        unique_pairs[rel] = path
source_files = [{"path": rel, "sha256": sha(path)} for rel, path in unique_pairs.items()]
snapshot = hashlib.sha256("\n".join(sorted(f"{x['path']}:{x['sha256']}" for x in source_files)).encode()).hexdigest()
evidence = {
    "taskId": "FE003", "stepId": "S04", "kind": "artifact_review", "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API", "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Run frontend validate/status/next, verify sample receipt scope/log/source hashes, and exercise tracker acceptance/rejection fixtures without modifying the full-product ledger or command map.",
    "observed": f"validate={shape['valid']} for 28/140; status reports {status['verifiedSteps']}/140, next FE003.S04, FE005 explicitly blocked pending source-hash refresh in FE001-FE004; next exits 0; tracker fixture suite passes 26/26; {len(checked_receipts)} current receipts pass direct scope/log/source hash rechecks; full-product ledgers and command map hashes unchanged.",
    "command": COMMAND, "cwd": str(REPOSITORY), "reviewer": "Codex",
    "environment": {"name": "Windows frontend tracker and evidence audit", "details": f"Node {subprocess.run([str(NODE), '--version'], capture_output=True, text=True, check=True).stdout.strip()}, Python {sys.version.split()[0]}; read-only frontend CLI calls and isolated fixture harness at revision {head}.", "dataSource": "source-only"},
    "checksTotal": 18 + len(checked_receipts), "failed": 0, "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot, "logFile": LOG.relative_to(KIT).as_posix(), "logSha256": sha(LOG),
    "sampleReceipts": checked_receipts,
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: FE tracker CLI, 26 fixtures, {len(checked_receipts)} evidence receipts; full-product ledger untouched")
