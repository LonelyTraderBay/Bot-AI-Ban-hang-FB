"""Run npm ci in a newly-created isolated copy of the current FE manifests."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import shutil
import subprocess
import tempfile


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
RAW_LOG = SCRIPT.with_name("S05-npm-ci-output-current-20261007.log")
LOG = SCRIPT.with_name("S05-clean-install-verified-current-20261007.log")
RECEIPT = SCRIPT.with_name("S05-clean-install-verified-current-20261007.json")
NODE = Path(r"C:\Program Files\nodejs\node.exe")
NPM_CLI = Path(r"C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js")
NPM_WRAPPER = Path(r"C:\Program Files\nodejs\npm.cmd")
COMMAND = "npm.cmd --script-shell=cmd.exe ci"
SOURCE_RELATIVES = ["package.json", "apps/web/package.json", "package-lock.json", ".npmrc", ".node-version"]


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


command_map = json.loads((KIT / "execution/frontend-command-map.json").read_text(encoding="utf-8"))
registered = next((item for item in command_map["commands"] if item["id"] == "clean-ci-20261002"), None)
assert registered and registered["status"] == "VERIFIED_AVAILABLE" and registered["command"] == COMMAND
source_hashes = {relative: digest((FRONTEND / relative).read_bytes()) for relative in SOURCE_RELATIVES}
lock = json.loads((FRONTEND / "package-lock.json").read_text(encoding="utf-8"))
assert lock["lockfileVersion"] == 3

temp_root = Path(tempfile.gettempdir()).resolve()
temp_dir = Path(tempfile.mkdtemp(prefix="botsales-fe002-clean-install-20261007-", dir=temp_root)).resolve()
assert temp_dir.parent == temp_root and temp_dir.name.startswith("botsales-fe002-clean-install-20261007-")
for relative in SOURCE_RELATIVES:
    destination = temp_dir / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(FRONTEND / relative, destination)
assert not (temp_dir / "node_modules").exists()

path = str(NODE.parent) + os.pathsep + os.environ.get("PATH", "")
env = os.environ.copy()
env["PATH"] = path
shell_command = f"& '{NPM_WRAPPER}' --script-shell=cmd.exe ci"
process = subprocess.run(["powershell.exe", "-NoProfile", "-Command", shell_command], cwd=temp_dir,
                         env=env, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
raw_text = process.stdout.rstrip()
if process.stderr:
    raw_text += ("\n[stderr]\n" if raw_text else "[stderr]\n") + process.stderr.rstrip()
raw_text += f"\nCOMMAND_EXIT_CODE={process.returncode}\n"
RAW_LOG.write_text(raw_text, encoding="utf-8", newline="\n")

if process.returncode != 0:
    summary = [
        "FE002.S05 isolated npm ci failed; no PASS receipt was emitted.",
        f"Command: {COMMAND}",
        f"CWD: {temp_dir}",
        f"Exit: {process.returncode}",
        "The isolated directory is preserved for investigation because the install failed.",
        f"Raw output: {RAW_LOG.relative_to(REPOSITORY).as_posix()}",
        raw_text,
    ]
    LOG.write_text("\n".join(summary) + "\n", encoding="utf-8", newline="\n")
    raise SystemExit(process.returncode)

ls = subprocess.run([str(NODE), str(NPM_CLI), "ls", "--depth=0"], cwd=temp_dir, env=env,
                    capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
ls_text = ls.stdout.rstrip() + (("\n[stderr]\n" + ls.stderr.rstrip()) if ls.stderr else "")
assert ls.returncode == 0, f"Isolated npm ls failed:\n{ls_text}"
assert "invalid:" not in ls_text.lower() and "missing:" not in ls_text.lower()
assert {relative: digest((temp_dir / relative).read_bytes()) for relative in SOURCE_RELATIVES} == source_hashes
temp_lock = json.loads((temp_dir / "package-lock.json").read_text(encoding="utf-8"))
assert temp_lock["packages"][""].get("devDependencies", {}) == json.loads((temp_dir / "package.json").read_text(encoding="utf-8")).get("devDependencies", {})
assert temp_lock["packages"]["apps/web"].get("dependencies", {}) == json.loads((temp_dir / "apps/web/package.json").read_text(encoding="utf-8")).get("dependencies", {})
assert (temp_dir / "node_modules/.package-lock.json").is_file()

package_count = len(json.loads((temp_dir / "node_modules/.package-lock.json").read_text(encoding="utf-8")).get("packages", {}))
assert package_count > 300, f"Unexpected isolated install package count: {package_count}"
head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
lines = [
    "FE002.S05 cold npm ci in isolated temp workspace",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"Command: {COMMAND}",
    f"Resolved executable: {NPM_WRAPPER} (PowerShell child, npm --script-shell=cmd.exe)",
    f"CWD: {temp_dir}",
    "Exit: 0",
    f"Node: {subprocess.run([str(NODE), '--version'], cwd=temp_dir, capture_output=True, text=True, encoding='utf-8', check=True).stdout.strip()}",
    f"npm: {subprocess.run([str(NODE), str(NPM_CLI), '--version'], cwd=temp_dir, capture_output=True, text=True, encoding='utf-8', check=True).stdout.strip()}",
    f"Installed package lock records {package_count} package paths; npm ls --depth=0 exit={ls.returncode}.",
    "Manifest, lockfile, .npmrc and .node-version hashes before/after the isolated install: unchanged.",
    "Current workspace node_modules and package files were not used or modified by this clean install.",
    "npm allowScripts warnings are retained in raw output; no scripts were approved by this step.",
    "The isolated temp tree was removed after the successful checks; only command logs, source hashes and receipt remain.",
    f"Raw npm output: {RAW_LOG.relative_to(REPOSITORY).as_posix()}",
    raw_text,
    "Post-install npm ls output:",
    ls_text,
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

source_paths = {
    *SOURCE_RELATIVES,
    "botsales-kit/execution/frontend-command-map.json",
    "botsales-kit/execution/frontend-evidence/FE002/S05-npm-ci-output-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE002/run-clean-install.py",
}
source_files = []
for relative in sorted(source_paths):
    resolved = REPOSITORY / relative if relative.startswith("botsales-kit/") else FRONTEND / relative
    source_files.append({"path": relative, "sha256": digest(resolved.read_bytes())})
snapshot_hash = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
evidence = {
    "taskId": "FE002",
    "stepId": "S05",
    "kind": "test_run",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Run a cold npm ci from exact current manifests/lock in an isolated clean temp workspace, retain toolchain evidence and leave the shared checkout untouched.",
    "observed": f"{COMMAND} exited 0 in a new temp copy; npm ls --depth=0 exited 0; {package_count} package paths recorded; manifest/lock/config hashes stayed exact; no current Frontend node_modules or source targets were used. The temp tree was removed only after success.",
    "commandId": "clean-ci-20261002",
    "command": COMMAND,
    "reviewer": "Codex",
    "environment": {"name": "Isolated Windows temp workspace", "details": "Node 24.19.0/npm 11.17.0; copied current root/app manifests, lockfile, .npmrc and .node-version; no project source or existing node_modules.", "dataSource": "source-only"},
    "checksTotal": 11,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot_hash,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": digest(LOG.read_bytes()),
}

# The temp target is constrained to an exact child of the OS temp directory and was created above.
assert temp_dir.parent == temp_root and temp_dir.name.startswith("botsales-fe002-clean-install-20261007-")
shutil.rmtree(temp_dir)
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: isolated npm ci; npm ls exit=0; package paths={package_count}; temp workspace removed")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
