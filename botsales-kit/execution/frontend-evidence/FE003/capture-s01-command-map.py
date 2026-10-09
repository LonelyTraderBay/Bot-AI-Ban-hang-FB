"""Reconcile FE003.S01 npm scripts with the registered frontend command map."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
LOG = SCRIPT.with_name("S01-command-map-audit-current-20261007.log")
RECEIPT = SCRIPT.with_name("S01-command-map-audit-current-20261007.json")
COMMAND = "python botsales-kit/execution/frontend-evidence/FE003/capture-s01-command-map.py"

root = json.loads((FRONTEND / "package.json").read_text(encoding="utf-8"))
web = json.loads((FRONTEND / "apps/web/package.json").read_text(encoding="utf-8"))
command_map = json.loads((KIT / "execution/frontend-command-map.json").read_text(encoding="utf-8"))
commands = command_map["commands"]

# `unit` is the Vitest package script named `test`; `demo` is `build:demo`.
targets = {
    "generate": ("generate:check", "generate-check-windows"),
    "source": ("test:source", "source"),
    "boundaries": ("boundaries", "boundaries"),
    "types": ("typecheck", "types"),
    "lint": ("lint", "lint"),
    "domain": ("test:domain", "domain"),
    "unit": ("test", "unit"),
    "build": ("build", "build"),
    "demo": ("build:demo", "build-demo"),
    "e2e": ("test:e2e", "e2e"),
}
rows = []
failures = []
for purpose, (script_name, command_id) in targets.items():
    command = next((item for item in commands if item.get("id") == command_id), None)
    script_body = root["scripts"].get(script_name)
    found = bool(script_body and command and command.get("status") == "VERIFIED_AVAILABLE"
                 and (f"run {script_name}" in command.get("command", "")
                      or (script_name == "test" and command.get("command", "").endswith(" test")))
                 and command.get("cwd") == "BotSalesAI_Frontend")
    row = {"purpose": purpose, "script": script_name, "scriptBody": script_body,
           "commandId": command_id, "command": command.get("command") if command else None,
           "cwd": command.get("cwd") if command else None,
           "status": command.get("status") if command else None, "aligned": found}
    rows.append(row)
    if not found:
        failures.append(f"Mapping mismatch for {purpose}")

pnpm_mentions = [item.get("id") for item in commands if "pnpm" in item.get("command", "").lower()]
if pnpm_mentions:
    failures.append(f"Unexpected pnpm command entries: {pnpm_mentions}")
checks = len(rows) + 2
if len(rows) != 10:
    failures.append(f"Expected 10 mapped command purposes; found {len(rows)}")
if not root["scripts"].get("verify") or not web["scripts"].get("build:demo"):
    failures.append("verify/build:demo scripts missing from actual manifests")

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
lines = [
    "FE003.S01 actual npm script to command-map audit",
    f"Command: {COMMAND}",
    f"CWD: {REPOSITORY}",
    "Exit: 0" if not failures else f"Exit: 1; findings={len(failures)}",
    f"Root package: {root['name']}; app package: {web['name']}; package manager: {root.get('packageManager')}",
    "Purpose | npm script | registered ID | status | aligned",
    *[f"{row['purpose']} | {row['script']} | {row['commandId']} | {row['status']} | {row['aligned']}" for row in rows],
    f"No pnpm command found: {not pnpm_mentions}",
    f"Failure list: {failures}",
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
assert not failures, "\n".join(failures)

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

source_files = []
for relative, path in [
    ("package.json", FRONTEND / "package.json"),
    ("apps/web/package.json", FRONTEND / "apps/web/package.json"),
    ("botsales-kit/execution/frontend-command-map.json", KIT / "execution/frontend-command-map.json"),
    ("botsales-kit/execution/frontend-evidence/FE003/capture-s01-command-map.py", SCRIPT),
]:
    source_files.append({"path": relative, "sha256": digest(path)})
snapshot = hashlib.sha256("\n".join(sorted(f"{x['path']}:{x['sha256']}" for x in source_files)).encode()).hexdigest()
evidence = {
    "taskId": "FE003", "stepId": "S01", "kind": "artifact_review", "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Map the named generate/source/boundaries/types/lint/domain/unit/build/demo/e2e purposes to scripts that exist in the actual npm workspace and registered commands with matching cwd; do not invent pnpm.",
    "observed": f"All {len(rows)} purposes align with actual root package scripts and VERIFIED_AVAILABLE command-map entries; `unit` maps to npm test and `demo` to build:demo; no pnpm entries. Audit process exited 0.",
    "command": COMMAND, "reviewer": "Codex",
    "environment": {"name": "Windows source and command-map audit", "details": f"Read-only JSON audit at repository revision {head}; cwd is repository root; no product command was represented as run by this audit.", "dataSource": "source-only"},
    "checksTotal": checks, "failed": 0, "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(), "logSha256": digest(LOG),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: mapped {len(rows)} frontend command purposes; no pnpm; receipt={RECEIPT.relative_to(REPOSITORY).as_posix()}")
