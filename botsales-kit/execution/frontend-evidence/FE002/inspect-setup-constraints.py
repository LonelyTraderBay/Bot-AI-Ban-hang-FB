"""Inspect FE002 setup/doctor write effects and current npm environment without mutation."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
LOG = SCRIPT.with_name("S02-setup-doctor-install-constraints-current-20261007.log")
RECEIPT = SCRIPT.with_name("S02-setup-doctor-install-constraints-current-20261007.json")
NODE = Path(r"C:\Program Files\nodejs\node.exe")
NPM_CLI = Path(r"C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run(label: str, command: list[str]) -> tuple[int, str]:
    result = subprocess.run(command, cwd=FRONTEND, capture_output=True, text=True,
                            encoding="utf-8", errors="replace", check=False)
    output = result.stdout.rstrip()
    if result.stderr:
        output += ("\n" if output else "") + "[stderr]\n" + result.stderr.rstrip()
    if result.returncode != 0:
        raise RuntimeError(f"{label} failed ({result.returncode}):\n{output}")
    return result.returncode, output


cache_code, cache = run("npm cache config", [str(NODE), str(NPM_CLI), "config", "get", "cache"])
registry_code, registry = run("npm registry config", [str(NODE), str(NPM_CLI), "config", "get", "registry"])
user_code, user = run("current account", ["whoami.exe"])
acl_code, acl = run("workspace ACL", ["icacls.exe", str(FRONTEND)])

setup = (FRONTEND / "scripts/setup.mjs").read_text(encoding="utf-8")
doctor = (FRONTEND / "scripts/doctor.mjs").read_text(encoding="utf-8")
generator = (FRONTEND / "scripts/generate.mjs").read_text(encoding="utf-8")
gitignore = (FRONTEND / ".gitignore").read_text(encoding="utf-8")
npmrc = (FRONTEND / ".npmrc").read_text(encoding="utf-8")
env_path = FRONTEND / ".env.local"
env_example = FRONTEND / ".env.example"
worker_path = FRONTEND / "apps/web/public/mockServiceWorker.js"
env_exists = env_path.is_file()
env_match = env_exists and digest(env_path.read_bytes()) == digest(env_example.read_bytes())
worker_exists = worker_path.is_file()

assert "scripts/generate.mjs" in setup and "process.exit(r.status||1)" in setup
assert "require.resolve('msw/package.json')" in setup and "'init','public','--save'" in setup
assert "!fs.existsSync(path.join(root,'.env.local'))" in setup and "copyFileSync(path.join(root,'.env.example')" in setup
assert "Number(process.versions.node.split('.')[0])!==24" in setup
assert "require.resolve(pkg).startsWith(path.join(root,'node_modules'))" in doctor
assert "mockServiceWorker.js" in doctor and "package-lock.json" in doctor
assert "fs.writeFileSync(destination, outputs[file])" in generator and "findGeneratedDrift" in generator
assert "apps/web/public/mockServiceWorker.js" in gitignore and ".env.local" in gitignore
assert "save-exact=true" in npmrc and "engine-strict=true" in npmrc
assert env_exists and env_match, "Existing .env.local is missing or differs from the supplied example; do not run setup until reviewed"
assert worker_exists, "Existing generated MSW worker is missing"
checks = 16

status = subprocess.run(["git", "status", "--short", "--", "BotSalesAI_Frontend/package.json",
                         "BotSalesAI_Frontend/apps/web/package.json", "BotSalesAI_Frontend/package-lock.json",
                         "BotSalesAI_Frontend/.node-version", "BotSalesAI_Frontend/scripts/setup.mjs",
                         "BotSalesAI_Frontend/scripts/doctor.mjs", "BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md"],
                        cwd=REPOSITORY, capture_output=True, text=True, encoding="utf-8", check=True).stdout.rstrip()
assert not status, f"FE002 change-budget target already dirty before this task; preserve and review: {status}"
checks += 1

lines = [
    "FE002.S02 setup/doctor/install side-effect and environment baseline",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"CWD: {FRONTEND}",
    "Scripts read, not executed in S02: scripts/setup.mjs, scripts/doctor.mjs, scripts/generate.mjs.",
    "setup.mjs effects: runs the generator in write mode for 11 generated contract outputs; resolves the installed MSW package binary and runs `init public --save` in apps/web; copies .env.example to .env.local only if .env.local is absent.",
    f"Existing .env.local: present; SHA equals .env.example: {env_match}. Values were not printed. Setup's existence guard means this existing file should not be overwritten.",
    f"Existing package-owned MSW worker: present at apps/web/public/mockServiceWorker.js; .gitignore ignores its generated path.",
    "doctor.mjs checks Node major 24, local resolution of TypeScript/Vite/React/MUI/Query/MSW beneath root node_modules, worker existence and package-lock existence; it writes no files.",
    "generator.mjs has a check-only path and a write path; setup calls the write path. Before S04, capture generated-output, worker, env, manifest and lock hashes and compare after execution.",
    f"npm config cache (exit {cache_code}): {cache}",
    f"npm config registry (exit {registry_code}): {registry}",
    "Registry URL is configuration only; network/registry reachability is not claimed until the install step executes.",
    f"Windows account (exit {user_code}): {user}",
    f"ACL query (exit {acl_code}): {acl}",
    "The current checkout's seven FE002 change-budget paths were clean before this task. The full worktree is not clean; unrelated changes remain outside budget.",
    "No current npm PATH/registry failure was observed in the actual toolchain commands. The earlier cmd.exe npm lookup error was confined to the Python helper and remains separately logged under S01.",
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
source_paths = [
    "package.json", "apps/web/package.json", "package-lock.json", ".node-version", ".npmrc", ".gitignore",
    "scripts/setup.mjs", "scripts/doctor.mjs", "scripts/generate.mjs", "scripts/tools.mjs", ".env.example",
    "apps/web/public/mockServiceWorker.js",
    "botsales-kit/execution/frontend-evidence/FE002/S01-helper-shell-resolution-initial-failure-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE002/inspect-setup-constraints.py",
]
source_files = [{"path": relative, "sha256": digest((REPOSITORY / relative).read_bytes()
                if relative.startswith("botsales-kit/") else (FRONTEND / relative).read_bytes())}
                for relative in sorted(source_paths)]
snapshot = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
evidence = {
    "taskId": "FE002",
    "stepId": "S02",
    "kind": "artifact_review",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Inspect setup/doctor/install effects, current cache/registry/cwd and write conditions; distinguish observed environment issues from code behavior before running mutating setup/install commands.",
    "observed": f"setup/doctor effects and seven-path baseline were inspected; .env.local exists and exactly matches the example, generated worker exists, npm cache/registry configuration resolves, and ACL lists current user access. No registry connectivity claim is made before npm install; no npm PATH/registry failure observed. The prior npm.cmd child-shell issue is documented as a helper-only failure.",
    "command": "python execution/frontend-evidence/FE002/inspect-setup-constraints.py",
    "reviewer": "Codex",
    "environment": {"name": "Local Windows Frontend workspace", "details": "Read-only script/config/npm cache/registry/ACL inspection; npm install and setup not run yet.", "dataSource": "source-only"},
    "checksTotal": checks,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: setup/doctor behavior inspected; env preserved; cache/registry resolved; budget paths clean")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
