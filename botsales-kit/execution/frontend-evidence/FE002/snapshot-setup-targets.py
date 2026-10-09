"""Capture the FE002 setup/doctor write surface before invoking the setup script."""
from pathlib import Path
import hashlib
import json
import re
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
TARGET = SCRIPT.with_name("S04-before-setup-snapshot-current-20261007.json")
assert not TARGET.exists(), f"Refusing to overwrite existing snapshot: {TARGET}"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


generator = (FRONTEND / "scripts/generate.mjs").read_text(encoding="utf-8")
generated = sorted(set(re.findall(r"add\('([^']+)'", generator)))
assert len(generated) == 11
paths = [
    "package.json", "apps/web/package.json", "package-lock.json", ".node-version",
    "scripts/setup.mjs", "scripts/doctor.mjs", "docs/PROJECT_CONTEXT.md", *generated,
]
status = subprocess.run(["git", "status", "--short", "--", *[f"BotSalesAI_Frontend/{p}" for p in paths]],
                        cwd=REPOSITORY, capture_output=True, text=True, encoding="utf-8", check=True).stdout.rstrip()
assert not status, f"Setup targets dirty before invocation; preserve and review:\n{status}"
env = FRONTEND / ".env.local"
worker = FRONTEND / "apps/web/public/mockServiceWorker.js"
snapshot = {
    "scope": "FE002_SETUP_PRE_RUN_SNAPSHOT",
    "targetSha256": {relative: digest((FRONTEND / relative).read_bytes()) for relative in paths},
    "generatedOutputPaths": generated,
    "envLocalExists": env.is_file(),
    "envLocalSha256": digest(env.read_bytes()) if env.is_file() else None,
    "mswWorkerExists": worker.is_file(),
    "mswWorkerSha256": digest(worker.read_bytes()) if worker.is_file() else None,
}
assert snapshot["envLocalExists"] and snapshot["mswWorkerExists"]
snapshot_path = SCRIPT.with_name(TARGET.name)
snapshot_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"Captured {len(paths)} setup/generated targets plus env/worker hashes; existing .env.local and MSW worker confirmed.")
print(f"Wrote {snapshot_path.relative_to(REPOSITORY).as_posix()}")
