"""Validate this docs-only reconciliation without rerunning product suites."""
import collections
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote

sys.stdout.reconfigure(encoding="utf-8")
OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
KIT = ROOT / "botsales-kit"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().lower()


def links(path, content, base=None):
    checked, missing = 0, []
    for match in re.finditer(r"!?\[[^\]\n]*\]\(([^)\n]+)\)", content):
        target = match.group(1).strip()
        if target.startswith("<"):
            target = target[1:].split(">", 1)[0]
        elif ' "' in target:
            target = target.split(' "', 1)[0]
        if re.match(r"(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#)", target):
            continue
        target = unquote(target.split("#", 1)[0].split("?", 1)[0])
        if not target:
            continue
        checked += 1
        dest = (base or path.parent) / target
        if not dest.exists():
            missing.append({"file": str(path.relative_to(ROOT)),
                            "line": content.count("\n", 0, match.start()) + 1, "target": target})
    return checked, missing


before = read_json(OUT / "before-inventory.json")
index = ["# Danh mục toàn bộ tài liệu/kế hoạch trước audit — 04/10/2026", "",
         "1.361 file UTF-8 đã quét toàn bộ nội dung; phân loại theo vai trò, không theo từ Backend/BLOCKED đơn lẻ. "
         "Path/hash/line matches đầy đủ trong before-inventory.json; trạng thái sau sửa trong after-inventory.json. "
         "Các link bên dưới mở file hiện tại, hash là hash trước sửa. ZIP baseline được giữ tham chiếu read-only và không giải nén.", ""]
for category in sorted(before["classes"]):
    index.extend(["## " + category, "", "| File | Bytes trước sửa | Dòng | BLOCKED literal |", "|---|---:|---:|---:|"])
    for row in before["files"]:
        if row["class"] == category:
            index.append(f"| [{row['path']}](<../../{row['path']}>) | {row['bytes']} | {row['lines']} | {len(row['matches'].get('blocked_literal', []))} |")
    index.append("")
