"""Validate Markdown links in the final 2026-10-05 Frontend document inventory."""
import json
from pathlib import Path
import re
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
KIT = ROOT / "botsales-kit"
INVENTORY = Path(__file__).with_name("final-post-fe028-20261005-inventory.json")
report = json.loads(INVENTORY.read_text(encoding="utf-8"))
active = {"active_frontend_document", "active_frontend_plan_or_instruction", "generated_frontend_report"}
pattern = re.compile(r"!?\[[^\]\n]*\]\(([^)\n]+)\)")
checked = 0
all_missing = []
active_missing = []

for row in report["files"]:
    if not row["path"].endswith(".md"):
        continue
    source = ROOT / row["path"]
    content = source.read_text(encoding="utf-8-sig")
    base = KIT if row["path"] == "botsales-kit/execution/FRONTEND_PLAN_GUIDE.md" else source.parent
    for match in pattern.finditer(content):
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
        destination = base / target
        if not destination.exists():
            issue = {"file": row["path"], "line": content.count("\n", 0, match.start()) + 1, "target": target}
            all_missing.append(issue)
            if row["class"] in active:
                active_missing.append(issue)

result = {
    "scope": "Markdown relative-link existence; anchors are not resolved",
    "inventory": INVENTORY.name,
    "checkedLinks": checked,
    "activeMissingLinks": active_missing,
    "allMissingLinks": all_missing,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(1 if active_missing else 0)
