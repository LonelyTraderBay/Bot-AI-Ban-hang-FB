"""Capture the current Git baseline for FE001 without changing Git state."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
LOG = SCRIPT.with_name("S01-intake-baseline-current-20261007.log")
RECEIPT = SCRIPT.with_name("S01-intake-baseline-current-20261007.json")
SOURCE_PATHS = [
    "AGENTS.md",
    "AI_RULES.md",
    "docs/FRONTEND_SCOPE.md",
    "docs/PROJECT_CONTEXT.md",
    "botsales-kit/AGENTS.md",
    "botsales-kit/START_HERE.md",
    "botsales-kit/AI_RULES_PROJECT.md",
    "botsales-kit/execution/frontend-evidence/FE001/capture-intake-baseline.py",
]


def run(command: list[str]) -> tuple[int, str]:
    result = subprocess.run(
        command,
        cwd=REPOSITORY,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    body = result.stdout
    if result.stderr:
        body += ("\n" if body else "") + "[stderr]\n" + result.stderr
    return result.returncode, body.rstrip()


commands = [
    ["git", "rev-parse", "--show-toplevel"],
    ["git", "rev-parse", "HEAD"],
    ["git", "status", "--short"],
    ["git", "diff", "--stat"],
    ["git", "diff", "--cached", "--stat"],
]
labels = [
    "repository root",
    "HEAD revision",
    "working-tree status (tracked, staged, and untracked paths)",
    "unstaged tracked diff summary",
    "staged diff summary",
]
sections = [
    "FE001.S01 intake baseline",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"Capture script: {SCRIPT.relative_to(REPOSITORY).as_posix()}",
    "Guidance reviewed: repository component boundaries; frontend-only synthetic-MSW scope; canonical FE plan/ledger; generated plan/report ownership; full-product T ledger remains read-only; preserve existing working-tree changes.",
    "No files were staged, reset, cleaned, or deleted by this capture.",
]
outputs: dict[str, str] = {}
for label, command in zip(labels, commands, strict=True):
    code, output = run(command)
    outputs[label] = output
    sections.extend(
        [
            "",
            f"Command: {' '.join(command)}",
            f"CWD: {REPOSITORY}",
            f"Exit: {code}",
            f"Observed ({label}):",
            output or "(empty)",
        ]
    )
    if code != 0:
        raise SystemExit(code)

LOG.write_text("\n".join(sections) + "\n", encoding="utf-8", newline="\n")
source_files = []
for source_path in SOURCE_PATHS:
    resolved = (REPOSITORY / "BotSalesAI_Frontend" / source_path) if not source_path.startswith("botsales-kit/") else (REPOSITORY / source_path)
    if not resolved.is_file():
        raise SystemExit(f"Required intake source is missing: {source_path}")
    source_files.append(
        {"path": source_path, "sha256": hashlib.sha256(resolved.read_bytes()).hexdigest()}
    )
snapshot = hashlib.sha256(
    "\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode()
).hexdigest()
head = outputs["HEAD revision"].strip()
status_count = len(outputs["working-tree status (tracked, staged, and untracked paths)"].splitlines())
evidence = {
    "taskId": "FE001",
    "stepId": "S01",
    "kind": "artifact_review",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree dirty)",
    "expected": "Identify effective frontend instructions and the actual Git baseline; preserve current changes and keep backend/full-product claims outside scope.",
    "observed": f"Repository root resolved to {outputs['repository root'].strip()}; HEAD is {head}; git status reports {status_count} existing paths; the working tree remains dirty. Applicable frontend and kit instructions were read, the FE mock scope and source-of-truth boundaries were identified, and no staged/reset/clean action was taken.",
    "command": "python execution/frontend-evidence/FE001/capture-intake-baseline.py",
    "reviewer": "Codex",
    "environment": {
        "name": "Local Windows checkout",
        "details": "PowerShell workspace with Python capture helper and Git CLI; source-only review, no browser or backend execution.",
        "dataSource": "source-only",
    },
    "checksTotal": 13,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(REPOSITORY / "botsales-kit").as_posix(),
    "logSha256": hashlib.sha256(LOG.read_bytes()).hexdigest(),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()} ({LOG.stat().st_size} bytes)")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()} ({RECEIPT.stat().st_size} bytes)")
