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
SOURCE_REPORT = FE / "evidence/source-check.json"
BOUNDARY_REPORT = FE / "evidence/boundaries.json"
SOURCE_COPY = OUT / "S05-source-check-report-current-20261007.json"
BOUNDARY_COPY = OUT / "S05-boundaries-report-current-20261007.json"
RECEIPT = OUT / "S05-final-frontend-gates-current-20261007.json"
LOG = OUT / "S05-final-frontend-gates-current-20261007.log"


def sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def rel_source(path: Path) -> str:
    try:
        return path.relative_to(FE).as_posix()
    except ValueError:
        return "botsales-kit/" + path.relative_to(KIT).as_posix()


command_map = json.loads((KIT / "execution/frontend-command-map.json").read_text(encoding="utf-8"))
commands = {item["id"]: item for item in command_map["commands"]}
ordered_ids = ["source", "boundaries", "lint", "types"]
assert all(commands[name]["status"] == "VERIFIED_AVAILABLE" for name in ordered_ids)
assert all(commands[name]["cwd"] == "BotSalesAI_Frontend" for name in ordered_ids)

saved = {SOURCE_REPORT: SOURCE_REPORT.read_bytes(), BOUNDARY_REPORT: BOUNDARY_REPORT.read_bytes()}
saved_hashes = {str(path): sha_bytes(value) for path, value in saved.items()}
system_root = os.environ.get("SystemRoot", r"C:\Windows")
env = os.environ.copy()
env["PATH"] = ";".join([
    r"C:\Program Files\nodejs",
    str(Path(system_root) / "System32"),
    str(Path(system_root) / "System32/WindowsPowerShell/v1.0"),
    system_root,
])
results = []
try:
    for command_id in ordered_ids:
        command = commands[command_id]
        run = subprocess.run(
            ["cmd.exe", "/d", "/c", command["command"]], cwd=FE, env=env,
            capture_output=True, text=True, encoding="utf-8", errors="replace", check=False,
        )
        result = {"id": command_id, "command": command["command"], "exit": run.returncode, "stdout": run.stdout, "stderr": run.stderr}
        results.append(result)
        if command_id == "source" and SOURCE_REPORT.is_file(): SOURCE_COPY.write_bytes(SOURCE_REPORT.read_bytes())
        if command_id == "boundaries" and BOUNDARY_REPORT.is_file(): BOUNDARY_COPY.write_bytes(BOUNDARY_REPORT.read_bytes())
finally:
    for path, contents in saved.items(): path.write_bytes(contents)

restored_hashes = {str(path): sha(path) for path in saved}
assert restored_hashes == saved_hashes, "Pre-existing source/boundary reports were not restored byte-for-byte"
assert len(results) == len(ordered_ids)
failed_commands = [item["id"] for item in results if item["exit"] != 0]
assert SOURCE_COPY.is_file() and BOUNDARY_COPY.is_file(), "One registered checker did not emit its report"
source_report = json.loads(SOURCE_COPY.read_text(encoding="utf-8"))
boundary_report = json.loads(BOUNDARY_COPY.read_text(encoding="utf-8"))
assert not failed_commands, f"Registered gates failed: {failed_commands}"
assert source_report["status"] == "PASS" and not source_report["issues"]
assert source_report["files"] == 68 and source_report["routes"] == 54
assert boundary_report["status"] == "PASS" and not boundary_report["issues"]
assert boundary_report["files"] == 68 and boundary_report["imports"] == 504
assert "PASS 10/10 scenarios" in boundary_report.get("negativeFixtures", "")

log_sections = [
    "FE004.S05 final full-source Frontend gates",
    f"Git HEAD: {subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=REPO, capture_output=True, text=True, encoding='utf-8', check=True).stdout.strip()} (working-tree snapshot)",
    f"Runtime: Node {subprocess.run(['node', '--version'], cwd=FE, env=env, capture_output=True, text=True, encoding='utf-8', check=True).stdout.strip()} / npm {subprocess.run(['npm.cmd', '--version'], cwd=FE, env=env, capture_output=True, text=True, encoding='utf-8', check=True).stdout.strip()}",
    "Order: source checker → boundaries and negative fixtures → full-source lint → strict TypeScript typecheck",
    f"Pre-existing source-check report restored: {restored_hashes[str(SOURCE_REPORT)] == saved_hashes[str(SOURCE_REPORT)]}; sha256={restored_hashes[str(SOURCE_REPORT)]}",
    f"Pre-existing boundary report restored: {restored_hashes[str(BOUNDARY_REPORT)] == saved_hashes[str(BOUNDARY_REPORT)]}; sha256={restored_hashes[str(BOUNDARY_REPORT)]}",
    f"Source report: status={source_report['status']}; files={source_report['files']}; operationCalls={source_report['operationCalls']}; routes={source_report['routes']}; issues={len(source_report['issues'])}",
    f"Boundary report: status={boundary_report['status']}; files={boundary_report['files']}; imports={boundary_report['imports']}; issues={len(boundary_report['issues'])}; fixtures={boundary_report['negativeFixtures']}",
]
for result in results:
    log_sections += [f"\n=== {result['id']} | exit={result['exit']} ===", f"Command: {result['command']}", f"CWD: {FE}", result["stdout"], ("[stderr]\n" + result["stderr"]) if result["stderr"] else ""]

