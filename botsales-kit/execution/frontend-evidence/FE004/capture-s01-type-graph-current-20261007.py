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
LOG = OUT / "S01-type-graph-current-20261007.log"
RECEIPT = OUT / "S01-type-graph-current-20261007.json"
GENERATED_BOUNDARIES = OUT / "S01-boundaries-report-current-20261007.json"
WORKTREE_BOUNDARIES = FE / "evidence/boundaries.json"
COMMAND = "python botsales-kit/execution/frontend-evidence/FE004/capture-s01-type-graph-current-20261007.py"


def sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def snapshot_sources() -> list[Path]:
    runtime = sorted(
        path for path in (FE / "apps/web/src").rglob("*")
        if path.is_file() and path.suffix in {".ts", ".tsx"}
    )
    fixed = [
        FE / "package.json",
        FE / "package-lock.json",
        FE / "apps/web/package.json",
        FE / "apps/web/tsconfig.json",
        FE / "scripts/check-boundaries.mjs",
        FE / "tests/architecture/check-boundaries.mjs",
        FE / "apps/web/src/app/router.tsx",
        KIT / "execution/frontend-command-map.json",
        KIT / "contracts/route-manifest.json",
    ]
    return sorted(set([*runtime, *fixed]), key=lambda path: path.as_posix())


def relative_source(path: Path) -> str:
    try:
        return path.relative_to(FE).as_posix()
    except ValueError:
        return "botsales-kit/" + path.relative_to(KIT).as_posix()


def source_pairs(paths: list[Path]) -> list[dict[str, str]]:
    return [{"path": relative_source(path), "sha256": sha_file(path)} for path in paths]


