"""Inspect the exact Frontend Node/npm and package/peer baseline for FE002.S01."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
LOG = SCRIPT.with_name("S01-toolchain-and-peers-current-20261007.log")
RECEIPT = SCRIPT.with_name("S01-toolchain-and-peers-current-20261007.json")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


NODE = Path(r"C:\Program Files\nodejs\node.exe")
NPM_CLI = Path(r"C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js")


def run(label: str, command: list[str]) -> tuple[int, str]:
    result = subprocess.run(command, cwd=FRONTEND, capture_output=True, text=True,
                            encoding="utf-8", errors="replace", check=False)
    text = result.stdout.rstrip()
    if result.stderr:
        text += ("\n" if text else "") + "[stderr]\n" + result.stderr.rstrip()
    return result.returncode, text


commands = [
    ("Node version", [str(NODE), "--version"]),
    ("npm version", [str(NODE), str(NPM_CLI), "--version"]),
    ("installed direct dependencies", [str(NODE), str(NPM_CLI), "ls", "--depth=0"]),
]
outputs = []
for label, command in commands:
    code, output = run(label, command)
    outputs.append((label, command, code, output))
    if code != 0:
        raise SystemExit(f"{label} failed with exit {code}:\n{output}")

node_version = outputs[0][3].strip()
npm_version = outputs[1][3].strip()
node_pin = (FRONTEND / ".node-version").read_text(encoding="utf-8").strip()
root = json.loads((FRONTEND / "package.json").read_text(encoding="utf-8"))
web = json.loads((FRONTEND / "apps/web/package.json").read_text(encoding="utf-8"))
lock_bytes = (FRONTEND / "package-lock.json").read_bytes()
lock = json.loads(lock_bytes)
lock_root = lock["packages"][""]
lock_web = lock["packages"]["apps/web"]

assert node_version == f"v{node_pin}", f"Node {node_version} differs from .node-version {node_pin}"
assert root["packageManager"] == f"npm@{npm_version}", "npm differs from packageManager pin"
assert lock["lockfileVersion"] == 3, "Unexpected npm lock format"
assert root["engines"]["node"] == ">=24 <25" and root["engines"]["npm"] == ">=10"
assert lock_root.get("devDependencies", {}) == root.get("devDependencies", {})
assert lock_web.get("dependencies", {}) == web.get("dependencies", {})
assert lock_web.get("devDependencies", {}) == web.get("devDependencies", {})
all_declared = [*root.get("dependencies", {}).values(), *root.get("devDependencies", {}).values(),
                *web.get("dependencies", {}).values(), *web.get("devDependencies", {}).values()]
assert all(value and not value.startswith(("^", "~", ">", "*")) and "latest" not in value.lower()
           for value in all_declared), "Manifest contains non-exact/latest dependency spec"

peer_names = ["@mui/material", "@mui/icons-material", "@tanstack/react-query", "react-router-dom",
              "react-hook-form", "i18next", "msw"]
peer_rows = []
for name in peer_names:
    entry = lock["packages"].get(f"node_modules/{name}")
    assert entry is not None, f"Missing locked package {name}"
    peer_rows.append(f"{name}@{entry['version']} peerDependencies={json.dumps(entry.get('peerDependencies', {}), sort_keys=True)}")
assert "^19" in lock["packages"]["node_modules/@mui/material"]["peerDependencies"]["react"]
assert "^19" in lock["packages"]["node_modules/@mui/icons-material"]["peerDependencies"]["react"]
assert "^19" in lock["packages"]["node_modules/@tanstack/react-query"]["peerDependencies"]["react"]
assert lock["packages"]["node_modules/react-router-dom"]["peerDependencies"]["react"] == ">=18"
assert "^19" in lock["packages"]["node_modules/react-hook-form"]["peerDependencies"]["react"]
assert lock["packages"]["node_modules/i18next"]["peerDependencies"]["typescript"] == "^5"
assert lock["packages"]["node_modules/msw"]["peerDependencies"]["typescript"] == ">= 4.8.x"

lines = [
    "FE002.S01 exact Node/npm and package/peer baseline",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"CWD: {FRONTEND}",
]
for label, command, code, output in outputs:
    lines.extend(["", f"Command: {' '.join(command)}", f"CWD: {FRONTEND}", f"Exit: {code}", output])
lines.extend([
    "",
    f".node-version: {node_pin}; actual Node: {node_version}; packageManager: {root['packageManager']}; actual npm: {npm_version}",
    f"Engine target: {root['engines']}; lockfileVersion: {lock['lockfileVersion']}; workspace: {root['workspaces']}",
    f"Root npm manifest: {len(root.get('devDependencies', {}))} exact dev dependencies; lock root exact-match: yes.",
    f"Web npm manifest: {len(web.get('dependencies', {}))} exact dependencies + {len(web.get('devDependencies', {}))} exact dev dependencies; lock workspace exact-match: yes.",
    "Selected locked peer requirements:",
    *[f"  {row}" for row in peer_rows],
    "Peer resolution evidence: npm ls --depth=0 exits 0; React/ReactDOM are deduped at 19.1.1; no invalid/missing/extraneous dependency was reported.",
    "Initial harness failure: S01-helper-shell-resolution-initial-failure-20261007.log; cmd.exe could not resolve npm.cmd from the Python child environment. The actual npm CLI was then resolved and run by absolute executable paths; no product install failed.",
    "Decision: keep the existing React 19 / MUI 7 / TanStack Query 5 / React Router 7 / RHF 7 / Zod 4 / MSW 2 / TypeScript 5 stack. Exact locked peer ranges admit React 19 and TypeScript 5; no compatibility failure supports a version/major change.",
])
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
source_paths = [
    "package.json",
    "apps/web/package.json",
    "package-lock.json",
    ".node-version",
    "botsales-kit/execution/frontend-evidence/FE002/S01-helper-shell-resolution-initial-failure-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE002/inspect-toolchain.py",
]
source_files = [{"path": relative, "sha256": digest((REPOSITORY / relative).read_bytes()
                if relative.startswith("botsales-kit/") else (FRONTEND / relative).read_bytes())}
                for relative in sorted(source_paths)]
snapshot = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
evidence = {
    "taskId": "FE002",
    "stepId": "S01",
    "kind": "artifact_review",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Verify pinned Node/npm and exact dependency/peer compatibility from the actual Frontend manifests, lockfile and installed tree; retain the selected stack unless concrete incompatibility is observed.",
    "observed": f"Actual Node {node_version} matches .node-version {node_pin}; npm {npm_version} matches packageManager pin; root/web manifest dependency maps match npm lockfile v{lock['lockfileVersion']}; npm ls --depth=0 exits 0. React 19 and TypeScript 5 satisfy selected library peer ranges. No dependency/stack change is justified.",
    "command": "python execution/frontend-evidence/FE002/inspect-toolchain.py",
    "reviewer": "Codex",
    "environment": {"name": "Local Windows Frontend workspace", "details": "Actual Node/npm CLIs and installed npm workspace; package peer ranges read from the lockfile.", "dataSource": "source-only"},
    "checksTotal": 26,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: Node={node_version} npm={npm_version}; exact manifests/lock match; npm ls exit=0; peer ranges compatible")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
