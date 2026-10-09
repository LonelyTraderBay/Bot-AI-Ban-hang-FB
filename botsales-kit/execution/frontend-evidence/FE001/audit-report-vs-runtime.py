"""Cross-check current Frontend status prose against package scripts and captured runs."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
EVIDENCE_DIR = FRONTEND / "evidence/frontend-ui-document-sync-20261007"
PACKAGE_PATH = FRONTEND / "package.json"
LOCK_PATH = FRONTEND / "package-lock.json"
REPORT_PATH = FRONTEND / "evidence/REPORT.md"
CURRENT_REPORT_PATH = EVIDENCE_DIR / "REPORT.md"
GAPS_PATH = FRONTEND / "docs/KNOWN_GAPS.md"
VERIFY_RECORD_PATH = EVIDENCE_DIR / "verify-record.json"
VERIFY_LOG_PATH = EVIDENCE_DIR / "verify.log"
E2E_RECORD_PATH = EVIDENCE_DIR / "e2e-record.json"
E2E_LOG_PATH = EVIDENCE_DIR / "e2e.log"
LOG = SCRIPT.with_name("S03-current-report-package-reconciliation-20261007.log")
RECEIPT = SCRIPT.with_name("S03-current-report-package-reconciliation-20261007.json")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


package = json.loads(PACKAGE_PATH.read_text(encoding="utf-8"))
known_gaps = GAPS_PATH.read_text(encoding="utf-8")
report = REPORT_PATH.read_text(encoding="utf-8")
current_report = CURRENT_REPORT_PATH.read_text(encoding="utf-8")
verify_record = json.loads(VERIFY_RECORD_PATH.read_text(encoding="utf-8"))
verify_log = VERIFY_LOG_PATH.read_text(encoding="utf-8", errors="replace")
e2e_record = json.loads(E2E_RECORD_PATH.read_text(encoding="utf-8"))
e2e_log = E2E_LOG_PATH.read_text(encoding="utf-8", errors="replace")
head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
checks = 0

scripts = package.get("scripts", {})
require("npm run test:source" in scripts.get("verify", ""), "verify script omits source validation")
require("npm run boundaries" in scripts.get("verify", ""), "verify script omits boundaries validation")
require("npm run lint" in scripts.get("verify", ""), "verify script omits lint")
require("npm run typecheck" in scripts.get("verify", ""), "verify script omits TypeScript check")
require("npm run test:domain" in scripts.get("verify", ""), "verify script omits domain tests")
require("npm test" in scripts.get("verify", ""), "verify script omits Vitest")
require("npm run build" in scripts.get("verify", ""), "verify script omits production build")
require("npm run test:layout" in scripts.get("verify", ""), "verify script omits layout checks")
require("npm run test:visual-tokens" in scripts.get("verify", ""), "verify script omits visual token checks")
require("npm run test:ui-composition" in scripts.get("verify", ""), "verify script omits composition checks")
require("npm run test:evidence" in scripts.get("verify", ""), "verify script omits evidence validation")
require("npm run test:e2e" not in scripts.get("verify", ""), "verify unexpectedly claims to run browser E2E")
require(scripts.get("test:e2e") == "node scripts/run-e2e.mjs", "test:e2e command differs from captured suite")
checks += 13

for name, record in (("verify", verify_record), ("e2e", e2e_record)):
    require(record.get("exitCode") == 0, f"{name}: captured exit code is not zero")
    require(record.get("sourceRevision") == head, f"{name}: recorded HEAD differs from current HEAD")
    require(str(FRONTEND) in record.get("cwd", ""), f"{name}: captured cwd is not the Frontend workspace")
    checks += 3

fingerprint_count = 0
for name, record in (("verify", verify_record), ("e2e", e2e_record)):
    fingerprints = record.get("runtimeSourceFingerprints", {})
    require(bool(fingerprints), f"{name}: missing runtime source fingerprints")
    for relative, expected in fingerprints.items():
        require(relative.startswith("BotSalesAI_Frontend/"), f"{name}: fingerprint path outside Frontend: {relative}")
        path = REPOSITORY / relative
        require(path.is_file() and digest(path.read_bytes()) == expected,
                f"{name}: source fingerprint mismatch: {relative}")
        fingerprint_count += 1
        checks += 1

require(re.search(r"^\s*504 passed \([^)]+\)\s*$", e2e_log, re.MULTILINE) is not None,
        "E2E log does not report 504 passed")
require("504/504" in current_report and "504/504" in report,
        "Current and navigation reports do not match the captured E2E run")
require("frontend-ui-document-sync-20261007/REPORT.md" in report,
        "Top-level evidence report does not navigate to the current report")
checks += 3

require("Current navigation" in known_gaps and "HISTORICAL_SNAPSHOT" in known_gaps,
        "KNOWN_GAPS does not distinguish current navigation from historical text")
require("hosted CI `NOT_RUN`" in known_gaps, "Hosted CI limitation is not explicitly left NOT_RUN")
require("Narrator speech/transcript" in known_gaps, "Unobserved screen-reader speech limitation is missing")
require("owner acceptance" in known_gaps.lower(), "Owner acceptance limitation is not documented")
require("Backend/provider" in current_report and "hosted CI" in current_report,
        "Current report omits external-system/hosted boundaries")
checks += 5

gate_summary = [line.strip() for line in verify_log.splitlines() if re.search(r"passed|PASS|exit 0|exit=0", line, re.I)]
require(bool(gate_summary), "Verify log contains no success records")
require("504 passed" in e2e_log, "E2E log success total is missing")
checks += 2

lines = [
    "FE001.S03 current report / known gaps / package reconciliation",
    f"Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"Current HEAD: {head}",
    f"Package scripts: verify has 11 local code/evidence gates; browser E2E is a separate test:e2e command.",
    f"Latest verify record: {verify_record['runId']} exit={verify_record['exitCode']} started={verify_record['startedAt']} finished={verify_record['finishedAt']}",
    f"Latest E2E record: {e2e_record['runId']} exit={e2e_record['exitCode']} started={e2e_record['startedAt']} finished={e2e_record['finishedAt']} result=504/504",
    f"Runtime source fingerprints checked against current checkout: {fingerprint_count}; mismatches: 0.",
    f"Top-level REPORT points to the 07/10 current evidence report; KNOWN_GAPS explicitly labels older dated content historical and keeps hosted CI, screen-reader speech, owner acceptance, and backend/provider proof unclaimed.",
    "Environment observed from captured records: local Windows Frontend workspace; `verify` and built-demo browser E2E both exit 0 at current HEAD. No live backend/provider/staging/production execution is represented.",
    "Current verify log success lines:",
    *gate_summary[-35:],
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

source_paths = {
    "package.json",
    "package-lock.json",
    "evidence/REPORT.md",
    "evidence/frontend-ui-document-sync-20261007/REPORT.md",
    "docs/KNOWN_GAPS.md",
    "evidence/frontend-ui-document-sync-20261007/verify-record.json",
    "evidence/frontend-ui-document-sync-20261007/verify.log",
    "evidence/frontend-ui-document-sync-20261007/e2e-record.json",
    "evidence/frontend-ui-document-sync-20261007/e2e.log",
    "botsales-kit/execution/frontend-evidence/FE001/audit-report-vs-runtime.py",
}
source_paths.update(
    relative.removeprefix("BotSalesAI_Frontend/")
    for record in (verify_record, e2e_record)
    for relative in record["runtimeSourceFingerprints"]
)
source_files = []
for relative in sorted(source_paths):
    resolved = REPOSITORY / relative if relative.startswith("botsales-kit/") else FRONTEND / relative
    require(resolved.is_file(), f"Missing source snapshot file: {relative}")
    source_files.append({"path": relative, "sha256": digest(resolved.read_bytes())})
snapshot = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
evidence = {
    "taskId": "FE001",
    "stepId": "S03",
    "kind": "artifact_review",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Reconcile current REPORT, KNOWN_GAPS, package scripts, captured checks and explicit NOT_RUN/environment limits without promoting historical evidence.",
    "observed": f"Current package verify gates and separately-run E2E command match captured records; verify and E2E exit 0 at current HEAD, 504/504 browser cases passed; {fingerprint_count} runtime fingerprints match current files. Dated Known Gaps sections are labeled historical and current report points to 07/10 evidence. Hosted CI, speech transcript, owner acceptance, and backend/provider behavior remain unverified.",
    "command": "python execution/frontend-evidence/FE001/audit-report-vs-runtime.py",
    "reviewer": "Codex",
    "environment": {
        "name": "Local Windows source and evidence reconciliation",
        "details": "Read-only Python cross-check of package, documentation, captured local verify/E2E logs and runtime-source fingerprints; no browser or backend was launched by this audit.",
        "dataSource": "synthetic-msw",
    },
    "checksTotal": checks,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: {checks} reconciliation/fingerprint checks; runtime fingerprints={fingerprint_count}, mismatches=0")
print(f"verify={verify_record['runId']} exit=0; E2E={e2e_record['runId']} exit=0 504/504")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
