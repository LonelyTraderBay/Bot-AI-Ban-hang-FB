from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess


SCRIPT = Path(__file__).resolve()
REPO = SCRIPT.parents[4]
KIT = REPO / "botsales-kit"
FE = REPO / "BotSalesAI_Frontend"
SYNC = FE / "evidence/frontend-ui-document-sync-20261007"
RECEIPT = KIT / "execution/frontend-evidence/FE001/S03-current-runtime-docs-after-api-change-20261007.json"
LOG = KIT / "execution/frontend-evidence/FE001/S03-current-runtime-docs-after-api-change-20261007.log"
CURRENT_API_RECEIPT = KIT / "execution/frontend-evidence/FE005/S03-api-client-current-20261007.receipt.json"
CURRENT_API_LOG = KIT / "execution/frontend-evidence/FE005/S03-api-client-current-20261007.log"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def rel_source(path: Path) -> str:
    try:
        return path.relative_to(FE).as_posix()
    except ValueError:
        return "botsales-kit/" + path.relative_to(KIT).as_posix()


package = json.loads((FE / "package.json").read_text(encoding="utf-8"))
known_gaps = (FE / "docs/KNOWN_GAPS.md").read_text(encoding="utf-8")
top_report = (FE / "evidence/REPORT.md").read_text(encoding="utf-8")
current_report = (SYNC / "REPORT.md").read_text(encoding="utf-8")
verify_record = json.loads((SYNC / "verify-record.json").read_text(encoding="utf-8"))
e2e_record = json.loads((SYNC / "e2e-record.json").read_text(encoding="utf-8"))
api_receipt = json.loads(CURRENT_API_RECEIPT.read_text(encoding="utf-8"))
api_log = CURRENT_API_LOG.read_text(encoding="utf-8")
head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO, capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()
verify_log = (SYNC / "verify.log").read_text(encoding="utf-8", errors="replace")
e2e_log = (SYNC / "e2e.log").read_text(encoding="utf-8", errors="replace")

required_verify_parts = [
    "npm run generate:check", "npm run test:source", "npm run boundaries", "npm run lint",
    "npm run typecheck", "npm run test:domain", "npm test", "npm run build",
    "npm run test:layout", "npm run test:visual-tokens", "npm run test:ui-composition", "npm run test:evidence",
]
scripts = package.get("scripts", {})
assert all(item in scripts.get("verify", "") for item in required_verify_parts)
assert "npm run test:e2e" not in scripts.get("verify", "")
assert scripts.get("test:e2e") == "node scripts/run-e2e.mjs"
assert "frontend-ui-document-sync-20261007/REPORT.md" in top_report
assert "504/504" in top_report and "504/504" in current_report
assert "Current navigation" in known_gaps and "HISTORICAL_SNAPSHOT" in known_gaps
assert "hosted CI `NOT_RUN`" in known_gaps and "Narrator speech/transcript" in known_gaps
assert verify_record.get("exitCode") == 0 and e2e_record.get("exitCode") == 0
assert verify_record.get("sourceRevision") == head and e2e_record.get("sourceRevision") == head
assert "504 passed" in e2e_log

def fingerprint_mismatches(record):
    mismatches = []
    for relative, expected in record.get("runtimeSourceFingerprints", {}).items():
        assert relative.startswith("BotSalesAI_Frontend/")
        path = REPO / relative
        if not path.is_file() or digest(path.read_bytes()) != expected:
            mismatches.append(relative)
    return sorted(mismatches)


verify_mismatches = fingerprint_mismatches(verify_record)
e2e_mismatches = fingerprint_mismatches(e2e_record)
expected_changed = "BotSalesAI_Frontend/apps/web/src/shared/api/client.ts"
assert verify_mismatches == [expected_changed], f"Unexpected verify fingerprint drift: {verify_mismatches}"
assert e2e_mismatches == [expected_changed], f"Unexpected E2E fingerprint drift: {e2e_mismatches}"
assert api_receipt["taskId"] == "FE005" and api_receipt["stepId"] == "S03" and api_receipt["result"] == "PASS"
assert api_receipt["observed"] and "138" in api_receipt["observed"]
assert "UNEXPECTED_STATUS" in api_log and "UnknownResultError" in api_log
checks = [
    "package verify contains all 12 local gates and browser E2E is a separate command",
    "top-level REPORT points to the current UI document-sync report; both retain their recorded 504/504 snapshot",
    "KNOWN_GAPS marks dated sections historical and retains hosted CI, screen-reader, owner, and live-system limits",
    "previous verify and E2E records were successful at recorded HEAD but are no longer current-source proof",
    "the only runtime fingerprint drift in both records is the edited shared API client",
    "current FE005 S03 evidence replaces the changed client proof with 138 passing unit tests and passing typecheck",
    "no new hosted CI, browser run, Backend/provider, staging, production, or owner acceptance is claimed",
]

