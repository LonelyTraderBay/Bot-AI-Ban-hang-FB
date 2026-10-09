"""Validate FE002.S03 install output and post-install manifest/lock state."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
SNAPSHOT_PATH = SCRIPT.with_name("S03-before-install-snapshot-current-20261007.json")
NPM_OUTPUT = SCRIPT.with_name("S03-npm-install-output-current-20261007.log")
LOG = SCRIPT.with_name("S03-npm-install-verified-current-20261007.log")
RECEIPT = SCRIPT.with_name("S03-npm-install-verified-current-20261007.json")
NODE = Path(r"C:\Program Files\nodejs\node.exe")
NPM_CLI = Path(r"C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
install_text = NPM_OUTPUT.read_text(encoding="utf-8", errors="replace")
assert "COMMAND_EXIT_CODE=0" in install_text
assert "up to date" in install_text.lower()
assert "found 0 vulnerabilities" in install_text.lower()
command_map = json.loads((KIT / "execution/frontend-command-map.json").read_text(encoding="utf-8"))
install_command = "npm.cmd --script-shell=powershell.exe install"
registered = next((item for item in command_map["commands"] if item["id"] == "install"), None)
assert registered and registered["status"] == "VERIFIED_AVAILABLE" and registered["command"] == install_command
assert registered["cwd"] == "BotSalesAI_Frontend"

root = json.loads((FRONTEND / "package.json").read_text(encoding="utf-8"))
web = json.loads((FRONTEND / "apps/web/package.json").read_text(encoding="utf-8"))
lock = json.loads((FRONTEND / "package-lock.json").read_text(encoding="utf-8"))
assert lock["lockfileVersion"] == 3
assert lock["packages"][""].get("devDependencies", {}) == root.get("devDependencies", {})
assert lock["packages"]["apps/web"].get("dependencies", {}) == web.get("dependencies", {})
assert lock["packages"]["apps/web"].get("devDependencies", {}) == web.get("devDependencies", {})

ls = subprocess.run([str(NODE), str(NPM_CLI), "ls", "--depth=0"], cwd=FRONTEND,
                    capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
ls_text = ls.stdout.rstrip() + (("\n[stderr]\n" + ls.stderr.rstrip()) if ls.stderr else "")
assert ls.returncode == 0, f"npm ls --depth=0 failed:\n{ls_text}"
assert "invalid:" not in ls_text.lower() and "missing:" not in ls_text.lower()

after_hashes = {relative: digest((FRONTEND / relative).read_bytes()) for relative in snapshot["targetSha256"]}
changed = [relative for relative, before in snapshot["targetSha256"].items() if after_hashes[relative] != before]
unexpected = [relative for relative in changed if relative != "package-lock.json"]
assert not unexpected, f"npm install unexpectedly changed in-scope config/generated files: {unexpected}"
env_path = FRONTEND / ".env.local"
worker = FRONTEND / "apps/web/public/mockServiceWorker.js"
env_after = digest(env_path.read_bytes()) if env_path.is_file() else None
worker_after = digest(worker.read_bytes()) if worker.is_file() else None
assert env_after == snapshot["envLocalSha256"], "Existing .env.local changed during npm install"
assert worker_after == snapshot["mswWorkerSha256"], "MSW worker changed during npm install"

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
lines = [
    "FE002.S03 npm install result and lockfile validation",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"Command: {install_command}",
    f"CWD: {FRONTEND}",
    "Exit: 0",
    "Captured installer output: botsales-kit/execution/frontend-evidence/FE002/S03-npm-install-output-current-20261007.log",
    *[f"  {line}" for line in install_text.splitlines()],
    f"Post-install validation command: {NODE} {NPM_CLI} ls --depth=0",
    f"Post-install npm ls exit: {ls.returncode}",
    ls_text,
    f"npm lockfileVersion: {lock['lockfileVersion']}; root dev and app dependency/dev maps match their manifests: yes.",
    f"Changed pre-snapshotted paths: {changed or '(none)'}; unexpected generated/config changes: {unexpected or '(none)'}.",
    f"Existing .env.local preserved: {env_after == snapshot['envLocalSha256']}; generated MSW worker unchanged: {worker_after == snapshot['mswWorkerSha256']}.",
    "npm install output reports 0 vulnerabilities and warns that esbuild@0.28.2 and msw@2.11.1 install scripts are not covered by npm allowScripts. The warning is preserved; this task did not approve or execute those scripts.",
    "Initial output-capture path error and helper-only npm.cmd shell lookup are preserved in sibling diagnostic logs; neither is classified as an install/registry failure.",
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

source_paths = {
    "package.json", "apps/web/package.json", "package-lock.json", ".node-version", ".npmrc",
    "botsales-kit/execution/frontend-command-map.json",
    "botsales-kit/execution/frontend-evidence/FE002/S03-before-install-snapshot-current-20261007.json",
    "botsales-kit/execution/frontend-evidence/FE002/S03-npm-install-output-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE002/S03-npm-install-capture-initial-failure-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE002/finalize-install-check.py",
}
source_files = []
for relative in sorted(source_paths):
    resolved = REPOSITORY / relative if relative.startswith("botsales-kit/") else FRONTEND / relative
    source_files.append({"path": relative, "sha256": digest(resolved.read_bytes())})
snapshot_hash = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
checks = 1 + 2 + 3 + 2 + len(snapshot["targetSha256"]) + 2
evidence = {
    "taskId": "FE002",
    "stepId": "S03",
    "kind": "test_run",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Run the registered npm install in the Frontend workspace; verify exact manifest/lock synchronization and retain actual output and any package-manager warnings.",
    "observed": f"{install_command} exited 0 (`up to date`, npm reported 0 vulnerabilities); post-install `npm ls --depth=0` exited 0; lockfile v{lock['lockfileVersion']} exactly matches root/app manifests. Only npm install's optional package-lock target may change; actual changed targets={changed or 'none'}. Existing .env.local and MSW worker hashes are unchanged. npm allowScripts warnings for esbuild/MSW remain unapproved and visible.",
    "commandId": "install",
    "command": install_command,
    "reviewer": "Codex",
    "environment": {"name": "Local Windows Frontend workspace", "details": "Actual npm 11.17.0 install with existing Node modules; no clean-install claim is made by this step.", "dataSource": "source-only"},
    "checksTotal": checks,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot_hash,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: npm install exit=0; npm ls exit=0; manifest/lock exact; changed targets={changed or 'none'}")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
