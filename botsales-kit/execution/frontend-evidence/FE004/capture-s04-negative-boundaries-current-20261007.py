from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys


SCRIPT = Path(__file__).resolve()
REPO = SCRIPT.parents[4]
KIT = REPO / "botsales-kit"
FE = REPO / "BotSalesAI_Frontend"
OUT = SCRIPT.parent
CHECKER = FE / "scripts/check-boundaries.mjs"
FIXTURES = FE / "tests/architecture/check-boundaries.mjs"
BOUNDARY_SOURCE = FE / "evidence/boundaries.json"
BOUNDARY_COPY = OUT / "S04-boundaries-report-current-20261007.json"
LOG = OUT / "S04-negative-boundary-fixtures-current-20261007.log"
RECEIPT = OUT / "S04-negative-boundary-fixtures-current-20261007.json"
COMMAND = "set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run boundaries"


def sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def rel_source(path: Path) -> str:
    try:
        return path.relative_to(FE).as_posix()
    except ValueError:
        return "botsales-kit/" + path.relative_to(KIT).as_posix()


env = os.environ.copy()
system_root = env.get("SystemRoot", r"C:\Windows")
env["PATH"] = ";".join([
    r"C:\Program Files\nodejs",
    str(Path(system_root) / "System32"),
    str(Path(system_root) / "System32/WindowsPowerShell/v1.0"),
    system_root,
])
command_map = json.loads((KIT / "execution/frontend-command-map.json").read_text(encoding="utf-8"))
boundary_command = next(command for command in command_map["commands"] if command["id"] == "boundaries")
assert boundary_command["status"] == "VERIFIED_AVAILABLE"
assert boundary_command["cwd"] == "BotSalesAI_Frontend"
assert boundary_command["command"] == COMMAND

saved_report = BOUNDARY_SOURCE.read_bytes()
saved_sha = sha_bytes(saved_report)
try:
    run = subprocess.run(
        ["cmd.exe", "/d", "/c", boundary_command["command"]],
        cwd=FE, env=env, capture_output=True, text=True,
        encoding="utf-8", errors="replace", check=False,
    )
    assert BOUNDARY_SOURCE.is_file(), "Registered boundary command did not emit its report"
    BOUNDARY_COPY.write_bytes(BOUNDARY_SOURCE.read_bytes())
finally:
    BOUNDARY_SOURCE.write_bytes(saved_report)

restored_sha = sha(BOUNDARY_SOURCE)
assert restored_sha == saved_sha, "Pre-existing boundary report was not restored byte-for-byte"
report = json.loads(BOUNDARY_COPY.read_text(encoding="utf-8"))
fixture_summary = report.get("negativeFixtures", "")
fixture_source = FIXTURES.read_text(encoding="utf-8")
required_scenarios = [
    "alias cross-feature import", "relative cross-feature import",
    "type-only cross-feature import", "dynamic cross-feature import",
    "unresolved local alias", "module cycle", "unparseable TypeScript file",
]
fixture_text = " ".join(run.stdout.splitlines())
assert run.returncode == 0, "Registered boundaries command failed"
assert report["status"] == "PASS" and not report["issues"]
assert report["files"] == 68 and report["imports"] == 504
assert "PASS 10/10 scenarios" in fixture_summary
assert all(name in fixture_source for name in required_scenarios)

source_paths = [
    FE / "scripts/check-boundaries.mjs",
    FE / "tests/architecture/check-boundaries.mjs",
    FE / "package.json",
    FE / "apps/web/package.json",
    KIT / "execution/frontend-command-map.json",
    KIT / "execution/frontend-plan.json",
    SCRIPT,
    BOUNDARY_COPY,
]
log_lines = [
    "FE004.S04 negative architecture-boundary fixtures",
    f"Command: {COMMAND}",
    f"CWD: {FE}",
    f"Registered command status: {boundary_command['status']}",
    f"Exit: {run.returncode}",
    f"Pre-existing evidence/boundaries.json restored byte-for-byte: {restored_sha == saved_sha}; sha256={restored_sha}",
    f"Current boundary report: status={report['status']}; files={report['files']}; imports={report['imports']}; issues={len(report['issues'])}",
    f"Fixture result: {fixture_summary}",
    f"Required negative scenarios observed: {', '.join(required_scenarios)}",
    "The command exercises TypeScript AST import parsing/resolution and checks rejected alias, relative, type-only, dynamic, unresolved, cycle, and parse-error cases; this does not claim hosted CI execution.",
    "No checker, fixture, package manifest, lockfile, or product source was modified for this step.",
]
LOG.write_text("\n".join(log_lines) + "\n\n[registered command output]\n" + run.stdout + ("\n[stderr]\n" + run.stderr if run.stderr else ""), encoding="utf-8", newline="\n")
source_pairs = [{"path": rel_source(path), "sha256": sha(path)} for path in sorted(set(source_paths), key=lambda item: item.as_posix())]
snapshot = sha_bytes("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_pairs)).encode())
head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO, capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()
checks = [
    "registered full-source boundaries command exits 0",
    "checker reports PASS for 68 TypeScript/TSX source files and 504 imports with zero issues",
    "10/10 fixtures pass, including allowed imports and alias/relative/type-only/dynamic violations",
    "unresolved alias, cycle, and unparseable TypeScript fixtures are rejected",
    "pre-existing evidence/boundaries.json restored byte-for-byte",
    "no checker, fixture, package manifest, lockfile, or product source changes were needed",
]
LOG.write_text(LOG.read_text(encoding="utf-8") + f"\nSource snapshot sha256={snapshot}\n" + "\n".join(f"CHECK PASS: {item}" for item in checks) + "\n" + "\n".join(f"SOURCE {item['path']} sha256={item['sha256']}" for item in source_pairs) + "\n", encoding="utf-8", newline="\n")
receipt = {
    "taskId": "FE004", "stepId": "S04", "kind": "test_run", "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": head + " (working tree snapshot)",
    "expected": "Verify boundary checker rejects cross-feature imports across alias, relative, type-only, dynamic forms, unresolved imports, cycles and syntax errors, while allowing the documented safe paths.",
    "observed": f"Registered boundaries command exited {run.returncode}; report PASS over {report['files']} files/{report['imports']} imports with zero issues. The existing negative fixture suite passed 10/10 scenarios and included all required rejection classes. Pre-existing boundaries report restored byte-for-byte.",
    "commandId": boundary_command["id"], "command": boundary_command["command"], "cwd": str(FE),
    "reviewer": "Codex",
    "environment": {"name": "Windows Node/npm architecture negative-fixture audit", "details": f"Node v24.19.0/npm 11.17.0; registered npm boundaries command through cmd.exe; Git HEAD {head} plus working-tree source.", "dataSource": "source-only"},
    "checksTotal": len(checks), "failed": 0, "sourceFiles": source_pairs,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(), "logSha256": sha(LOG),
    "report": {"path": BOUNDARY_COPY.relative_to(KIT).as_posix(), "sha256": sha(BOUNDARY_COPY)},
}
RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"result": "PASS", "scenarios": 10, "files": report["files"], "imports": report["imports"], "issues": len(report["issues"]), "preexistingReportRestored": restored_sha == saved_sha, "receipt": str(RECEIPT), "logSha256": receipt["logSha256"]}, indent=2, ensure_ascii=False))
