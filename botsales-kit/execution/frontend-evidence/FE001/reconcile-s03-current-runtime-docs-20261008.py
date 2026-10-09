"""Reconcile current Frontend docs/package claims with fresh local evidence and limits."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import re
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
KIT = REPOSITORY / "botsales-kit"
FE = REPOSITORY / "BotSalesAI_Frontend"
SYNC = FE / "evidence/frontend-ui-document-sync-20261007"
LOG = SCRIPT.with_name("S03-current-reconciliation-20261008.log")
RECEIPT = SCRIPT.with_name("S03-current-reconciliation-20261008.json")
SESSION_LOG = SCRIPT.with_name("S03-e2e-current-source-session-20261008.log")
VERIFY_FAILED_LOG = SCRIPT.with_name("S03-full-verify-current-20261008.log")
VERIFY_PATH_RETRY_LOG = SCRIPT.with_name("S03-full-verify-retry-path-current-20261008.log")
VERIFY_LOG = SCRIPT.with_name("S03-full-verify-powershell-current-20261008.log")
FE005 = KIT / "execution/frontend-evidence/FE005/S03-api-client-current-20261007.receipt.json"
FE009 = KIT / "execution/frontend-evidence/FE009/S02-current-20261007.json"
FE022_S01 = KIT / "execution/frontend-evidence/FE022/S01-current-20261008.json"
FE022_S04 = KIT / "execution/frontend-evidence/FE022/S04-current-20261008.json"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check(condition: bool, message: str) -> None:
    global checks
    checks += 1
    if not condition:
        raise AssertionError(message)


def source_path(relative: str) -> Path:
    if relative.startswith("botsales-kit/"):
        return KIT / relative.removeprefix("botsales-kit/")
    return FE / relative


def snapshot_matches(receipt: dict) -> tuple[int, int, list[str]]:
    total = len(receipt.get("sourceFiles", []))
    mismatch = []
    for item in receipt.get("sourceFiles", []):
        file = source_path(item["path"])
        if not file.is_file() or digest(file.read_bytes()) != item["sha256"]:
            mismatch.append(item["path"])
    return total - len(mismatch), total, mismatch


checks = 0
head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
package = json.loads((FE / "package.json").read_text(encoding="utf-8"))
known_gaps = (FE / "docs/KNOWN_GAPS.md").read_text(encoding="utf-8")
top_report = (FE / "evidence/REPORT.md").read_text(encoding="utf-8")
sync_report = (SYNC / "REPORT.md").read_text(encoding="utf-8")
verify_record = json.loads((SYNC / "verify-record.json").read_text(encoding="utf-8"))
e2e_record = json.loads((SYNC / "e2e-record.json").read_text(encoding="utf-8"))
verify_log = (SYNC / "verify.log").read_text(encoding="utf-8", errors="replace")
historical_e2e_log = (SYNC / "e2e.log").read_text(encoding="utf-8", errors="replace")
api_receipt = json.loads(FE005.read_text(encoding="utf-8"))
fe009_receipt = json.loads(FE009.read_text(encoding="utf-8"))
fe022_s01 = json.loads(FE022_S01.read_text(encoding="utf-8"))
fe022_s04 = json.loads(FE022_S04.read_text(encoding="utf-8"))
fe009_log = KIT / fe009_receipt["logFile"]
fe009_log_bytes = fe009_log.read_bytes()
session_log = SESSION_LOG.read_text(encoding="utf-8", errors="replace")
verify_current_log = VERIFY_LOG.read_text(encoding="utf-8", errors="replace")
verify_path_retry_log = VERIFY_PATH_RETRY_LOG.read_text(encoding="utf-8", errors="replace")
verify_failed_log = VERIFY_FAILED_LOG.read_text(encoding="utf-8", errors="replace")

required_verify = [
    "npm run generate:check", "npm run test:source", "npm run boundaries", "npm run lint",
    "npm run typecheck", "npm run test:domain", "npm test", "npm run build",
    "npm run test:layout", "npm run test:visual-tokens", "npm run test:ui-composition", "npm run test:evidence",
]
scripts = package.get("scripts", {})
check(all(item in scripts.get("verify", "") for item in required_verify), "Frontend verify lost a required local gate")
check("npm run test:e2e" not in scripts.get("verify", ""), "E2E must remain a separate explicit command")
check(scripts.get("test:e2e") == "node scripts/run-e2e.mjs", "test:e2e script changed without reconciliation")
check("frontend-ui-document-sync-20261007/REPORT.md" in top_report, "Top report no longer identifies its dated evidence")
check("504/504" in top_report and "504/504" in sync_report and "504 passed" in historical_e2e_log,
      "Expected dated 504/504 doc-sync snapshot is missing")
check("Current navigation" in known_gaps and "HISTORICAL_SNAPSHOT" in known_gaps,
      "Known-gaps snapshot is not clearly dated/historical")
check("hosted CI `NOT_RUN`" in known_gaps and "Narrator speech/transcript" in known_gaps,
      "Known gaps lost explicit hosted/screen-reader boundaries")
check(verify_record.get("exitCode") == 0 and e2e_record.get("exitCode") == 0,
      "Dated doc-sync verify/E2E did not record exit 0")
check(verify_record.get("sourceRevision") == head and e2e_record.get("sourceRevision") == head,
      "Dated doc-sync records do not point to current Git HEAD")

def runtime_mismatches(record: dict) -> list[str]:
    mismatches = []
    for relative, expected in record.get("runtimeSourceFingerprints", {}).items():
        check(relative.startswith("BotSalesAI_Frontend/"), f"Unexpected fingerprint root: {relative}")
        file = REPOSITORY / relative
        if not file.is_file() or digest(file.read_bytes()) != expected:
            mismatches.append(relative)
    return sorted(mismatches)


verify_mismatches = runtime_mismatches(verify_record)
old_e2e_mismatches = runtime_mismatches(e2e_record)
changed_api_client = "BotSalesAI_Frontend/apps/web/src/shared/api/client.ts"
check(verify_mismatches == [changed_api_client], f"Unexpected previous verify fingerprint drift: {verify_mismatches}")
check(old_e2e_mismatches == [changed_api_client], f"Unexpected previous E2E fingerprint drift: {old_e2e_mismatches}")

api_log = KIT / "execution/frontend-evidence/FE005/S03-api-client-current-20261007.log"
api_unit = KIT / "execution/frontend-evidence/FE005/S03-unit-current-20261007.log"
api_types = KIT / "execution/frontend-evidence/FE005/S03-types-current-20261007.log"
check(api_receipt.get("taskId") == "FE005" and api_receipt.get("stepId") == "S03" and api_receipt.get("result") == "PASS",
      "Current FE005 API evidence is missing or non-PASS")
check("138 tests" in api_receipt.get("observed", "") and "strict TypeScript typecheck exited 0" in api_receipt.get("observed", ""),
      "FE005 replacement evidence does not record unit/typecheck results")
check(api_receipt.get("logSha256") == digest(api_log.read_bytes()), "FE005 API evidence log hash mismatch")
check(any(item.get("commandId") == "types" and item.get("exitCode") == 0 for item in api_receipt.get("commandResults", [])),
      "FE005 typecheck command did not exit 0")
check(any(item.get("commandId") == "unit" and item.get("exitCode") == 0 for item in api_receipt.get("commandResults", [])),
      "FE005 unit command did not exit 0")
api_matches, api_total, api_mismatch_paths = snapshot_matches(api_receipt)
api_frontend_paths = [item["path"] for item in api_receipt["sourceFiles"] if not item["path"].startswith("botsales-kit/")]
check(api_frontend_paths and all(path not in api_mismatch_paths for path in api_frontend_paths),
      f"FE005 changed frontend source hashes: {api_mismatch_paths}")

check(fe009_receipt.get("result") == "PASS" and "512/512" in fe009_receipt.get("observed", ""),
      "FE009 captured full E2E receipt does not record 512/512")
check(fe009_receipt.get("logSha256") == digest(fe009_log_bytes), "FE009 E2E log hash mismatch")
e2e_result = next((item for item in fe009_receipt.get("commandResults", []) if item.get("commandId") == "e2e"), None)
check(e2e_result and e2e_result.get("exitCode") == 0 and e2e_result.get("passed") == 512,
      "FE009 E2E command did not exit 0 with 512 passing cases")
fe009_matches, fe009_total, fe009_mismatches = snapshot_matches(fe009_receipt)
fe009_frontend_paths = [item["path"] for item in fe009_receipt["sourceFiles"] if not item["path"].startswith("botsales-kit/")]
check(fe009_frontend_paths and all(path not in fe009_mismatches for path in fe009_frontend_paths),
      f"FE009 changed frontend source hashes: {fe009_mismatches}")

for name, receipt in (("FE022 S01", fe022_s01), ("FE022 S04", fe022_s04)):
    matched, total, mismatches = snapshot_matches(receipt)
    check(receipt.get("result") == "PASS" and total == 40 and matched == 40 and not mismatches,
          f"{name} current source snapshot mismatch: {matched}/{total} {mismatches}")
check("64 feature IDs" in fe022_s01.get("observed", "") and "65 feature-route entries" in fe022_s01.get("observed", ""),
      "FE022 S01 current route matrix counts changed")
check("five FE022 cases" in fe022_s04.get("observed", ""), "FE022 focused receipt does not record five passing cases")
focus_log = KIT / fe022_s04["logFile"]
check(fe022_s04.get("logSha256") == digest(focus_log.read_bytes()), "FE022 focused log hash mismatch")
focus_result = next((item for item in fe022_s04.get("commandResults", []) if item.get("logFile", "").endswith("S04-focused-vertical-slices-current-20261008.log")), None)
check(focus_result and focus_result.get("exitCode") == 0 and focus_result.get("testsPassed") == 5,
      "FE022 focused browser command did not exit 0 with five passing cases")
failed_shell_log = KIT / "execution/frontend-evidence/FE022/S04-focused-vertical-slices-powershell-failed-current-20261007.log"
failed_shell_text = failed_shell_log.read_text(encoding="utf-8", errors="replace")
check("'node' is not recognized" in failed_shell_text and "EXIT_CODE=1" in failed_shell_text,
      "Prior PowerShell runner failure was not captured accurately")

check("Command=capture:full-e2e" in session_log and "512 passed" in session_log and "EXIT_CODE=0" in session_log,
      "Current-source full E2E rerun session record is incomplete or failed")
check("demo build PASS" in session_log and "TypeScript typecheck PASS" in session_log,
      "Current-source E2E runner did not record demo build/typecheck stages")
check("no live backend/provider" in session_log.lower() and "synthetic msw data only" in session_log.lower(),
      "Current-source E2E session record must state synthetic service boundary")

ui028_root = FE / "evidence/frontend-ui-improvements/UI028"
w28_files = sorted((ui028_root / "W28").glob("*current-20261008-*.json"))
w29_files = sorted((ui028_root / "W29").glob("*current-20261008-*.json"))
w30_files = sorted((ui028_root / "W30").glob("*current-20261008-*.json"))
check(len(w28_files) == 4, f"Expected 4 current W28 route geometry artifacts, got {len(w28_files)}")
check(len(w29_files) == 18, f"Expected 18 current W29 responsive profile artifacts, got {len(w29_files)}")
check(len(w30_files) == 10, f"Expected 10 current W30 text/spacing stress artifacts, got {len(w30_files)}")
w28_observations = []
for file in w28_files:
    artifact = json.loads(file.read_text(encoding="utf-8"))
    check(artifact.get("task") == "UI028.W28" and artifact.get("expectedRoutes") == 54 and artifact.get("renderedRoutes") == 54,
          f"W28 route coverage incomplete: {file.name}")
    check(not artifact.get("issues") and not artifact.get("pageErrors"), f"W28 findings in {file.name}")
    w28_observations.append((artifact.get("browser"), artifact.get("viewport", {}).get("width")))
check(set(w28_observations) == {(browser, width) for browser in ("chromium", "firefox") for width in (390, 1440)},
      f"W28 browser/viewport coverage mismatch: {w28_observations}")
w29_observations = []
expected_profiles = {"auth", "dashboard", "table", "form", "inbox", "report", "dirty-draft-dialog"}
for file in w29_files:
    artifact = json.loads(file.read_text(encoding="utf-8"))
    width = artifact.get("viewport", {}).get("width")
    check(artifact.get("task") == "UI028.W29" and len(artifact.get("profiles", [])) == 7,
          f"W29 profile coverage incomplete: {file.name}")
    check(set(artifact.get("profiles", [])) == expected_profiles, f"W29 profile IDs differ: {file.name}")
    check(not artifact.get("issues") and not artifact.get("pageErrors"), f"W29 findings in {file.name}")
    page_observations = [observation for observation in artifact.get("observations", []) if "pageOverflow" in observation]
    dialogs = [observation for observation in artifact.get("observations", []) if observation.get("profile") == "dirty-draft-dialog"]
    check(len(page_observations) == 6 and all(observation.get("pageOverflow") == 0 for observation in page_observations),
          f"W29 route-profile horizontal overflow or missing geometry in {file.name}")
    check(len(dialogs) == 1 and dialogs[0].get("dialogGeometry", {}).get("scrollWidth") <= dialogs[0].get("dialogGeometry", {}).get("clientWidth"),
          f"W29 dialog horizontal overflow or missing geometry in {file.name}")
    w29_observations.append((artifact.get("browser"), width))
expected_widths = {320, 390, 767, 768, 1024, 1279, 1280, 1440, 1920}
check(set(w29_observations) == {(browser, width) for browser in ("chromium", "firefox") for width in expected_widths},
      f"W29 browser/viewport coverage mismatch: {w29_observations}")
w30_observations = []
expected_stress = {"form-error-short", "mobile-menu-long-label", "report-long-id", "inbox-long-composer", "dialog-long-reason"}
for file in w30_files:
    artifact = json.loads(file.read_text(encoding="utf-8"))
    check(artifact.get("task") == "UI028.W30", f"Unexpected task in W30 artifact: {file.name}")
    check(not artifact.get("issues") and not artifact.get("pageErrors"), f"W30 findings in {file.name}")
    check(artifact.get("actualBrowserZoom", {}).get("result") == "NOT_MEASURED",
          f"W30 DOM text-scale result overstated browser zoom: {file.name}")
    w30_observations.append((artifact.get("browser"), artifact.get("scenario")))
check(set(w30_observations) == {(browser, scenario) for browser in ("chromium", "firefox") for scenario in expected_stress},
      f"W30 engine/scenario coverage mismatch: {w30_observations}")

check("EXIT_CODE=0" in verify_current_log, "Current npm run verify retry log lacks its observed exit code 0")
check("spawnSync git ENOENT" in verify_failed_log, "Initial verify environment failure was not preserved or classified")
check("spawnSync git ENOENT" in verify_path_retry_log, "Intermediate cmd PATH retry failure was not preserved or classified")
check("C:\\Program Files\\Git\\cmd" in verify_current_log,
      "Successful verify run does not record the explicit Git PATH correction")
for gate in required_verify:
    check(gate in verify_current_log, f"Current verify log missing required gate command: {gate}")
check("ui-evidence PASS" in verify_current_log,
      "Current verify log does not show completion of the evidence gate")

lines = [
    "FE001.S03 current REPORT / KNOWN_GAPS / package and runtime reconciliation (2026-10-08)",
    f"HEAD={head}; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"Package verify required local gates={len(required_verify)}; test:e2e is a separate command.",
    "The 2026-10-07 doc-sync report and its 504/504 result are retained as a dated historical snapshot.",
    f"Old doc-sync verify: exit=0; runtime fingerprints={len(verify_record.get('runtimeSourceFingerprints', {}))}; current mismatches={verify_mismatches}.",
    f"Old doc-sync E2E: exit=0; result=504/504; runtime fingerprints={len(e2e_record.get('runtimeSourceFingerprints', {}))}; current mismatches={old_e2e_mismatches}.",
    "Current FE005 API client replacement: unit=138 pass; strict typecheck=exit 0; Frontend source hashes match; changed kit documentation/plan hashes are kept as dated context.",
    f"Current FE009 captured suite: 512/512 pass; Frontend source hashes match; kit input snapshot differences={fe009_total-fe009_matches}/{fe009_total} and are not hidden.",
    "Current FE022 matrix: 54 routes / 64 feature IDs / 65 feature-route entries; 40/40 route-test source snapshot hashes match.",
    "Current FE022 focused Chromium run: 5/5 pass. Earlier PowerShell child process failed because node was not on nested cmd PATH; the corrected explicit PATH/cmd.exe invocation exited 0.",
    "Fresh full E2E revalidation: " + session_log.strip().replace("\n", " | "),
    "The first full verify attempt and the intermediate cmd-shell retry ended at the evidence gate because Node could not resolve git.exe (spawnSync git ENOENT). A third run invoked from PowerShell with an explicit PATH including Git completed the full local verify. Hosted CI, live Backend/provider, staging, production and owner acceptance are not established.",
    "Known-gap dated snapshots retain hosted CI and Narrator limits; no prior result is relabeled current and no documentation output is manually regenerated by this audit.",
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

source_paths = {
    "package.json", "package-lock.json", "docs/KNOWN_GAPS.md", "evidence/REPORT.md",
    "evidence/frontend-ui-document-sync-20261007/REPORT.md",
    "evidence/frontend-ui-document-sync-20261007/verify-record.json",
    "evidence/frontend-ui-document-sync-20261007/verify.log",
    "evidence/frontend-ui-document-sync-20261007/e2e-record.json",
    "evidence/frontend-ui-document-sync-20261007/e2e.log",
    "apps/web/src/shared/api/client.ts", "apps/web/tests/api-client.test.tsx",
    "botsales-kit/execution/frontend-command-map.json", "botsales-kit/execution/frontend-plan.json",
    "botsales-kit/execution/frontend-evidence/FE001/reconcile-s03-current-runtime-docs-20261008.py",
    "botsales-kit/execution/frontend-evidence/FE001/audit-route-map-current-20261008.py",
    "botsales-kit/execution/frontend-evidence/FE001/S01-current-20261008.json",
    "botsales-kit/execution/frontend-evidence/FE001/S02-route-map-audit-current-20261008.json",
    "botsales-kit/execution/frontend-evidence/FE001/S02-route-map-audit-current-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE001/S03-full-verify-current-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE001/S03-full-verify-retry-path-current-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE005/S03-api-client-current-20261007.receipt.json",
    "botsales-kit/execution/frontend-evidence/FE005/S03-api-client-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE005/S03-unit-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE005/S03-types-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE009/S02-current-20261007.json",
    "botsales-kit/execution/frontend-evidence/FE009/S02-e2e-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE022/S01-current-20261008.json",
    "botsales-kit/execution/frontend-evidence/FE022/S01-route-matrix-current-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE022/S04-current-20261008.json",
    "botsales-kit/execution/frontend-evidence/FE022/S04-focused-vertical-slices-current-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE022/S04-focused-vertical-slices-powershell-failed-current-20261007.log",
}
for directory in ("W28", "W29", "W30"):
    source_paths.update(file.relative_to(FE).as_posix() for file in sorted((ui028_root / directory).glob("*current-20261008-*.json")))
source_files = []
for relative in sorted(source_paths):
    file = source_path(relative)
    check(file.is_file(), f"Missing source snapshot: {relative}")
    source_files.append({"path": relative, "sha256": digest(file.read_bytes())})
snapshot = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
evidence = {
    "taskId": "FE001", "stepId": "S03", "kind": "artifact_review", "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (current documentation, code and test-evidence snapshot)",
    "expected": "Reconcile REPORT/KNOWN_GAPS/package scripts with actual current-source checks; distinguish dated history from current evidence and record failures/environment limits.",
    "observed": f"The dated report's 504/504 run is separated from the fresh 512/512 local E2E rerun. Package verify retains all {len(required_verify)} local gates with E2E separate. FE005's 138 unit tests/typecheck and FE022's focused 5/5 are linked; current-source matrix snapshots match. The old PowerShell failure is attributed to nested PATH and the corrected invocation passed. Full npm run verify, hosted CI, live backend/provider, staging, production and owner acceptance are not claimed.",
    "command": "python botsales-kit/execution/frontend-evidence/FE001/reconcile-s03-current-runtime-docs-20261008.py",
    "cwd": str(REPOSITORY), "reviewer": "Codex",
    "environment": {"name": "Local Windows Frontend documentation and runtime artifact reconciliation", "details": "Read-only comparison of documentation, package scripts, FE005/FE009/FE022 captures, and a current-source E2E command-session summary; E2E uses local React/MSW mock only.", "dataSource": "synthetic-msw"},
    "checksTotal": checks, "failed": 0, "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(), "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"result": "PASS", "checks": checks, "historicalDocSync": "504/504", "freshFullE2E": "512/512", "unit": "138/138", "FE022Focused": "5/5", "FE022Snapshot": "40/40", "currentReport": "dated snapshot retained", "receipt": RECEIPT.relative_to(REPOSITORY).as_posix()}, ensure_ascii=False, indent=2))
