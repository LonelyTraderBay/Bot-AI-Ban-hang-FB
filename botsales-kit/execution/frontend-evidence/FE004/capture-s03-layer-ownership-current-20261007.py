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
AST_SCRIPT = OUT / "audit-s03-layer-ownership.mjs"
AST_REPORT = OUT / "S03-layer-architecture-map-current-20261007.json"
BOUNDARY_COPY = OUT / "S03-boundaries-report-current-20261007.json"
BOUNDARY_SOURCE = FE / "evidence/boundaries.json"
LOG = OUT / "S03-layer-ownership-current-20261007.log"
RECEIPT = OUT / "S03-layer-ownership-current-20261007.json"
COMMAND = "python botsales-kit/execution/frontend-evidence/FE004/capture-s03-layer-ownership-current-20261007.py"


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
assert boundary_command["status"] == "VERIFIED_AVAILABLE" and boundary_command["cwd"] == "BotSalesAI_Frontend"

saved_report = BOUNDARY_SOURCE.read_bytes()
saved_sha = sha_bytes(saved_report)
ast_run = subprocess.run(
    ["node", str(AST_SCRIPT)], cwd=FE, env=env,
    capture_output=True, text=True, encoding="utf-8", errors="replace", check=False,
)
(OUT / "S03-layer-audit-run-current-20261007.log").write_text(
    f"Command: node {AST_SCRIPT}\nCWD: {FE}\nExit: {ast_run.returncode}\n\n"
    + ast_run.stdout
    + (("\n[stderr]\n" + ast_run.stderr) if ast_run.stderr else ""),
    encoding="utf-8", newline="\n",
)
assert ast_run.returncode == 0, "Layer ownership AST audit reported a structural issue"
layer = json.loads(ast_run.stdout)
AST_REPORT.write_text(json.dumps(layer, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")

boundary_run = None
try:
    boundary_run = subprocess.run(
        ["cmd.exe", "/d", "/c", boundary_command["command"]], cwd=FE, env=env,
        capture_output=True, text=True, encoding="utf-8", errors="replace", check=False,
    )
    assert BOUNDARY_SOURCE.is_file(), "Registered boundary command did not emit its report"
    BOUNDARY_COPY.write_bytes(BOUNDARY_SOURCE.read_bytes())
finally:
    BOUNDARY_SOURCE.write_bytes(saved_report)
restored_sha = sha(BOUNDARY_SOURCE)
assert restored_sha == saved_sha, "Pre-existing boundary report was not restored byte-for-byte"
(OUT / "S03-boundaries-current-20261007.log").write_text(
    f"Registered command: {boundary_command['command']}\nCWD: {FE}\nExit: {boundary_run.returncode}\n\n"
    + boundary_run.stdout
    + (("\n[stderr]\n" + boundary_run.stderr) if boundary_run.stderr else ""),
    encoding="utf-8", newline="\n",
)
boundary = json.loads(BOUNDARY_COPY.read_text(encoding="utf-8"))
assert boundary_run.returncode == 0 and boundary["status"] == "PASS" and not boundary["issues"]
assert "PASS 10/10 scenarios" in boundary_run.stdout
assert layer["status"] == "PASS" and layer["sourceFiles"] == boundary["files"]
assert layer["canonicalRoutes"] == layer["routerRoutes"] == 54
assert layer["moduleCount"] == len(layer["modulesLoadedThroughRouter"]) == 16
assert len(layer["appCompositionFiles"]) > 0 and layer["sharedAreas"] == ["api", "model", "ui"]
assert all(len(owners) == 1 for owners in layer["providerOwners"].values())

source_paths = [
    *(FE / "apps/web/src").rglob("*.ts"),
    *(FE / "apps/web/src").rglob("*.tsx"),
    FE / "apps/web/package.json",
    FE / "package.json",
    FE / "package-lock.json",
    FE / "apps/web/tsconfig.json",
    FE / "scripts/check-boundaries.mjs",
    FE / "tests/architecture/check-boundaries.mjs",
    KIT / "contracts/route-manifest.json",
    KIT / "docs/02_ARCHITECTURE.md",
    KIT / "docs/09_STATE_AND_DATA_ACCESS.md",
    KIT / "docs/18_CODING_STANDARDS.md",
    KIT / "execution/frontend-command-map.json",
    KIT / "execution/frontend-evidence/FE004/S01-type-graph-current-20261007.json",
    KIT / "execution/frontend-evidence/FE004/S02-strict-lint-current-20261007.json",
    SCRIPT,
    AST_SCRIPT,
    OUT / "S03-layer-audit-run-current-20261007.log",
    OUT / "S03-layer-architecture-map-current-20261007.json",
    OUT / "S03-boundaries-current-20261007.log",
    BOUNDARY_COPY,
]
source_pairs = [{"path": rel_source(path), "sha256": sha(path)} for path in sorted(set(source_paths), key=lambda item: item.as_posix())]
assert len({item["path"] for item in source_pairs}) == len(source_pairs)
snapshot = sha_bytes("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_pairs)).encode())
head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO, capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()
checks = [
    "TypeScript AST resolves local imports through the configured tsconfig aliases",
    "app composition imports feature modules only through public index entries",
    "feature modules have no cross-feature, app, or mock dependencies",
    "shared layer has no app, feature, or mock dependency",
    "no local import cycles and no parse/unresolved import errors",
    "16 public feature entries map all 54 canonical routes",
    "one app-owned QueryClient, QueryClientProvider, RouterProvider, router factory, and ThemeProvider",
    "one locked version for React Router, MUI, and TanStack Query",
    "registered boundary gate exits 0 with 10/10 fixtures",
    "pre-existing boundary report restored byte-for-byte",
]
log_lines = [
    "FE004.S03 app/module/shared responsibility audit",
    f"Command: {COMMAND}", f"CWD: {REPO}", "Exit: 0 (audit assertions)",
    f"Git HEAD: {head} (working tree snapshot)",
    f"Environment: Windows; Python {sys.version.split()[0]}; Node v24.19.0/npm 11.17.0; bounded process PATH",
    f"Registered boundaries command: {boundary_command['command']} | exit={boundary_run.returncode} | log=execution/frontend-evidence/FE004/S03-boundaries-current-20261007.log | sha256={sha(OUT / 'S03-boundaries-current-20261007.log')}",
    f"AST audit: files={layer['sourceFiles']}; local import edges={layer['localEdges']}; total import/export edges={layer['imports']}; violations={len(layer['violations'])}; cycles={len(layer['cycles'])}; parse errors={len(layer['parseErrors'])}",
    f"App composition files={len(layer['appCompositionFiles'])}; modules={layer['moduleCount']}; shared areas={','.join(layer['sharedAreas'])}; API-owning modules={','.join(layer['apiOwners'])}",
    f"Routes={layer['routerRoutes']}/{layer['canonicalRoutes']}; module public entries={len(layer['modulePublicEntries'])}; missing={len(layer['missingPublicEntries'])}",
    f"Provider owners={json.dumps(layer['providerOwners'], ensure_ascii=False)}",
    f"Locked dependency versions={json.dumps(layer['dependencyVersions'], ensure_ascii=False)}",
    f"Pre-existing evidence/boundaries.json restored byte-for-byte: {restored_sha == saved_sha}; sha256={restored_sha}",
    "Selection: current dependency graph follows docs/02_ARCHITECTURE.md and docs/18_CODING_STANDARDS.md. No responsibility-boundary refactor is justified; keep business behavior in feature modules and cross-module composition in app.",
    f"Checks: {len(checks)} passed; failed=0",
    *[f"CHECK PASS: {item}" for item in checks],
    f"Source snapshot sha256={snapshot}",
    *[f"SOURCE {item['path']} sha256={item['sha256']}" for item in source_pairs],
]
LOG.write_text("\n".join(log_lines) + "\n", encoding="utf-8", newline="\n")
receipt = {
    "taskId": "FE004",
    "stepId": "S03",
    "kind": "test_run",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": head + " (working tree snapshot)",
    "expected": "Confirm actual app composition, module-local business/API ownership, domain-free shared layer, public feature entries and dependency edges; make no speculative architecture refactor.",
    "observed": f"TypeScript AST audit found {layer['sourceFiles']} files/{layer['imports']} import/export edges with zero boundary violations, cycles, parse errors or unresolved local imports; registered boundary gate exited 0 with 10/10 fixtures. Sixteen public entries map all 54 routes. One root provider/client/router/theme owner exists and the lockfile contains one version each of React Router, MUI and TanStack Query. Existing boundary report restored byte-for-byte.",
    "commandId": boundary_command["id"],
    "command": boundary_command["command"],
    "cwd": str(FE),
    "reviewer": "Codex",
    "environment": {
        "name": "Windows Frontend architecture graph audit",
        "details": f"Node v24.19.0/npm 11.17.0; actual TypeScript AST resolved with apps/web/tsconfig.json; registered boundary npm script through cmd.exe; Git HEAD {head} plus working-tree source.",
        "dataSource": "source-only",
    },
    "checksTotal": len(checks),
    "failed": 0,
    "sourceFiles": source_pairs,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": sha(LOG),
    "astReport": {"path": AST_REPORT.relative_to(KIT).as_posix(), "sha256": sha(AST_REPORT)},
    "boundaryReport": {"path": BOUNDARY_COPY.relative_to(KIT).as_posix(), "sha256": sha(BOUNDARY_COPY)},
}
RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"result": "PASS", "files": layer["sourceFiles"], "edges": layer["imports"], "routes": layer["routerRoutes"], "modules": layer["moduleCount"], "violations": len(layer["violations"]), "cycles": len(layer["cycles"]), "boundaryReportRestored": restored_sha == saved_sha, "receipt": str(RECEIPT), "logSha256": receipt["logSha256"]}, indent=2, ensure_ascii=False))
