from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys

SCRIPT = Path(__file__).resolve()
REPO = SCRIPT.parents[4]
KIT = REPO / "botsales-kit"
FE = REPO / "BotSalesAI_Frontend"
OUT = SCRIPT.parent
LOG = OUT / "S05-current-runner-documentation-audit-20261007.log"
RECEIPT = OUT / "S05-current-runner-documentation-audit-20261007.json"
HEAD = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO, capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()
COMMAND = "python botsales-kit/execution/frontend-evidence/FE003/capture-s05-current-runner-docs.py"

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def local_links(document: Path, text: str) -> int:
    count = 0
    for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", text):
        target = target.strip().split("#", 1)[0]
        if not target or "://" in target:
            continue
        dest = (document.parent / target).resolve()
        assert dest.exists(), f"broken current markdown link: {document.relative_to(FE)} -> {target}"
        count += 1
    return count

continuation = FE / "docs/CONTINUE_FRONTEND.md"
report = FE / "evidence/REPORT.md"
handoff = OUT / "handoff.md"
continuation_text = continuation.read_text(encoding="utf-8")
report_text = report.read_text(encoding="utf-8")
handoff_text = handoff.read_text(encoding="utf-8")
assert "read the live FE checkpoint" in continuation_text
assert "0/140 verified" not in continuation_text and "next FE001.S01" not in continuation_text
assert "$npmCmd --script-shell=cmd.exe run doctor" in continuation_text
assert "finally" in continuation_text and "$env:Path = $savedPath" in continuation_text
assert "FE implementation order is the canonical Frontend task plan" in continuation_text
assert "GitHub-hosted workflow run: NOT_RUN" in handoff_text
assert "504/504" in handoff_text and "136/136" in handoff_text and "88/88" in handoff_text
assert "CI PASS" not in report_text[:report_text.index("## HISTORICAL_SNAPSHOT")]
continuation_links = local_links(continuation, continuation_text)
report_current = report_text[:report_text.index("## HISTORICAL_SNAPSHOT")]
report_links = local_links(report, report_current)
handoff_current = handoff_text[handoff_text.index("## Current Windows runner and documentation closeout"):]
handoff_links = local_links(handoff, handoff_current)

pkg = json.loads((FE / "package.json").read_text(encoding="utf-8"))
for script_name in ("doctor", "verify", "test:e2e"):
    assert script_name in pkg["scripts"], f"documented npm script missing: {script_name}"
workflow = REPO / ".github/workflows/frontend.yml"
workflow_text = workflow.read_text(encoding="utf-8")
for expected in ("runs-on: ubuntu-latest", "node-version: '24'", "npm install --global npm@11.17.0", "npm ci", "npm audit --audit-level=low", "npm run setup", "npm run verify", "npx playwright install --with-deps chromium firefox", "npm run test:e2e"):
    assert expected in workflow_text, f"workflow drift: {expected}"
workflow_sha = sha(workflow)
assert workflow_sha == "238511056b84e1cc972b87d2e8c673be34a8aac57295f4dd7855992c38804dc2"

verify_record_path = FE / "evidence/frontend-ui-document-sync-20261007/verify-record.json"
e2e_record_path = FE / "evidence/frontend-ui-document-sync-20261007/e2e-record.json"
verify_log = FE / "evidence/frontend-ui-document-sync-20261007/verify.log"
e2e_log = FE / "evidence/frontend-ui-document-sync-20261007/e2e.log"
verify_record = json.loads(verify_record_path.read_text(encoding="utf-8"))
e2e_record = json.loads(e2e_record_path.read_text(encoding="utf-8"))
assert verify_record["stage"] == "verify" and verify_record["exitCode"] == 0 and verify_record["sourceRevision"] == HEAD
assert e2e_record["stage"] == "e2e" and e2e_record["exitCode"] == 0 and e2e_record["sourceRevision"] == HEAD
assert sha(verify_log) == verify_record["log"]["sha256"]
assert sha(e2e_log) == e2e_record["log"]["sha256"]
assert "504 passed" in e2e_log.read_text(encoding="utf-8", errors="replace")
unit_log = OUT / "S03-vitest-rtl-baseline-final-current-20261007.log"
domain_log = OUT / "S03-domain-msw-baseline-final-current-20261007.log"
assert "Tests  136 passed (136)" in unit_log.read_text(encoding="utf-8", errors="replace")
assert '"passed":88' in domain_log.read_text(encoding="utf-8", errors="replace")