source_paths = [
    *FE.glob("apps/web/src/**/*.ts"), *FE.glob("apps/web/src/**/*.tsx"),
    FE / "scripts/check-source.mjs", FE / "scripts/source-policy.mjs", FE / "scripts/check-boundaries.mjs",
    FE / "tests/source-checker.test.mjs", FE / "tests/architecture/check-boundaries.mjs",
    FE / "eslint.config.mjs", FE / "package.json", FE / "package-lock.json",
    FE / "apps/web/package.json", FE / "apps/web/tsconfig.json",
    FE / "apps/web/public/manifest.webmanifest", FE / "packages/contracts/src/operations.json",
    FE / "packages/contracts/src/permissions.json", FE / "packages/contracts/src/routes.json",
    FE / "packages/design-tokens/src/tokens.json", FE / "docs/route-implementation.json",
    KIT / "execution/frontend-command-map.json", KIT / "execution/frontend-plan.json",
    KIT / "docs/02_ARCHITECTURE.md", KIT / "docs/18_CODING_STANDARDS.md",
    SCRIPT, SOURCE_COPY, BOUNDARY_COPY,
]
source_paths = [path for path in source_paths if path.is_file()]
source_pairs = [{"path": rel_source(path), "sha256": sha(path)} for path in sorted(set(source_paths), key=lambda item: item.as_posix())]
snapshot = sha_bytes("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_pairs)).encode())
checks = [
    "registered source checker exits 0 over current route, permission, operation, and token data",
    "registered AST boundaries checker exits 0 over the complete frontend source graph",
    "10/10 boundary fixtures pass, including alias/relative/type-only/dynamic/cycle/parser cases",
    "registered full-source ESLint exits 0 with zero warnings",
    "registered TypeScript strict typecheck exits 0",
    "source-check and boundaries evidence reports are restored byte-for-byte",
]
log_sections += [f"\nSource snapshot sha256={snapshot}", *[f"CHECK PASS: {item}" for item in checks], *[f"SOURCE {item['path']} sha256={item['sha256']}" for item in source_pairs]]
LOG.write_text("\n".join(log_sections) + "\n", encoding="utf-8", newline="\n")
head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO, capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()
receipt = {
    "taskId": "FE004", "stepId": "S05", "kind": "test_run", "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": head + " (working-tree snapshot)",
    "expected": "Run current full-source source checker, architecture boundaries, lint and strict TypeScript typecheck; review the actual changes and preserve unrelated/pre-existing work.",
    "observed": f"All four registered commands exited 0. Source checker PASS: {source_report['files']} files, {source_report['operationCalls']} operation calls and {source_report['routes']} routes, zero issues. Boundary checker PASS: {boundary_report['files']} files, {boundary_report['imports']} imports, 10/10 negative fixtures, zero issues. ESLint and TypeScript typecheck exited 0. Both pre-existing generated evidence files were restored byte-for-byte. No product-source refactor was justified by these gates; this task only repaired the S03 audit's CSS asset classification and added current evidence helpers.",
    "commandId": "source", "command": commands["source"]["command"], "cwd": str(FE),
    "executedCommands": [{"id": item["id"], "command": item["command"], "exit": item["exit"]} for item in results],
    "reviewer": "Codex",
    "environment": {"name": "Windows full-source Frontend verification", "details": f"Node {sys.version.split()[0]} Python runner; registered Node/npm scripts executed under Node {subprocess.run(['node', '--version'], cwd=FE, env=env, capture_output=True, text=True, encoding='utf-8', check=True).stdout.strip()} and npm {subprocess.run(['npm.cmd', '--version'], cwd=FE, env=env, capture_output=True, text=True, encoding='utf-8', check=True).stdout.strip()}; Git HEAD {head} plus working-tree source.", "dataSource": "source-only"},
    "checksTotal": len(checks), "failed": 0, "sourceFiles": source_pairs,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(), "logSha256": sha(LOG),
    "reports": [
        {"path": SOURCE_COPY.relative_to(KIT).as_posix(), "sha256": sha(SOURCE_COPY)},
        {"path": BOUNDARY_COPY.relative_to(KIT).as_posix(), "sha256": sha(BOUNDARY_COPY)},
    ],
}
RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"result": "PASS", "commands": {item["id"]: item["exit"] for item in results}, "sourceFiles": source_report["files"], "operations": source_report["operationCalls"], "routes": source_report["routes"], "boundaryFiles": boundary_report["files"], "imports": boundary_report["imports"], "negativeFixtures": "PASS 10/10", "preservedReports": restored_hashes == saved_hashes, "receipt": str(RECEIPT), "logSha256": receipt["logSha256"]}, indent=2, ensure_ascii=False))
