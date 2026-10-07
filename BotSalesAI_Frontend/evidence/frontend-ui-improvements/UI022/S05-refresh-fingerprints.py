from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


project_root = Path(__file__).resolve().parents[3]
repository_root = project_root.parent
evidence_root = project_root / "evidence" / "frontend-ui-improvements"
item_root = evidence_root / "UI022"
acceptance_path = item_root / "S05-acceptance.json"
base_revision = "e68cb65e61c5c1aab2ae169dd8033df305df8872"
shared_paths = (
    "docs/FRONTEND_UI_IMPROVEMENT_PLAN.md",
    "docs/PROJECT_CONTEXT.md",
    "docs/KNOWN_GAPS.md",
    "evidence/REPORT.md",
)
evidence_paths = (
    "../.github/workflows/frontend.yml",
    "evidence/frontend-ui-improvements/UI022/S01-workflow-inventory.md",
    "evidence/frontend-ui-improvements/UI022/S02-root-workflow-design.md",
    "evidence/frontend-ui-improvements/UI022/S03-static-validation.md",
    "evidence/frontend-ui-improvements/UI022/S03-validate-workflow.py",
    "evidence/frontend-ui-improvements/UI022/S03-static-validation.log",
    "evidence/frontend-ui-improvements/UI022/S03-generate-check.log",
    "evidence/frontend-ui-improvements/UI022/S03-npm-audit.log",
    "evidence/frontend-ui-improvements/UI022/S04-remote-run-status.md",
    "evidence/frontend-ui-improvements/UI022/S05-refresh-fingerprints.py",
    "evidence/frontend-ui-improvements/UI022/S22-current-local-runner-20261003.md",
    "package.json",
    "playwright.config.ts",
    "scripts/run-e2e.mjs",
    "evidence/frontend-ui-improvements/UI021/S04-frontend-verify.log",
    "evidence/frontend-ui-improvements/UI024/S00-current-rebuilt-demo-e2e-20261003.log",
    "evidence/frontend-ui-improvements/UI024/S01-current-full-rebuilt-demo-e2e-20261003.log",
    "evidence/frontend-ui-improvements/UI024/S02-current-worktree-and-artifact-fingerprint.json",
    "evidence/frontend-ui-improvements/UI024/S03-current-preflight-summary.md",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_hash_entries(value: object, known_acceptances: set[Path], current_hashes: dict[Path, str]) -> int:
    changed = 0
    if isinstance(value, dict):
        for key, child in list(value.items()):
            if isinstance(key, str) and isinstance(child, str) and re.fullmatch(r"[0-9A-Fa-f]{64}", child):
                if key in shared_paths:
                    target = project_root / key
                    if target.is_file():
                        new_hash = sha256(target)
                        if child != new_hash:
                            value[key] = new_hash
                            changed += 1
                elif "acceptance.json" in key:
                    target = (project_root / key).resolve()
                    if target in known_acceptances and target in current_hashes and child != current_hashes[target]:
                        value[key] = current_hashes[target]
                        changed += 1
            changed += update_hash_entries(child, known_acceptances, current_hashes)
    elif isinstance(value, list):
        for child in value:
            changed += update_hash_entries(child, known_acceptances, current_hashes)
    return changed


acceptance = {
    "planId": "FE-UI-FOLLOWUP-20261002",
    "item": "UI022",
    "recordedAt": "2026-10-03",
    "owner": "Codex",
    "status": "IN_PROGRESS",
    "scope": "Repository-root GitHub Actions wiring for BotSalesAI_Frontend only; no Backend, staging, deployment, provider, product ledger or FE ledger scope.",
    "revision": {
        "head": base_revision,
        "workingTree": "Preserved pre-existing dirty Frontend work and restored six test-written artifacts byte-identically from the pre-run snapshot. The root workflow and Windows E2E runner/config updates are local and uncommitted.",
        "githubDefaultBranchAtCheck": base_revision,
    },
    "pairedAcceptance": {
        "ui": "PASS for current local Frontend behavior: Windows runner targeted UI009 1/1 and current full Chromium suite 188/188; the hosted trigger has not been observed.",
        "architecture": "PASS: repository-root workflow scope plus runner invokes locked npm CLI through npm_execpath, bounds child PATH, and starts Vite directly at apps/web; artifacts remain scoped by run, attempt and source SHA.",
        "pairingRule": "Trigger behavior and workflow ownership/boundaries were evaluated together; local structure checks do not certify hosted runner behavior.",
    },
    "checkpoints": {
        "C01": "PASS — workflow location, repository API workflow/run counts, package scripts, lockfile and current revision inventoried in S01.",
        "C02": "PASS — root workflow configured with scoped events, locked toolchain, existing Frontend gates and revision-scoped artifacts; no React/API/backend source changed.",
        "C03": "PASS — saved PyYAML/static structural assertions pass; generate:check and npm audit pass locally; S03 stores logs and script.",
        "C04": "PARTIAL — current local verify and full E2E pass in S22, but the new workflow is uncommitted and has no GitHub run URL/runner/install/artifact evidence.",
        "C05": "PASS — acceptance, evidence, shared docs and SHA-256 fingerprints synchronized; limitation and next external prerequisite are explicit.",
    },
    "verification": {
        "workflowStaticValidation": "PASS; YAML parse, root path, trigger filters, working directory, full SHA action pins, required commands and revision-scoped artifact paths.",
        "generateCheck": "PASS; 11 generated outputs, 283 schemas, 210 operations, 54 routes.",
        "npmAudit": "PASS; npm audit --audit-level=low found 0 vulnerabilities locally.",
        "fullVerify": "PASS locally in UI022/S22: generator 11/283/210/54; source 64/220/54; source-checker 3/3; boundaries 427/0 issues/8 fixtures; lint/typecheck; domain/MSW 88/88; Vitest 85/85; production build.",
        "fullE2E": "PASS locally in UI022/S22: 188/188 Chromium tests, role 357/357, empty 11/11, route-error 51/51; not a GitHub Actions run.",
        "remoteWorkflow": "NOT RUN; public GitHub API showed 0 registered workflows and 0 runs before the local root-level correction; gh has no authenticated session.",
        "actionlint": "UNAVAILABLE; no actionlint result is claimed.",
        "npmCiOnRunner": "NOT RUN.",
        "gitDiffCheck": "PASS; exit 0 with existing LF-to-CRLF advisory messages.",
    },
    "gates": {
        "FE_G01": "Local workflow config and lockfile structure pass; clean hosted install not verified.",
        "FE_G02": "Local frontend verify passes; CI equivalence awaits the actual runner.",
        "FE_G08": "PARTIAL for CI: production/demo local evidence exists, but no remote workflow artifact/run exists for this change.",
        "FE_G05": "Manual browser zoom, screen-reader and interaction review remain open.",
        "FE_G09": "Product-owner acceptance remains open.",
        "readiness": "7/9; UI022 does not close any manual or owner gate.",
    },
    "backlog": {
        "mandatoryDone": "13/16",
        "optionalDone": "7/10",
        "totalDone": "20/26",
        "checkpoints": "113/130",
        "next": "UI020 owner-selected support matrix; UI021 fresh auditor provenance; UI022 remote run after authorized delivery; UI012/UI015 manual evidence and UI023 owner UAT remain open.",
    },
    "evidence": [
        "S01-workflow-inventory.md",
        "S02-root-workflow-design.md",
        "S03-static-validation.md",
        "S03-validate-workflow.py",
        "S03-static-validation.log",
        "S03-generate-check.log",
        "S03-npm-audit.log",
        "S04-remote-run-status.md",
        "S05-refresh-fingerprints.py",
        "S22-current-local-runner-20261003.md",
        "../../../../.github/workflows/frontend.yml",
        "../../../package.json",
        "../../../playwright.config.ts",
        "../../../scripts/run-e2e.mjs",
        "../UI021/S04-frontend-verify.log",
        "../UI012/S19-current-frontend-gates-20261003.log",
        "../UI012/S20-current-full-e2e-20261003.log",
    ],
    "fingerprintAlgorithm": "SHA-256",
    "fingerprintRefreshNote": "Shared documentation hashes and dependent acceptance references refreshed after UI022 Windows runner correction on 2026-10-03; historical source fingerprints are preserved.",
    "fingerprints": {},
}

for relative_path in (*shared_paths, *evidence_paths):
    path = (project_root / relative_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(path)
    acceptance["fingerprints"][relative_path] = sha256(path)
write_json(acceptance_path, acceptance)

acceptance_files = sorted(evidence_root.glob("UI*/S*-acceptance*.json"))
known_acceptances = {path.resolve() for path in acceptance_files}

# Update current shared-document digests, then propagate any changed acceptance
# artifact hashes through the existing chronological references without
# changing any historical source/test fingerprint entries.
for path in acceptance_files:
    data = json.loads(path.read_text(encoding="utf-8"))
    note = data.get("fingerprintRefreshNote")
    if isinstance(note, str) and "UI022 Windows runner correction" not in note:
        data["fingerprintRefreshNote"] = note.rstrip(".") + "; shared docs and downstream acceptance references refreshed after UI022 Windows runner correction on 2026-10-03."
    current_hashes = {target: sha256(target) for target in known_acceptances if target.is_file()}
    changed = update_hash_entries(data, known_acceptances, current_hashes)
    if changed or data.get("fingerprintRefreshNote") != note:
        write_json(path, data)

for pass_number in range(1, len(acceptance_files) + 2):
    current_hashes = {target: sha256(target) for target in known_acceptances if target.is_file()}
    changed_total = 0
    for path in acceptance_files:
        data = json.loads(path.read_text(encoding="utf-8"))
        changed = update_hash_entries(data, known_acceptances, current_hashes)
        if changed:
            write_json(path, data)
            changed_total += changed
    if changed_total == 0:
        print(f"acceptance_reference_refresh=PASS passes={pass_number - 1} files={len(acceptance_files)}")
        break
else:
    raise RuntimeError("Acceptance reference digests did not converge; inspect for a circular acceptance dependency.")

stale_shared = []
stale_references = []
for path in acceptance_files:
    data = json.loads(path.read_text(encoding="utf-8"))

    def audit(value: object) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if isinstance(key, str) and isinstance(child, str) and re.fullmatch(r"[0-9A-Fa-f]{64}", child):
                    if key in shared_paths and child != sha256(project_root / key):
                        stale_shared.append((str(path.relative_to(project_root)), key))
                    elif "acceptance.json" in key:
                        target = (project_root / key).resolve()
                        if target in known_acceptances and child != sha256(target):
                            stale_references.append((str(path.relative_to(project_root)), key))
                audit(child)
        elif isinstance(value, list):
            for child in value:
                audit(child)

    audit(data)

if stale_shared or stale_references:
    raise RuntimeError(f"Stale fingerprints remain: shared={stale_shared}, acceptance={stale_references}")
print(f"shared_document_fingerprints=PASS files={len(acceptance_files)} paths={len(shared_paths)}")
print(f"acceptance={acceptance_path.relative_to(project_root)} status=IN_PROGRESS checkpoints=4/5")