def run_registered(command: str, cwd: Path, env: dict[str, str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["cmd.exe", "/d", "/c", command], cwd=cwd, env=env,
        capture_output=True, text=True, encoding="utf-8", errors="replace", check=False,
    )


command_map = json.loads((KIT / "execution/frontend-command-map.json").read_text(encoding="utf-8"))
typecheck = next(command for command in command_map["commands"] if command["id"] == "types")
boundaries_command = next(command for command in command_map["commands"] if command["id"] == "boundaries")
assert typecheck["status"] == boundaries_command["status"] == "VERIFIED_AVAILABLE"
assert typecheck["cwd"] == boundaries_command["cwd"] == "BotSalesAI_Frontend"

saved_report = WORKTREE_BOUNDARIES.read_bytes()
saved_report_sha = sha_bytes(saved_report)
before_sources = snapshot_sources()
before_pairs = source_pairs(before_sources)
before_runtime_sha = sha_bytes("\n".join(f"{item['path']}:{item['sha256']}" for item in before_pairs).encode())
env = os.environ.copy()
system_root = env.get("SystemRoot", r"C:\Windows")
env["PATH"] = ";".join([
    r"C:\Program Files\nodejs",
    str(Path(system_root) / "System32"),
    str(Path(system_root) / "System32/WindowsPowerShell/v1.0"),
    system_root,
])

type_result = run_registered(typecheck["command"], FE, env)
type_log_path = OUT / "S01-typecheck-current-20261007.log"
type_log_path.write_text(
    f"Registered command: {typecheck['command']}\nCWD: {FE}\nExit: {type_result.returncode}\n\n"
    + type_result.stdout
    + (("\n[stderr]\n" + type_result.stderr) if type_result.stderr else ""),
    encoding="utf-8", newline="\n",
)

boundary_result = None
try:
    boundary_result = run_registered(boundaries_command["command"], FE, env)
    if WORKTREE_BOUNDARIES.is_file():
        GENERATED_BOUNDARIES.write_bytes(WORKTREE_BOUNDARIES.read_bytes())
    else:
        raise AssertionError("Boundary checker did not emit its configured report")
finally:
    WORKTREE_BOUNDARIES.write_bytes(saved_report)

restored_sha = sha_file(WORKTREE_BOUNDARIES)
assert restored_sha == saved_report_sha, "Pre-existing evidence/boundaries.json was not restored byte-for-byte"
boundary_log_path = OUT / "S01-boundaries-current-20261007.log"
boundary_log_path.write_text(
    f"Registered command: {boundaries_command['command']}\nCWD: {FE}\nExit: {boundary_result.returncode}\n\n"
    + boundary_result.stdout
    + (("\n[stderr]\n" + boundary_result.stderr) if boundary_result.stderr else ""),
    encoding="utf-8", newline="\n",
)

generated = json.loads(GENERATED_BOUNDARIES.read_text(encoding="utf-8"))
assert type_result.returncode == 0, "Full TypeScript check did not pass; preserve the failure and do not record this diagnostic as PASS"
assert boundary_result.returncode == 0 and generated["status"] == "PASS" and not generated["issues"]
assert "PASS 10/10 scenarios" in boundary_result.stdout

route_manifest = json.loads((KIT / "contracts/route-manifest.json").read_text(encoding="utf-8"))
router = (FE / "apps/web/src/app/router.tsx").read_text(encoding="utf-8")
module_root = FE / "apps/web/src/modules"
modules = sorted(path for path in module_root.iterdir() if path.is_dir())
entries = [path / "index.tsx" for path in modules]
assert all(path.is_file() for path in entries)
route_ids = [route["id"] for route in route_manifest["routes"]]
mapped_route_ids = list(dict.fromkeys(__import__("re").findall(r"^\s+(R\d+):\s+[A-Za-z_$][\w$]*,", router, __import__("re").M)))
lazy_entries = set(__import__("re").findall(r"import\(['\"]\.\.\/modules\/([^'\"]+)['\"]\)", router))
deep_entries = [value for value in __import__("re").findall(r"import\(['\"]\.\.\/modules\/([^'\"]+)['\"]\)", router) if "/" in value]
assert len(route_ids) == 54 and set(route_ids) == set(mapped_route_ids)
assert len(modules) == 16 and {path.name for path in modules} == lazy_entries
assert not deep_entries

after_sources = snapshot_sources()
source_files = source_pairs(after_sources)
after_runtime_sha = sha_bytes("\n".join(f"{item['path']}:{item['sha256']}" for item in source_files).encode())
assert before_runtime_sha == after_runtime_sha, "Runtime/package source changed during the read-only S01 audit"
source_files.extend([
    {"path": "botsales-kit/execution/frontend-evidence/FE004/capture-s01-type-graph-current-20261007.py", "sha256": sha_file(SCRIPT)},
    {"path": "botsales-kit/execution/frontend-evidence/FE004/S01-typecheck-current-20261007.log", "sha256": sha_file(type_log_path)},
    {"path": "botsales-kit/execution/frontend-evidence/FE004/S01-boundaries-current-20261007.log", "sha256": sha_file(boundary_log_path)},
    {"path": "botsales-kit/execution/frontend-evidence/FE004/S01-boundaries-report-current-20261007.json", "sha256": sha_file(GENERATED_BOUNDARIES)},
])
source_files.sort(key=lambda item: item["path"])
assert len({item["path"] for item in source_files}) == len(source_files)
snapshot_sha = sha_bytes("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO, capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()
checks = [
    "registered typecheck ran with exit 0",
    "registered AST boundary gate ran with exit 0 and 10/10 negative fixtures",
    "all canonical routes map to current router entries",
    "all feature folders expose index.tsx and router uses their public lazy entries",
    "boundary gate reports zero issues and cycles",
    "runtime/package source fingerprints stayed unchanged during audit",
    "pre-existing boundary evidence was restored byte-for-byte",
]
log_lines = [
    "FE004.S01 current TypeScript and module graph audit",
    f"Command: {COMMAND}",
    f"CWD: {REPO}",
    "Exit: 0 (audit assertions)",
    f"Git HEAD: {head} (working tree snapshot)",
    f"Environment: Windows; Python {sys.version.split()[0]}; Node v24.19.0; npm 11.17.0; process-local bounded PATH",
    f"Typecheck registered command: {typecheck['command']} | exit={type_result.returncode} | log=execution/frontend-evidence/FE004/S01-typecheck-current-20261007.log | sha256={sha_file(type_log_path)}",
    f"Boundaries registered command: {boundaries_command['command']} | exit={boundary_result.returncode} | log=execution/frontend-evidence/FE004/S01-boundaries-current-20261007.log | sha256={sha_file(boundary_log_path)}",
    f"Boundary report: files={generated['files']}; imports={generated['imports']}; issues={len(generated['issues'])}; fixtures={generated['negativeFixtures']}",
    f"Feature modules={len(modules)}; public index entries={len(entries)}; canonical routes={len(route_ids)}; mapped={len(mapped_route_ids)}; deep app imports={len(deep_entries)}",
    f"Pre-existing evidence/boundaries.json restored: {restored_sha == saved_report_sha}; sha256={restored_sha}",
    "Selection: no current TypeScript or module-boundary failure was observed, so S01 identifies no speculative code edit. Keep strict/noUncheckedIndexedAccess; later steps will verify lint, fixtures, public entries and full-source gates against their own requirements.",
    f"Checks: {len(checks)} passed; failed=0",
    *[f"CHECK PASS: {item}" for item in checks],
    f"Source snapshot sha256={snapshot_sha}",
    *[f"SOURCE {item['path']} sha256={item['sha256']}" for item in source_files],
]
LOG.write_text("\n".join(log_lines) + "\n", encoding="utf-8", newline="\n")

receipt = {
    "taskId": "FE004",
    "stepId": "S01",
    "kind": "test_run",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": head + " (working tree snapshot)",
    "expected": "Run the full strict TypeScript check and actual import-boundary graph, inspect the current feature public entries and router map, and select only evidence-backed fixes without changing unrelated source.",
    "observed": f"Registered typecheck exited {type_result.returncode}; boundaries exited {boundary_result.returncode} with {generated['files']} TypeScript/TSX files, {generated['imports']} import edges, zero issues and 10/10 fixtures. {len(modules)} feature entries map to all {len(route_ids)} canonical routes with no deep router imports. No current failure justifies a speculative code change. Existing evidence/boundaries.json was restored byte-for-byte.",
    "commandId": "types",
    "command": typecheck["command"],
    "cwd": str(FE),
    "reviewer": "Codex",
    "environment": {
        "name": "Windows Node/npm Frontend source audit",
        "details": f"Node v24.19.0/npm 11.17.0; registered package scripts invoked through cmd.exe with process-local bounded PATH; current Git HEAD {head} plus working-tree source.",
        "dataSource": "source-only",
    },
    "checksTotal": len(checks),
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot_sha,
    "commands": [
        {"commandId": typecheck["id"], "command": typecheck["command"], "exitCode": type_result.returncode, "logFile": type_log_path.relative_to(KIT).as_posix(), "logSha256": sha_file(type_log_path)},
        {"commandId": boundaries_command["id"], "command": boundaries_command["command"], "exitCode": boundary_result.returncode, "logFile": boundary_log_path.relative_to(KIT).as_posix(), "logSha256": sha_file(boundary_log_path)},
    ],
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": sha_file(LOG),
}
RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"result": "PASS", "checks": checks, "boundaryFiles": generated["files"], "imports": generated["imports"], "routes": len(route_ids), "modules": len(modules), "boundaryReportRestored": restored_sha == saved_report_sha, "receipt": str(RECEIPT), "log": str(LOG), "logSha256": receipt["logSha256"]}, indent=2, ensure_ascii=False))
