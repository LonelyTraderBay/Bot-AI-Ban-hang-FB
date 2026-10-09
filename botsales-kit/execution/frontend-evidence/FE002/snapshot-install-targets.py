"""Capture FE002 npm-install target hashes before running the authorized installer."""
from pathlib import Path
import hashlib
import json
import re
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
TARGET = SCRIPT.with_name("S03-before-install-snapshot-current-20261007.json")
assert not TARGET.exists(), f"Refusing to overwrite existing snapshot: {TARGET}"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


generator = (FRONTEND / "scripts/generate.mjs").read_text(encoding="utf-8")
generated = sorted(set(re.findall(r"add\('([^']+)'", generator)))
assert len(generated) == 11, f"Expected 11 known generated outputs, found {len(generated)}"
paths = [
    "package.json", "apps/web/package.json", "package-lock.json", ".node-version",
    "scripts/setup.mjs", "scripts/doctor.mjs", "docs/PROJECT_CONTEXT.md",
    *generated,
]
hashes = {relative: digest((FRONTEND / relative).read_bytes()) for relative in paths}
status = subprocess.run(["git", "status", "--short", "--", *[f"BotSalesAI_Frontend/{p}" for p in paths]],
                        cwd=REPOSITORY, capture_output=True, text=True, encoding="utf-8", check=True).stdout.rstrip()
assert not status, f"npm install target already dirty; preserve and review before proceeding:\n{status}"
env_file = FRONTEND / ".env.local"
worker = FRONTEND / "apps/web/public/mockServiceWorker.js"
snapshot = {
    "scope": "FE002_NPM_INSTALL_PRE_RUN_SNAPSHOT",
    "frontendRoot": str(FRONTEND),
    "targetSha256": hashes,
    "generatedOutputPaths": generated,
    "envLocalExists": env_file.is_file(),
    "envLocalSha256": digest(env_file.read_bytes()) if env_file.is_file() else None,
    "mswWorkerExists": worker.is_file(),
    "mswWorkerSha256": digest(worker.read_bytes()) if worker.is_file() else None,
    "nodeModulesLockExists": (FRONTEND / "node_modules/.package-lock.json").is_file(),
    "nodeModulesLockSha256": digest((FRONTEND / "node_modules/.package-lock.json").read_bytes())
    if (FRONTEND / "node_modules/.package-lock.json").is_file() else None,
    "gitStatusForTargets": status,
}
TARGET.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"Captured {len(hashes)} allowed manifest/config/generated paths; existing env/worker/node_modules state recorded without exposing env values.")
print(f"Wrote {TARGET.relative_to(REPOSITORY).as_posix()}")
