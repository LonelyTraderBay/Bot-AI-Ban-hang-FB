"""Record FE002 as the first ready Frontend target and its exact change budget."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
KIT = REPOSITORY / "botsales-kit"
PLAN_PATH = KIT / "execution/frontend-plan.json"
GUIDE_PATH = KIT / "execution/FRONTEND_PLAN_GUIDE.md"
LOG = SCRIPT.with_name("S04-first-target-change-budget-current-20261007.log")
RECEIPT = SCRIPT.with_name("S04-first-target-change-budget-current-20261007.json")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


plan_bytes = PLAN_PATH.read_bytes()
plan = json.loads(plan_bytes)
guide_bytes = GUIDE_PATH.read_bytes()
tasks = {task["id"]: task for task in plan["tasks"]}
fe001 = tasks["FE001"]
fe002 = tasks["FE002"]
approved_paths = [
    "package.json",
    "apps/web/package.json",
    "package-lock.json",
    ".node-version",
    "scripts/setup.mjs",
    "scripts/doctor.mjs",
    "docs/PROJECT_CONTEXT.md",
]
assert fe002["priority"] == 2 and fe002["dependsOn"] == ["FE001"]
assert fe001["implementationSteps"][-1]["id"] == "S05"
assert fe002["writeScope"] == approved_paths
assert fe002["routeIds"] == [] and fe002["operationIds"] == []
assert fe002["featureIds"] == ["H07", "H08"]
assert [step["id"] for step in fe002["implementationSteps"]] == ["S01", "S02", "S03", "S04", "S05"]
assert "V0–V3" in fe002["verificationLevel"]
assert "synthetic" in fe002["verificationLevel"].lower()

checks = 9
head = __import__("subprocess").run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY,
    capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()
lines = [
    "FE001.S04 next target and Change Budget",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"Current HEAD: {head}",
    "Selected next target: FE002 — Toolchain và dependencies tái lập (priority 2; dependency FE001).",
    "Routes/operations: none; feature references H07/H08 only; no product API or backend task is introduced.",
    "Verification levels: V0–V3 for toolchain/source/install/setup/doctor evidence; V4 only if a concrete dependency or environment risk appears.",
    "Allowed write budget from canonical FE002 plan:",
    *[f"  - {item}" for item in approved_paths],
    "Execution controls: record exact Node/npm and pre-run manifest/lock hashes; inspect setup/doctor write/cache/network behavior; if npm install changes an in-scope manifest/lock, preserve both before/after hashes and explain the diff; never overwrite existing .env or unrelated working-tree edits; cold npm ci must use an isolated copy.",
    "Out of budget: Backend, provider/live API, full-product T ledger, shared canonical contracts/tokens/generated outputs, unrelated FE modules/tests/evidence, commit/push/deploy.",
    "No source change is authorized by this planning checkpoint; FE002 starts only after FE001.S05 closes the dependency.",
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

sources = [
    {"path": "botsales-kit/execution/frontend-plan.json", "sha256": digest(plan_bytes)},
    {"path": "botsales-kit/execution/FRONTEND_PLAN_GUIDE.md", "sha256": digest(guide_bytes)},
    {"path": "botsales-kit/execution/frontend-evidence/FE001/capture-s04-change-budget.py", "sha256": digest(SCRIPT.read_bytes())},
]
snapshot = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in sources)).encode())
evidence = {
    "taskId": "FE001",
    "stepId": "S04",
    "kind": "artifact_review",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Select the first dependency-ready frontend task with bounded paths, operation/route scope, verification levels and a change budget grounded in the canonical plan.",
    "observed": f"FE002 is priority 2 and depends only on FE001; the canonical plan lists {len(approved_paths)} allowed paths, no route or operation IDs, features H07/H08, and V0–V3 verification. Install/clean-install side effects and exclusions are recorded; no FE002 source was changed by this planning step.",
    "command": "python execution/frontend-evidence/FE001/capture-s04-change-budget.py",
    "reviewer": "Codex",
    "environment": {"name": "Local Frontend plan review", "details": "Read-only review of canonical FE plan/guide; no application or backend execution.", "dataSource": "source-only"},
    "checksTotal": checks,
    "failed": 0,
    "sourceFiles": sources,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: FE002 target and {len(approved_paths)}-path change budget; routes=0 operations=0")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