(OUT / "file-index.md").write_text("\n".join(index), encoding="utf-8")
scan = subprocess.run([sys.executable, str(OUT / "audit_docs.py"), "after"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
(OUT / "after-audit.log").write_text(scan.stdout + scan.stderr, encoding="utf-8")
assert scan.returncode == 0, scan.stdout + scan.stderr
after = read_json(OUT / "after-inventory.json")
after_files = {row["path"]: row for row in after["files"]}
protected_mismatch = [p for p, h in before["protectedHashes"].items() if sha(ROOT / p) != h]
reference_classes = {"full_product_plan_read_only", "historical_reference", "prototype_reference",
                     "universal_read_only", "contract_design_or_generated_data", "evidence_or_historical_snapshot"}
reference_changes = [row["path"] for row in before["files"] if row["class"] in reference_classes
                     and (row["path"] not in after_files or row["sha256"] != after_files[row["path"]]["sha256"])]

fingerprint = read_json(ROOT / "evidence/frontend-ui-improvements/UI024/S08-current-worktree-and-artifact-fingerprint.json")
runtime_results = {}
for name, group in [("sourceInputs", fingerprint["sourceInputs"]), *fingerprint["artifacts"].items()]:
    mismatches = [row["path"] for row in group["files"] if not (ROOT.parent / row["path"]).is_file()
                  or sha(ROOT.parent / row["path"]) != row["sha256"].lower()]
    runtime_results[name] = {"checked": len(group["files"]), "mismatches": mismatches}

plan = read_json(KIT / "execution/frontend-plan.json")
stored = read_json(KIT / "execution/frontend-progress.json")
effective = read_json(OUT / "tracker-status.json")
generated = read_json(KIT / "execution/frontend-progress-report.json")
ops = set()


def collect_ops(obj):
    if isinstance(obj, dict):
        if "operationId" in obj:
            ops.add(obj["operationId"])
        for v in obj.values():
            collect_ops(v)
    elif isinstance(obj, list):
        for v in obj:
            collect_ops(v)


collect_ops(read_json(KIT / "contracts/openapi.json"))
route_manifest = read_json(KIT / "contracts/route-manifest.json")
routes = {r["id"] for r in route_manifest["routes"]}
features = {f["id"] for f in read_json(KIT / "contracts/feature-catalog.json")["features"]}
bad_contract_refs = [{"task": t["id"], "unknownOperations": sorted(set(t["operationIds"]) - ops),
                      "unknownRoutes": sorted(set(t["routeIds"]) - routes),
                      "unknownFeatures": sorted(set(t["featureIds"]) - features)} for t in plan["tasks"]
                     if set(t["operationIds"]) - ops or set(t["routeIds"]) - routes or set(t["featureIds"]) - features]
text = (ROOT / "docs/FRONTEND_UI_IMPROVEMENT_PLAN.md").read_text(encoding="utf-8")
ui_rows = [l for l in text.splitlines() if re.match(r"\| UI\d{3} \| P[012] \| (BC|TU) \|", l)]
ui_cells = [[c.strip() for c in row.split("|")[1:-1]] for row in ui_rows]
ui_summary = {"tasks": len(ui_rows), "done": sum(c[5] == "DONE" for c in ui_cells),
              "checkpoints": sum(int(c[6].split("/")[0]) for c in ui_cells),
              "blocked": sum(c[5] == "BLOCKED" for c in ui_cells),
              "states": dict(collections.Counter(c[5] for c in ui_cells))}
checks_path = OUT / "validation.json"
checks_path.write_text('{"status":"VALIDATING"}\n', encoding="utf-8")
link_total, missing_all, active_missing = 0, [], []
active_classes = {"active_frontend_document", "active_frontend_plan_or_instruction", "generated_frontend_report"}
for row in after["files"]:
    if not row["path"].endswith(".md"):
        continue
    path = ROOT / row["path"]
    # This generator source explicitly declares kit-relative paths for its rendered output.
    base = KIT if row["path"] == "botsales-kit/execution/FRONTEND_PLAN_GUIDE.md" else None
    count, missing = links(path, path.read_text(encoding="utf-8-sig"), base)
    link_total += count
    missing_all.extend(missing)
    if row["class"] in active_classes:
        active_missing.extend(missing)
count, missing = links(OUT / "file-index.md", (OUT / "file-index.md").read_text(encoding="utf-8"))
link_total += count
active_missing.extend(missing)
trailing = []
for row in after["files"]:
    if row["class"] in active_classes and row["path"].endswith(".md"):
        for i, line in enumerate((ROOT / row["path"]).read_text(encoding="utf-8-sig").splitlines(), 1):
            if line.endswith((" ", "\t")):
                trailing.append({"path": row["path"], "line": i})

valid = not (protected_mismatch or reference_changes or bad_contract_refs or active_missing or trailing
             or any(r["mismatches"] for r in runtime_results.values()) or effective["blocked"]
             or ui_summary != {"tasks": 26, "done": 22, "checkpoints": 118, "blocked": 0,
                               "states": {"DONE": 22, "IN_PROGRESS": 2, "TODO": 2}}
             or generated["verifiedSteps"] != effective["verifiedSteps"]
             or any(t["status"] == "BLOCKED" for t in generated["tasks"]))
result = {"status": "PASS" if valid else "FAIL", "scope": "DOCUMENTATION_ONLY_RECONCILIATION",
          "runtimeSuitesRerun": False, "fileCountBefore": before["fileCount"], "fileCountAfter": after["fileCount"],
          "utf8AndJsonErrors": after["errors"], "frontendPlanScope": plan["scope"], "uiSummary": ui_summary,
          "frontendStoredTaskStatuses": dict(collections.Counter(t["status"] for t in stored["tasks"].values())),
          "frontendEffective": {k: effective[k] for k in ["overallPercent", "verifiedSteps", "totalSteps", "blocked", "stale"]},
          "unknownContractReferences": bad_contract_refs, "protectedInputsChecked": len(before["protectedHashes"]),
          "protectedInputMismatches": protected_mismatch, "readOnlyReferenceFilesChecked": sum(row["class"] in reference_classes for row in before["files"]),
          "readOnlyReferenceChanges": reference_changes, "S08RuntimeHashRevalidation": runtime_results,
          "relativeMarkdownLinksCheckedAcrossCorpusAndIndex": link_total, "activeMissingLinks": active_missing,
          "allCorpusMissingLinksIncludingHistorical": missing_all, "activeTrailingWhitespace": trailing,
          "generateCheck": {"initialAttempt": "FAIL: child cmd PATH could not resolve node; retained in initial-path-failure log",
                            "finalAttempt": "PASS after process-local reduced PATH: 11 outputs/283 schemas/210 operations/54 routes",
                            "log": "generate-check.log"},
          "trackerValidate": "PASS: 28 tasks / 140 checkpoints; structure only", "generatedFrontendReport": "Regenerated with effective status; ledger bytes unchanged",
          "limitations": ["No build, cold install, domain/component/browser suites were rerun for this documentation-only change.",
                          "Actual speech output, hosted CI and final owner acceptance remain unobserved.",
                          "UI022 browser-install workflow mismatch remains implementation work explicitly assigned in the plan.",
                          "Keyword coverage is a document audit, not a proof that all application behavior is correct."]}
checks_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({k: v for k, v in result.items() if k not in {"allCorpusMissingLinksIncludingHistorical", "frontendEffective"}}, ensure_ascii=False, indent=2))
print("Full details:", checks_path)
raise SystemExit(0 if valid else 1)