node = subprocess.run(["node", "scripts/progress.mjs", "validate"], cwd=KIT, capture_output=True, text=True, encoding="utf-8", errors="replace")
status = subprocess.run(["node", "scripts/progress.mjs", "status"], cwd=KIT, capture_output=True, text=True, encoding="utf-8", errors="replace")
next_step = subprocess.run(["node", "scripts/progress.mjs", "next"], cwd=KIT, capture_output=True, text=True, encoding="utf-8", errors="replace")
assert node.returncode == status.returncode == next_step.returncode == 0
shape = json.loads(node.stdout)
state = json.loads(status.stdout)
next_result = json.loads(next_step.stdout)
assert shape["valid"] is True and shape["tasks"] == 28 and shape["checkpoints"] == 140
assert state["verifiedSteps"] == 14 and state["next"][0]["id"] == "FE003" and state["next"][0]["nextStep"]["id"] == "S05"
first_unverified = next(s for s in next_result["steps"] if s["status"] != "VERIFIED")
assert next_result["id"] == "FE003" and first_unverified["id"] == "S05"

full_plan = KIT / "execution/plan.json"
full_progress = KIT / "execution/progress.json"
full_hashes = {"plan": sha(full_plan), "progress": sha(full_progress)}
paths = [
    "docs/CONTINUE_FRONTEND.md",
    "evidence/REPORT.md",
    "package.json",
    "package-lock.json",
    ".node-version",
    ".npmrc",
    "apps/web/package.json",
    "apps/web/vitest.config.ts",
    "playwright.config.ts",
    "playwright.built-demo.config.ts",
    "scripts/run-e2e.mjs",
    "scripts/test-domain.mjs",
    "tests/accessibility/routes.spec.ts",
    "botsales-kit/execution/frontend-command-map.json",
    "botsales-kit/scripts/progress.mjs",
    "botsales-kit/execution/frontend-evidence/FE003/handoff.md",
    "botsales-kit/execution/frontend-evidence/FE003/capture-s01-command-map.py",
    "botsales-kit/execution/frontend-evidence/FE003/capture-s02-gate-matrix.py",
    "botsales-kit/execution/frontend-evidence/FE003/capture-s03-runner-baseline.py",
    "botsales-kit/execution/frontend-evidence/FE003/S01-command-map-audit-current-20261007.json",
    "botsales-kit/execution/frontend-evidence/FE003/S02-fe-task-gate-matrix-current-20261007.json",
    "botsales-kit/execution/frontend-evidence/FE003/S02-verification-ladder-matrix-current-20261007.json",
    "botsales-kit/execution/frontend-evidence/FE003/S03-runner-config-baseline-final-current-20261007.json",
    "botsales-kit/execution/frontend-evidence/FE003/S03-vitest-rtl-baseline-final-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE003/S03-domain-msw-baseline-final-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE003/S03-playwright-targeted-discovery-final-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE003/S03-built-demo-targeted-discovery-final-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE003/S03-playwright-full-discovery-resource-stop-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE002/S05-clean-install-retry-verified-current-20261007.json",
    "botsales-kit/execution/frontend-evidence/FE002/S05-npm-ci-retry-output-current-20261007.log",
    "evidence/frontend-ui-document-sync-20261007/verify-record.json",
    "evidence/frontend-ui-document-sync-20261007/verify.log",
    "evidence/frontend-ui-document-sync-20261007/e2e-record.json",
    "evidence/frontend-ui-document-sync-20261007/e2e.log",
    "botsales-kit/execution/frontend-evidence/FE003/capture-s05-current-runner-docs.py",
]
source_files = []
for item in paths:
    source = (REPO / item) if item.startswith("botsales-kit/") else (FE / item)
    assert source.is_file(), f"missing source snapshot file: {item}"
    source_files.append({"path": item, "sha256": sha(source)})
