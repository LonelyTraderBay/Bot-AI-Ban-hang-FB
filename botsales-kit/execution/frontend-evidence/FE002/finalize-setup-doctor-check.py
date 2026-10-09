"""Verify setup/doctor results and ensure only intended generated worker state changed."""
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
SNAPSHOT_PATH = SCRIPT.with_name("S04-before-setup-snapshot-current-20261007.json")
SETUP_LOG = SCRIPT.with_name("S04-setup-output-current-20261007.log")
DOCTOR_LOG = SCRIPT.with_name("S04-doctor-output-current-20261007.log")
LOG = SCRIPT.with_name("S04-setup-doctor-verified-current-20261007.log")
RECEIPT = SCRIPT.with_name("S04-setup-doctor-verified-current-20261007.json")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
setup_text = SETUP_LOG.read_text(encoding="utf-8", errors="replace")
doctor_text = DOCTOR_LOG.read_text(encoding="utf-8", errors="replace")
assert "COMMAND_EXIT_CODE=0" in setup_text and '"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54' in setup_text
assert "Worker script successfully copied!" in setup_text and "Thiết lập xong." in setup_text
assert "COMMAND_EXIT_CODE=0" in doctor_text
doctor_passes = len(re.findall(r"│\s*\d+\s*│\s*'[^']+'\s*│\s*'PASS'\s*│", doctor_text))
assert doctor_passes == 9, f"Expected 9 doctor checks, observed {doctor_passes}"

command_map = json.loads((KIT / "execution/frontend-command-map.json").read_text(encoding="utf-8"))
commands = {item["id"]: item for item in command_map["commands"]}
setup_command = "npm.cmd --script-shell=powershell.exe run setup"
doctor_command = "npm.cmd --script-shell=powershell.exe run doctor"
assert commands["setup"]["status"] == "VERIFIED_AVAILABLE" and commands["setup"]["command"] == setup_command
assert commands["doctor"]["status"] == "VERIFIED_AVAILABLE" and commands["doctor"]["command"] == doctor_command

after_hashes = {relative: digest((FRONTEND / relative).read_bytes()) for relative in snapshot["targetSha256"]}
changed = [relative for relative, before in snapshot["targetSha256"].items() if after_hashes[relative] != before]
assert not changed, f"setup changed package/config/generated contract files outside the planned worker/env effects: {changed}"
env_path = FRONTEND / ".env.local"
worker = FRONTEND / "apps/web/public/mockServiceWorker.js"
env_after = digest(env_path.read_bytes()) if env_path.is_file() else None
worker_after = digest(worker.read_bytes()) if worker.is_file() else None
assert env_after == snapshot["envLocalSha256"], "setup changed the existing .env.local"
assert worker.is_file(), "setup did not leave the MSW worker at its configured target"

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
lines = [
    "FE002.S04 actual setup and doctor result",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"CWD: {FRONTEND}",
    f"Command: {setup_command}; exit=0; log=botsales-kit/execution/frontend-evidence/FE002/S04-setup-output-current-20261007.log",
    *[f"  {line}" for line in setup_text.splitlines()],
    f"Command: {doctor_command}; exit=0; log=botsales-kit/execution/frontend-evidence/FE002/S04-doctor-output-current-20261007.log",
    *[f"  {line}" for line in doctor_text.splitlines()],
    f"Doctor checks: {doctor_passes}/9 PASS; Node 24, local TS/Vite/React/MUI/Query/MSW, MSW worker and lockfile all resolved.",
    f"Setup generator: 11 outputs / 283 schemas / 210 operations / 54 routes PASS.",
    f"Pre/post setup generated/package targets changed: {changed or '(none)'}.",
    f"Existing .env.local preserved: {env_after == snapshot['envLocalSha256']}; worker exists after setup: {worker.is_file()}; worker content hash unchanged: {worker_after == snapshot['mswWorkerSha256']}.",
    "No provider/backend connection was attempted; npm run setup explicitly identifies demo simulation and does not connect to customers/providers.",
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

source_paths = {
    "package.json", "apps/web/package.json", "package-lock.json", ".node-version", ".npmrc", ".gitignore",
    "scripts/setup.mjs", "scripts/doctor.mjs", "scripts/generate.mjs", "scripts/tools.mjs",
    "apps/web/public/mockServiceWorker.js",
    "botsales-kit/execution/frontend-command-map.json",
    "botsales-kit/execution/frontend-evidence/FE002/S04-before-setup-snapshot-current-20261007.json",
    "botsales-kit/execution/frontend-evidence/FE002/S04-setup-output-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE002/S04-doctor-output-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE002/finalize-setup-doctor-check.py",
}
source_files = []
for relative in sorted(source_paths):
    resolved = REPOSITORY / relative if relative.startswith("botsales-kit/") else FRONTEND / relative
    source_files.append({"path": relative, "sha256": digest(resolved.read_bytes())})
snapshot_hash = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
checks = len(snapshot["targetSha256"]) + 2 + 2 + 2 + 2
evidence = {
    "taskId": "FE002",
    "stepId": "S04",
    "kind": "test_run",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Run the package-owned setup and doctor against the real Frontend target; confirm Node/dependencies/lock/worker and that setup leaves the existing env intact.",
    "observed": f"`{setup_command}` exited 0: generator 11/283/210/54 and package MSW worker copied. `{doctor_command}` exited 0 with {doctor_passes}/9 checks PASS. Existing .env.local hash and all 18 tracked manifest/config/generated target hashes are unchanged; configured worker exists after setup. No real provider/backend was contacted.",
    "commandId": "setup",
    "command": setup_command,
    "reviewer": "Codex",
    "environment": {"name": "Local Windows Frontend workspace", "details": "Actual Node 24.19.0/npm 11.17.0, installed packages and workspace-owned MSW worker; setup/doctor ran in apps repo root.", "dataSource": "source-only"},
    "checksTotal": checks,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot_hash,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: setup exit=0; doctor={doctor_passes}/9; env preserved; package/generated targets unchanged")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
