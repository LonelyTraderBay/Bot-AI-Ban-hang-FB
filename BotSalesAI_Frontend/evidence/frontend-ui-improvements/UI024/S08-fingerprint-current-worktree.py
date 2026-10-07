from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


project_root = Path(__file__).resolve().parents[3]
repository_root = project_root.parent
scope_dirs = (
    "apps/web/src",
    "apps/web/public",
    "packages",
    "tests",
    "scripts",
)
scope_files = (
    "package.json",
    "package-lock.json",
    "apps/web/package.json",
    "apps/web/vite.config.ts",
    "playwright.config.ts",
    "botsales-kit/contracts/openapi.json",
    "botsales-kit/contracts/route-manifest.json",
    "botsales-kit/design/tokens.json",
    "evidence/frontend-ui-improvements/UI020/S06-desktop-chrome-playwright.config.mjs",
)
external_files = (".github/workflows/frontend.yml",)


def git(*args: str) -> str:
    return subprocess.run(
        ["git", "-C", str(repository_root), *args],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def manifest_for(paths: list[Path]) -> tuple[list[dict[str, object]], str, int]:
    files = []
    for path in sorted(set(paths), key=lambda item: item.as_posix().lower()):
        if path.is_file():
            rel = path.relative_to(repository_root).as_posix()
            data = path.read_bytes()
            files.append(
                {
                    "path": rel,
                    "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest().upper(),
                }
            )
    aggregate = hashlib.sha256()
    total_bytes = 0
    for item in files:
        total_bytes += int(item["bytes"])
        aggregate.update(str(item["path"]).encode("utf-8"))
        aggregate.update(b"\0")
        aggregate.update(str(item["sha256"]).encode("ascii"))
        aggregate.update(b"\n")
    return files, aggregate.hexdigest().upper(), total_bytes


source_paths: list[Path] = []
for rel in scope_dirs:
    directory = project_root / rel
    if directory.is_dir():
        source_paths.extend(path for path in directory.rglob("*") if path.is_file())
for rel in scope_files:
    path = project_root / rel
    if path.is_file():
        source_paths.append(path)
for rel in external_files:
    path = repository_root / rel
    if path.is_file():
        source_paths.append(path)

source_files, source_hash, source_bytes = manifest_for(source_paths)
artifacts = {}
for name, rel in (("production", "apps/web/dist"), ("demo", "apps/web/dist-demo")):
    directory = project_root / rel
    paths = [path for path in directory.rglob("*") if path.is_file()] if directory.is_dir() else []
    files, digest, total_bytes = manifest_for(paths)
    artifacts[name] = {
        "directory": rel,
        "fileCount": len(files),
        "totalBytes": total_bytes,
        "manifestSha256": digest,
        "files": files,
    }

result = {
    "date": "2026-10-04",
    "scope": "frontend current worktree source, tests, contracts, standard and accepted browser configuration, and built artifacts",
    "repositoryHead": git("rev-parse", "HEAD"),
    "workingTree": "dirty; source fingerprint is computed from current file bytes, including uncommitted and untracked inputs in the declared scope",
    "sourceInputs": {
        "directories": list(scope_dirs),
        "files": list(scope_files) + list(external_files),
        "fileCount": len(source_files),
        "totalBytes": source_bytes,
        "manifestSha256": source_hash,
        "files": source_files,
    },
    "artifacts": artifacts,
    "limitations": [
        "This is local Windows build and Chromium demo evidence using synthetic MSW data.",
        "It does not establish GitHub CI, backend/provider behavior, staging, production runtime, physical-device behavior, or product-owner acceptance.",
    ],
}
output = project_root / "evidence/frontend-ui-improvements/UI024/S08-current-worktree-and-artifact-fingerprint.json"
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(
    f"source_files={len(source_files)} source_sha256={source_hash} "
    f"production_files={artifacts['production']['fileCount']} production_sha256={artifacts['production']['manifestSha256']} "
    f"demo_files={artifacts['demo']['fileCount']} demo_sha256={artifacts['demo']['manifestSha256']}"
)