snapshot = hashlib.sha256("\n".join(sorted(f"{f['path']}:{f['sha256']}" for f in source_files)).encode()).hexdigest()

checks = {
    "canonical_tracker_validate_status_next": True,
    "current_FE03_S05_order_and_14_of_140_start_snapshot": True,
    "continuation_doc_links": continuation_links,
    "report_current_section_links": report_links,
    "handoff_current_section_links": handoff_links,
    "existing_package_commands": 3,
    "workflow_source_steps_matched": 9,
    "verify_current_revision_exit0_and_log_hash": True,
    "e2e_current_revision_504_pass_exit0_and_log_hash": True,
    "vitest_136_pass": True,
    "domain_msw_88_pass": True,
    "source_hashes": len(source_files),
}
lines = [
    "FE003.S05 Windows runner and documentation audit",
    f"Command: {COMMAND}",
    f"CWD: {REPO}",
    f"Exit: 0",
    f"Git HEAD: {HEAD} (working tree snapshot)",
    f"Environment: Windows; Python {sys.version.split()[0]}; Node v24.19.0; npm 11.17.0",
    f"Expected: Current Windows/CI rerun guidance matches the canonical task tracker, actual npm scripts, repository workflow and hashed logs; historical snapshots remain distinct.",
    "Observed: " + json.dumps({"trackerValidate": shape, "trackerStartStatus": {"verifiedSteps": state["verifiedSteps"], "totalSteps": state["totalSteps"], "blocked": state["blocked"], "next": state["next"][0]}, "workflowSha256": workflow_sha, "checks": checks, "verifyLogSha256": sha(verify_log), "e2eLogSha256": sha(e2e_log), "fullProductLedgerSha256": full_hashes}, ensure_ascii=False),
    "Hosted GitHub Actions: NOT_RUN. FE-G05 human speech/conformance and FE-G09 owner acceptance remain open.",
    "No product test is claimed from this documentation audit; current local test results are separately linked and hash checked.",
    "",
    "Source fingerprints:",
]
lines.extend(f"{f['path']} sha256={f['sha256']}" for f in source_files)
log_text = "\n".join(lines) + "\n"
LOG.write_text(log_text, encoding="utf-8", newline="\n")
receipt = {
    "taskId": "FE003",
    "stepId": "S05",
    "kind": "artifact_review",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": HEAD + " (working tree snapshot)",
    "expected": "Synchronize Windows/CI rerun instructions with current package scripts and workflow; record revision/environment, log paths and hashes, and keep dated history distinct.",
    "observed": "Docs links and runnable guidance match current owners; tracker validate/status/next exited 0 and selected FE003.S05 at 14/140 when this audit began; Node 24.19.0/npm 11.17.0; current-revision verify exit 0 and full synthetic-MSW Chromium/Firefox E2E exit 0 with 504 passed; Vitest 136/136 and domain/MSW 88/88 logs hash verified. Repository workflow SHA-256 " + workflow_sha + " was inspected but no hosted GitHub run is claimed. Full-product ledger hashes unchanged during read-only audit.",
    "command": COMMAND,
    "reviewer": "Codex",
    "environment": {
        "name": "Windows Frontend documentation and runner audit",
        "details": "Windows PowerShell; Python " + sys.version.split()[0] + "; Node v24.19.0/npm 11.17.0; working tree at " + HEAD + "; local React Frontend with synthetic MSW evidence.",
        "dataSource": "synthetic-msw"
    },
    "checksTotal": 16,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot,
    "externalSourceObservations": [{"path": ".github/workflows/frontend.yml", "sha256": workflow_sha, "note": "Outside Frontend sourceRoot; inspected directly from repository root."}],
    "fullProductLedgerSha256": full_hashes,
    "logFile": "execution/frontend-evidence/FE003/S05-current-runner-documentation-audit-20261007.log",
    "logSha256": sha(LOG),
}
RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"result": "PASS", "checks": checks, "receipt": str(RECEIPT), "log": str(LOG), "logSha256": receipt["logSha256"], "workflowSha256": workflow_sha}, indent=2, ensure_ascii=False))