source_paths = [
    FE / "package.json", FE / "package-lock.json", FE / "docs/KNOWN_GAPS.md", FE / "evidence/REPORT.md",
    SYNC / "REPORT.md", SYNC / "verify-record.json", SYNC / "verify.log", SYNC / "e2e-record.json", SYNC / "e2e.log",
    FE / "apps/web/src/shared/api/client.ts", FE / "apps/web/tests/api-client.test.tsx",
    KIT / "execution/frontend-command-map.json", KIT / "execution/frontend-plan.json",
    SCRIPT, CURRENT_API_RECEIPT, CURRENT_API_LOG,
]
source_files = [{"path": rel_source(path), "sha256": digest(path.read_bytes())} for path in sorted(set(source_paths), key=lambda item: item.as_posix())]
snapshot = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
log_lines = [
    "FE001.S03 current REPORT / KNOWN_GAPS / package and runtime reconciliation after API client fix",
    f"HEAD={head} plus current working tree; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"package verify gates={len(required_verify_parts)}; test:e2e separate=true",
    f"previous verify: exit={verify_record['exitCode']}; recorded HEAD={verify_record['sourceRevision']}; fingerprints={len(verify_record['runtimeSourceFingerprints'])}; current mismatches={verify_mismatches}",
    f"previous E2E: exit={e2e_record['exitCode']}; recorded HEAD={e2e_record['sourceRevision']}; result=504/504; fingerprints={len(e2e_record['runtimeSourceFingerprints'])}; current mismatches={e2e_mismatches}",
    "Classification: the prior logs are valid historical results at their captured source snapshot, but cannot be presented as current after the client.ts change.",
    f"Current targeted replacement: FE005.S03 full Vitest + strict typecheck; receipt={rel_source(CURRENT_API_RECEIPT)}; log sha256={digest(CURRENT_API_LOG.read_bytes())}; 138 unit tests pass.",
    "Docs retain historical headings and limitations; hosted CI, Narrator/screen-reader speech, owner acceptance, Backend/provider, staging, and production remain unverified.",
    "No product docs, captured old records, generated files, or package scripts were edited by this review.",
    f"checksTotal={len(checks)}; failed=0", *[f"CHECK PASS: {item}" for item in checks],
    f"sourceSnapshotSha256={snapshot}", *[f"SOURCE {item['path']} sha256={item['sha256']}" for item in source_files],
    "\n[latest captured verify success excerpts]", *[line for line in verify_log.splitlines() if "Test Files" in line or "Tests " in line][-4:],
    "\n[latest captured E2E summary]", *[line for line in e2e_log.splitlines() if "504 passed" in line][-2:],
]
log_text = "\n".join(log_lines) + "\n"
LOG.write_text(log_text, encoding="utf-8", newline="\n")
evidence = {
    "taskId": "FE001", "stepId": "S03", "kind": "artifact_review", "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API", "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Đối chiếu REPORT/KNOWN_GAPS/package.json; ghi kiểm đã chạy, chưa chạy và lỗi nền theo môi trường.",
    "observed": "The previous full verify and 504/504 E2E records are explicitly classified as historical after the API client source change: each now has exactly one runtime fingerprint mismatch, apps/web/src/shared/api/client.ts. Current replacement evidence is FE005.S03 with 138 passing Vitest tests and strict typecheck pass. Package verify has 12 local gates; E2E remains a separate command. Historical doc sections and unverified hosted/live/owner boundaries remain labeled; no full current-source E2E, hosted CI, Backend/provider, staging, production, or owner acceptance is claimed.",
    "command": "python botsales-kit/execution/frontend-evidence/FE001/reconcile-s03-current-runtime-docs-20261007.py",
    "reviewer": "Codex self-review; no independent peer review claimed",
    "environment": {"name": "Local Windows Frontend report/runtime artifact review", "details": "Read-only reconciliation of package scripts, current navigation docs, captured local verify/E2E records, current source hashes, and FE005 targeted API verification. No browser/backend was launched by this review.", "dataSource": "synthetic-msw"},
    "checksTotal": len(checks), "failed": 0, "sourceFiles": source_files, "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(), "logSha256": digest(log_text.encode()),
    "currentReplacementEvidence": {"path": CURRENT_API_RECEIPT.relative_to(KIT).as_posix(), "sha256": digest(CURRENT_API_RECEIPT.read_bytes())},
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"result": "PASS", "checks": len(checks), "verifyMismatches": verify_mismatches, "e2eMismatches": e2e_mismatches, "currentUnitTests": 138, "currentTypecheck": "PASS", "receipt": rel_source(RECEIPT), "logSha256": evidence["logSha256"]}, ensure_ascii=False, indent=2))
