"""Read every project-owned documentation/planning file; never modify trackers."""
import collections
import hashlib
import json
import os
from pathlib import Path
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
SKIP = {".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "dist-demo",
        "playwright-report", "test-results", ".cache", ".vite", ".turbo"}
EXTENSIONS = {".md", ".txt", ".json", ".yaml", ".yml", ".html"}
PATTERNS = {
    "blocked_literal": re.compile(r"\bBLOCKED\b", re.I),
    "external_scope": re.compile(r"backend|staging|database|worker|OIDC|NestJS|Prisma|PostgreSQL", re.I),
    "human_or_hosted_dependency": re.compile(r"owner|thủ công|screen.reader|Narrator|NVDA|hosted|phê duyệt|chờ|bị chặn", re.I),
}


def classification(p):
    if p.startswith("evidence/frontend-scope-automation-audit-20261004/"):
        return "audit_output"
    if p == "evidence/REPORT.md":
        return "active_frontend_document"
    if p.startswith(("evidence/", "botsales-kit/execution/frontend-evidence/",
                     "botsales-kit/evidence/", "botsales-kit/execution/frontend-plan-migrations/")):
        return "evidence_or_historical_snapshot"
    if p.startswith("botsales-kit/reference/"):
        return "historical_reference"
    if p.startswith("botsales-kit/prototype/"):
        return "prototype_reference"
    if p.startswith(("botsales-kit/execution/tasks/", "botsales-kit/execution/progress-report.json", "botsales-kit/execution/plan.json",
                     "botsales-kit/execution/progress.json", "botsales-kit/execution/PROGRESS.")):
        return "full_product_plan_read_only"
    if p in {"AI_RULES.md", "PROJECT_BOOTSTRAP_PROMPT.txt", "botsales-kit/AI_RULES.md"}:
        return "universal_read_only"
    if p.startswith(("packages/", "botsales-kit/contracts/", "botsales-kit/design/")):
        return "contract_design_or_generated_data"
    if p in {"botsales-kit/IMPLEMENTATION_PLAN.md", "botsales-kit/execution/frontend-progress-report.json"} or p.startswith((
            "botsales-kit/execution/frontend-tasks/", "botsales-kit/execution/FRONTEND_PROGRESS.")):
        return "generated_frontend_report"
    if p in {"botsales-kit/execution/frontend-plan.json", "botsales-kit/execution/frontend-progress.json",
             "botsales-kit/execution/frontend-command-map.json", "botsales-kit/execution/FRONTEND_PLAN_GUIDE.md",
             "botsales-kit/execution/FRONTEND_SCOPE_ADOPTION.md", "botsales-kit/execution/SESSION_HANDOFF.md",
             "botsales-kit/AGENTS.md", "botsales-kit/AI_RULES_PROJECT.md", "botsales-kit/START_HERE.md",
             "botsales-kit/PROJECT_BUILD_PROMPT_VI.txt"}:
        return "active_frontend_plan_or_instruction"
    if p.startswith("botsales-kit/"):
        return "kit_specification_or_reference_tooling"
    if p.startswith("docs/") or p in {"AGENTS.md", "README.md", "STACK_LOCK.md", "DESIGN.md", "UX-CONTRACT.md"}:
        return "active_frontend_document"
    return "frontend_config_or_delivery_metadata"


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def task_states(obj):
    tasks = obj.get("tasks", {}) if isinstance(obj, dict) else {}
    if isinstance(tasks, dict):
        return [{"id": k, "status": v.get("status"), "blockedReason": v.get("blockedReason")}
                for k, v in tasks.items() if isinstance(v, dict)]
    if isinstance(tasks, list):
        return [{"id": v.get("id"), "status": v.get("status")}
                for v in tasks if isinstance(v, dict)]
    return []


def main():
    label = sys.argv[1] if len(sys.argv) > 1 else "current"
    rows, errors = [], []
    for directory, dirs, files in os.walk(ROOT):
        dirs[:] = sorted(d for d in dirs if d not in SKIP and not d.startswith((".vite-", ".pw-")))
        for name in sorted(files):
            path = Path(directory) / name
            if path.suffix.lower() not in EXTENSIONS:
                continue
            rel = path.relative_to(ROOT).as_posix()
            if classification(rel) == "audit_output":
                continue
            data = path.read_bytes()
            try:
                content = data.decode("utf-8-sig")
            except UnicodeDecodeError as exc:
                errors.append({"path": rel, "error": str(exc)})
                continue
            row = {"path": rel, "class": classification(rel), "bytes": len(data),
                   "sha256": hashlib.sha256(data).hexdigest(), "lines": len(content.splitlines()), "matches": {}}
            for kind, regex in PATTERNS.items():
                hits = [{"line": i, "text": line[:700]} for i, line in enumerate(content.splitlines(), 1) if regex.search(line)]
                if hits:
                    row["matches"][kind] = hits
            if path.suffix == ".json":
                try:
                    obj = json.loads(content)
                    row["taskStates"] = task_states(obj)
                    row["scope"] = obj.get("scope") if isinstance(obj, dict) else None
                except json.JSONDecodeError as exc:
                    errors.append({"path": rel, "error": str(exc)})
            rows.append(row)
    plan = json.loads((ROOT / "botsales-kit/execution/frontend-plan.json").read_text(encoding="utf-8"))
    ids = {t["id"] for t in plan["tasks"]}
    invalid_deps = [{"id": t["id"], "dependency": d} for t in plan["tasks"] for d in t["dependsOn"] if d not in ids]
    plan_text = (ROOT / "docs/FRONTEND_UI_IMPROVEMENT_PLAN.md").read_text(encoding="utf-8")
    task_rows = [line for line in plan_text.splitlines() if re.match(r"\| UI\d{3} \| P[012] \| (BC|TU) \|", line)]
    active_blocked = [line for line in task_rows if "| BLOCKED |" in line]
    preserved = ["AI_RULES.md", "botsales-kit/AI_RULES.md", "botsales-kit/execution/plan.json",
                 "botsales-kit/execution/progress.json", "botsales-kit/execution/frontend-plan.json",
                 "botsales-kit/execution/frontend-progress.json", "botsales-kit/contracts/openapi.json",
                 "botsales-kit/contracts/route-manifest.json", "botsales-kit/design/tokens.json", "premium-audit.json"]
    protected = {p: digest(ROOT / p) for p in preserved if (ROOT / p).is_file()}
    tree = {p: (ROOT / p).exists() for p in ["apps/web", "apps/api", "apps/worker", "infra"]}
    report = {"scope": "FRONTEND_WITH_SYNTHETIC_MOCK_API", "method": "Full UTF-8 content scan and SHA-256 of project-owned docs/plans/config/reference/evidence; external dependencies and built/test runtime output excluded. Keywords locate risks; they do not prove task blockage or backend runtime existence.",
              "root": str(ROOT), "label": label, "fileCount": len(rows), "byteCount": sum(r["bytes"] for r in rows),
              "classes": dict(collections.Counter(r["class"] for r in rows)), "errors": errors,
              "frontendTasks": len(ids), "frontendCheckpoints": sum(len(t["implementationSteps"]) for t in plan["tasks"]),
              "invalidFrontendDependencies": invalid_deps, "uiTaskRows": len(task_rows), "uiBlockedRows": active_blocked,
              "actualRuntimeFolders": tree, "protectedHashes": protected, "files": rows}
    output = OUT / f"{label}-inventory.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "files"}, ensure_ascii=False, indent=2))
    print("Inventory:", output)
    return 1 if errors or invalid_deps or active_blocked else 0


if __name__ == "__main__":
    raise SystemExit(main())
