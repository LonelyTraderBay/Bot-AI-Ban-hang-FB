from __future__ import annotations

import hashlib
import json
from pathlib import Path


here = Path(__file__).resolve().parent
root = here.parents[2]
acceptance_path = here / "S08-acceptance-20261003.json"
acceptance = json.loads(acceptance_path.read_text(encoding="utf-8"))

acceptance["checkpoints"]["C04"] = (
    "PARTIAL (S09 assesses all 2,144 visible text nodes; S10 measured 133 visible semantic "
    "target bounding boxes across eight routes; S12 adds 745 rounded-shape size samples across all 54 routes "
    "and one dialog at 320/390 CSS px, with a 24x24 square found in every measured target. Actual browser zoom, "
    "screen-reader speech/transcript and full manual review remain open. S11 adds representative automated "
    "dashboard hover/pressed/focus and synthetic 422 alert/icon/invalid-field contrast samples.)"
)
acceptance["verification"]["touchTargets"] = (
    "At 320 CSS px: 65/65 visible semantic target bounding boxes at least 24x24; at 390 CSS px: 68/68. "
    "Eight canonical routes, default/success state, Chromium mobile viewport/touch emulation. "
    "A bounding box does not prove a 24x24 square fits inside a non-rectangular target. "
    "No spacing exceptions or interactive/error states assessed; not a physical-device touch test."
)
acceptance["verification"]["targetShapeAndSpacing"] = (
    "S12 measured 354 default-state targets + 7 targets in the R49 reconciliation import dialog at 320 CSS px, "
    "and 377 + 7 at 390 CSS px, across all 54 canonical routes. A 24x24 axis-aligned square was found inside "
    "every measured rounded-rectangle target; 0 geometry-unassessed, 0 spacing-review candidates and 0 page errors. "
    "The finite placement candidates prove a fit when found; they do not prove failure when no candidate is found. "
    "No menus/hover/pressed/validation-error states or physical device were assessed."
)

for evidence in (
    "S10-touch-target-audit.mjs",
    "S10-touch-target-audit.json",
    "S10-refresh-acceptance.py",
    "S11-interactive-contrast-audit.mjs",
    "S11-interactive-contrast-audit-20261003.json",
    "S12-target-shape-spacing-audit.mjs",
    "S12-target-shape-spacing-audit-20261003.json",
    "../UI024/S02-current-worktree-and-artifact-fingerprint.json",
):
    if evidence not in acceptance["evidence"]:
        acceptance["evidence"].append(evidence)

acceptance["note"] = (
    "Hashes cover current UI012 source, tests, plan, project context, gaps, report, accessibility "
    "matrices, audit artifacts, route contrast and target-size/shape runners/reports, and current "
    "UI013/UI014 verification evidence. S11 adds representative interaction-state contrast sampling; "
    "UI012 remains IN_PROGRESS because actual zoom, screen-reader transcript and complete manual state "
    "review are open. This JSON is excluded from its own hash set."
)
acceptance["fingerprintRefreshNote"] = (
    "S12 expanded rounded target-shape/spacing geometry after S11 representative interaction-state contrast and "
    "S10 mobile viewport/touch-emulation measurements; affected shared-document/evidence fingerprints refreshed "
    "and no UI012 checkpoint advanced."
)

acceptance["verification"]["interactiveContrast"] = (
    "S11 local Chromium sample: dashboard primary action text 11.30:1 default and 8.72:1 hover/pressed; "
    "keyboard :focus-visible outline is solid 2px. Synthetic knowledge 422 alert text/icon 5.77:1 and "
    "invalid field border 10.97:1. Representative automated sample only; alert SVG pixels and complete "
    "route/component state coverage not assessed."
)

fingerprint_paths = (
    "apps/web/src/modules/finance/index.tsx",
    "docs/FRONTEND_UI_IMPROVEMENT_PLAN.md",
    "docs/PROJECT_CONTEXT.md",
    "evidence/REPORT.md",
    "evidence/frontend-ui-improvements/UI012/S02-interaction-matrix.md",
    "evidence/frontend-ui-improvements/UI012/S07-manual-a11y-limitations-20261003.md",
    "evidence/frontend-ui-improvements/UI012/S10-touch-target-audit.mjs",
    "evidence/frontend-ui-improvements/UI012/S10-touch-target-audit.json",
    "evidence/frontend-ui-improvements/UI012/S10-refresh-acceptance.py",
    "evidence/frontend-ui-improvements/UI012/S11-interactive-contrast-audit.mjs",
    "evidence/frontend-ui-improvements/UI012/S11-interactive-contrast-audit-20261003.json",
    "evidence/frontend-ui-improvements/UI012/S12-target-shape-spacing-audit.mjs",
    "evidence/frontend-ui-improvements/UI012/S12-target-shape-spacing-audit-20261003.json",
    "evidence/frontend-ui-improvements/UI024/S02-current-worktree-and-artifact-fingerprint.json",
)
for relative_path in fingerprint_paths:
    path = root / relative_path
    if not path.is_file():
        raise FileNotFoundError(path)
    acceptance["fingerprints"][relative_path] = hashlib.sha256(path.read_bytes()).hexdigest().upper()

acceptance_path.write_text(
    json.dumps(acceptance, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(
    f"UI012 acceptance refreshed: evidence={len(acceptance['evidence'])} "
    f"fingerprints={len(acceptance['fingerprints'])} status={acceptance['status']} "
    f"C04=PARTIAL"
)
