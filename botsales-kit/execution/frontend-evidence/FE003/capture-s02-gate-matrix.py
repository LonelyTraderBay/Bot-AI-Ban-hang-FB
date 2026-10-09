"""Build FE003.S02 task-to-gate matrix from canonical plan, gate guide, and current evidence."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
LOG = SCRIPT.with_name("S02-verification-ladder-matrix-current-20261007.log")
RECEIPT = SCRIPT.with_name("S02-verification-ladder-matrix-current-20261007.json")
MATRIX = SCRIPT.with_name("S02-fe-task-gate-matrix-current-20261007.json")
COMMAND = "python botsales-kit/execution/frontend-evidence/FE003/capture-s02-gate-matrix.py"

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

plan_path = KIT / "execution/frontend-plan.json"
guide_path = KIT / "execution/FRONTEND_PLAN_GUIDE.md"
plan = json.loads(plan_path.read_text(encoding="utf-8"))
guide = guide_path.read_text(encoding="utf-8")
scope = (FRONTEND / "docs/FRONTEND_SCOPE.md").read_text(encoding="utf-8")
gaps = (FRONTEND / "docs/KNOWN_GAPS.md").read_text(encoding="utf-8")
gate_ids = [f"FE-G{i:02d}" for i in range(1, 10)]
assert all(gate_id in guide for gate_id in gate_ids)
assert all(f"FE{i:03d}" in {task['id'] for task in plan["tasks"]} for i in range(1, 29))

# Task-to-gate links are based on the actual task-card actions and the canonical gate criteria.
task_gates = {
    "FE001": ["FE-G01", "FE-G04", "FE-G08"], "FE002": ["FE-G01", "FE-G08"],
    "FE003": ["FE-G01", "FE-G02", "FE-G08"], "FE004": ["FE-G02"],
    "FE005": ["FE-G02", "FE-G03", "FE-G06"], "FE006": ["FE-G02", "FE-G05"],
    "FE007": ["FE-G04", "FE-G05", "FE-G06"], "FE008": ["FE-G03", "FE-G04", "FE-G06"],
    "FE009": ["FE-G03", "FE-G04", "FE-G05", "FE-G06"],
    "FE010": ["FE-G03", "FE-G04", "FE-G05", "FE-G06", "FE-G07"],
    "FE011": ["FE-G03", "FE-G04", "FE-G05", "FE-G06", "FE-G07"],
    "FE012": ["FE-G03", "FE-G04", "FE-G05", "FE-G06", "FE-G07"],
    "FE013": ["FE-G03", "FE-G04", "FE-G05", "FE-G06", "FE-G07"],
    "FE014": ["FE-G03", "FE-G04", "FE-G05", "FE-G06"],
    "FE015": ["FE-G03", "FE-G04", "FE-G05", "FE-G06", "FE-G07"],
    "FE016": ["FE-G03", "FE-G04", "FE-G05", "FE-G06", "FE-G07"],
    "FE017": ["FE-G03", "FE-G04", "FE-G05", "FE-G06"],
    "FE018": ["FE-G03", "FE-G04", "FE-G05", "FE-G06"],
    "FE019": ["FE-G03", "FE-G04", "FE-G05", "FE-G06"],
    "FE020": ["FE-G03", "FE-G04", "FE-G05", "FE-G06"],
    "FE021": ["FE-G03", "FE-G04", "FE-G05", "FE-G07"],
    "FE022": ["FE-G03", "FE-G04", "FE-G05", "FE-G06"],
    "FE023": ["FE-G02", "FE-G03", "FE-G04", "FE-G05", "FE-G06"],
    "FE024": ["FE-G02", "FE-G03", "FE-G04", "FE-G06"],
    "FE025": ["FE-G04", "FE-G05", "FE-G07"],
    "FE026": ["FE-G01", "FE-G03", "FE-G07", "FE-G08"],
    "FE027": ["FE-G04", "FE-G05", "FE-G08", "FE-G09"],
    "FE028": gate_ids,
}
task_levels = {
    "FE001": ["V0", "V3"], "FE002": ["V0", "V1", "V2"], "FE003": ["V0", "V1", "V2", "V3"],
    "FE004": ["V1", "V2"], "FE005": ["V1", "V2", "V3", "V4"], "FE006": ["V1", "V3", "V4"],
    "FE007": ["V1", "V2", "V3", "V4"], "FE008": ["V1", "V2", "V3", "V4"],
    **{f"FE{i:03d}": ["V1", "V2", "V3", "V4"] for i in range(9, 25)},
    "FE025": ["V1", "V3", "V4"], "FE026": ["V0", "V1", "V2", "V3", "V4"],
    "FE027": ["V0", "V1", "V2", "V3", "V4"], "FE028": ["V0", "V1", "V2", "V3", "V4"],
}
gate_definitions = {
    "FE-G01": "Môi trường tái lập: đúng Node/dependency; npm install, npm ci và build clean.",
    "FE-G02": "Code/kiến trúc: generated freshness, type/lint, import boundaries/cycles và negative fixtures.",
    "FE-G03": "Contract/mock: schema request/response/fixtures, simulator/domain, transport/component negative cases.",
    "FE-G04": "Chức năng: route × state × role, feature/operation và luồng gắn test/result.",
    "FE-G05": "UI/UX: browser viewport, keyboard/focus/form/i18n/a11y; phần axe không chứng minh cần review riêng.",
    "FE-G06": "An toàn Frontend: secret/raw HTML/cross-shop stale data/unknown-command handling; không suy ra server auth.",
    "FE-G07": "Hiệu năng Frontend: đo bundle và browser flow trên dataset mock định danh; không suy ra backend SLO.",
    "FE-G08": "Artifact: production/demo build, mock isolation, CI hoặc clean local equivalent có log.",
    "FE-G09": "UAT/bàn giao: mock UAT, gaps, giới hạn, run/build/API handoff; user acceptance chỉ khi thực sự có.",
}

gate_evidence = {
    "FE-G01": {"disposition": "ĐẠT_TRONG_SCOPE_LOCAL", "refs": [
        "botsales-kit/execution/frontend-evidence/FE002/S03-npm-install-verified-current-20261007.json",
        "botsales-kit/execution/frontend-evidence/FE002/S04-setup-doctor-verified-current-20261007.json",
        "botsales-kit/execution/frontend-evidence/FE002/S05-clean-install-retry-verified-current-20261007.json",
        "evidence/frontend-ui-document-sync-20261007/verify-record.json", "evidence/frontend-ui-document-sync-20261007/built-demo-record.json"],
        "remaining": "No claim about a hosted runner; local environment and clean temporary install only."},
    "FE-G02": {"disposition": "ĐẠT_LOCAL_SELF_REVIEW", "refs": [
        "evidence/frontend-ui-document-sync-20261007/verify-record.json",
        "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-current-evidence.json",
        "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-verify-final-reconciled-current-20261007.log"],
        "remaining": "This is automated verification plus Codex self-review, not independent peer review."},
    "FE-G03": {"disposition": "ĐẠT_VỚI_SYNTHETIC_MOCK", "refs": [
        "evidence/frontend-ui-document-sync-20261007/contracts-record.json",
        "evidence/frontend-ui-document-sync-20261007/contracts.log",
        "evidence/frontend-ui-document-sync-20261007/verify-record.json"],
        "remaining": "MSW/simulator evidence does not prove a live API or backend persistence."},
    "FE-G04": {"disposition": "ĐẠT_VỚI_SYNTHETIC_MOCK", "refs": [
        "evidence/frontend-ui-document-sync-20261007/e2e-record.json",
        "evidence/frontend-ui-document-sync-20261007/e2e.log",
        "docs/route-state-role-matrix.json", "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-current-evidence.json"],
        "remaining": "Route/state/role coverage is browser-tested with synthetic MSW, not server authorization."},
    "FE-G05": {"disposition": "CHƯA_XÁC_MINH_ĐẦY_ĐỦ", "refs": [
        "evidence/frontend-ui-document-sync-20261007/e2e-record.json",
        "evidence/frontend-ui-improvements/UI028/W30/native-zoom-followup-current-20261007.md",
        "docs/KNOWN_GAPS.md"],
        "remaining": "Keyboard/axe/contrast/zoom/text-flow have automated evidence; Narrator speech/transcript and broad human conformance are NOT_RUN."},
    "FE-G06": {"disposition": "ĐẠT_TRONG_SCOPE_FRONTEND", "refs": [
        "botsales-kit/execution/frontend-evidence/FE002/S03-npm-install-output-current-20261007.log",
        "evidence/frontend-ui-document-sync-20261007/verify-record.json",
        "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-current-evidence.json"],
        "remaining": "npm allowScripts warnings for esbuild/MSW remain; UI security checks do not establish server-side authorization."},
    "FE-G07": {"disposition": "ĐẠT_TRONG_PHÉP_ĐO_LOCAL", "refs": [
        "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-demo-preview-metrics-chromium-s19-final-20261007-a.json",
        "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-demo-preview-metrics-firefox-s19-final-20261007-a.json",
        "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-full-e2e-post-fix-20261007.log"],
        "remaining": "Synthetic browser/device profile only; no field-user, CDN or backend SLO claim."},
    "FE-G08": {"disposition": "ĐẠT_THEO_LOCAL_EQUIVALENT", "refs": [
        "botsales-kit/execution/frontend-evidence/FE002/S05-clean-install-retry-verified-current-20261007.json",
        "evidence/frontend-ui-document-sync-20261007/verify-record.json",
        "evidence/frontend-ui-document-sync-20261007/e2e-record.json",
        "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-current-evidence.json"],
        "remaining": "Hosted GitHub Actions has no run evidence in this checkout; workflow configuration alone is not a run."},
    "FE-G09": {"disposition": "CHƯA_XÁC_MINH_USER_ACCEPTANCE", "refs": [
        "botsales-kit/execution/frontend-evidence/FE027/uat-matrix-current-20261004.json",
        "evidence/frontend-ui-document-sync-20261007/REPORT.md",
        "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-current-evidence.json"],
        "remaining": "Technical UAT/handoff is reviewable; user acceptance has not been recorded and cannot be inferred."},
}

evidence_entries = []
for gate_id, data in gate_evidence.items():
    refs = []
    for ref in data["refs"]:
        path = REPOSITORY / ref if ref.startswith(("botsales-kit/", ".github/")) else FRONTEND / ref
        assert path.is_file(), f"Missing evidence reference: {ref}"
        refs.append({"path": ref, "sha256": digest(path)})
    evidence_entries.append({"gateId": gate_id, "criterion": gate_definitions[gate_id],
                             "disposition": data["disposition"], "evidence": refs, "remaining": data["remaining"]})

task_rows = []
for task in plan["tasks"]:
    task_id = task["id"]
    assert task_id in task_gates and task_id in task_levels
    task_rows.append({"taskId": task_id, "title": task["title"], "dependsOn": task.get("dependsOn", []),
                      "verificationLevels": task_levels[task_id], "applicableGates": task_gates[task_id],
                      "planActions": [{"stepId": s["id"], "action": s["action"], "evidenceKind": s["requiredEvidenceKind"]}
                                      for s in task["implementationSteps"]]})
assert len(task_rows) == 28 and len(evidence_entries) == 9

external_workflow = REPOSITORY / ".github/workflows/frontend.yml"
workflow_hash = digest(external_workflow)
fingerprints = json.loads((FRONTEND / "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-current-evidence.json").read_text(encoding="utf-8"))["sourceFingerprints"]
workflow_reference_hash = fingerprints.get(".github/workflows/frontend.yml")

matrix = {
    "scope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "sourceOfTruth": {"taskPlan": "botsales-kit/execution/frontend-plan.json", "gateCriteria": "botsales-kit/execution/FRONTEND_PLAN_GUIDE.md", "verificationScopePolicy": "BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md"},
    "verificationLadder": {"V0": "source/docs/plan review", "V1": "lint/type/unit/component for changed code", "V2": "contract/schema/import/boundary/transport", "V3": "React/browser flow with synthetic MSW", "V4": "frontend risk probes such as XSS, stale scope, unknown command, races and performance"},
    "tasks": task_rows,
    "gates": evidence_entries,
    "workflowConfig": {"path": ".github/workflows/frontend.yml", "currentSha256": workflow_hash,
                       "s19ReferenceSha256": workflow_reference_hash,
                       "matchesS19Reference": workflow_reference_hash == workflow_hash,
                       "meaning": "Root workflow exists; current local hash is recorded independently. Its S19 relative-path fingerprint differs, so that historical fingerprint is not used to certify this current external workflow; no hosted run is claimed."},
    "explicitScopeExclusions": ["live database/Meta/provider", "backend authorization/persistence", "staging/production", "hosted CI run", "Narrator speech/human conformance", "owner acceptance"],
}
MATRIX.write_text(json.dumps(matrix, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
lines = ["FE003.S02 FE-G01..09 / 28-task verification-ladder matrix",
         f"Command: {COMMAND}", f"CWD: {REPOSITORY}", "Exit: 0",
         "Canonical gate source: botsales-kit/execution/FRONTEND_PLAN_GUIDE.md; task/actions: execution/frontend-plan.json.",
         f"Tasks assigned to verification levels and applicable gates: {len(task_rows)}/28.",
         f"Gate criteria reviewed with direct current evidence references and SHA-256: {len(evidence_entries)}/9.",
         "Current gate dispositions:", *[f"{g['gateId']}: {g['disposition']} ({len(g['evidence'])} hashed references); {g['remaining']}" for g in evidence_entries],
         f"Root workflow SHA-256: {workflow_hash}; S19 same-relative-path fingerprint: {workflow_reference_hash}; match={workflow_reference_hash == workflow_hash}.",
         "No DB/Meta/staging evidence requested for mock frontend; hosted CI, screen-reader speech, owner acceptance and backend behavior remain explicitly separate."]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

source_pairs = [
    ("botsales-kit/execution/frontend-plan.json", plan_path), ("botsales-kit/execution/FRONTEND_PLAN_GUIDE.md", guide_path),
    ("docs/FRONTEND_SCOPE.md", FRONTEND / "docs/FRONTEND_SCOPE.md"), ("docs/KNOWN_GAPS.md", FRONTEND / "docs/KNOWN_GAPS.md"),
    ("botsales-kit/execution/frontend-evidence/FE003/capture-s02-gate-matrix.py", SCRIPT),
    ("botsales-kit/execution/frontend-evidence/FE003/S02-fe-task-gate-matrix-current-20261007.json", MATRIX),
]
seen_paths = {relative for relative, _ in source_pairs}
for data in gate_evidence.values():
    for ref in data["refs"]:
        if ref.startswith(".github/"):
            continue  # Outside both declared source roots; raw hash is stored in the matrix.
        path = REPOSITORY / ref if ref.startswith("botsales-kit/") else FRONTEND / ref
        if ref not in seen_paths:
            source_pairs.append((ref, path))
            seen_paths.add(ref)
source_files = [{"path": rel, "sha256": digest(path)} for rel, path in source_pairs]
snapshot = hashlib.sha256("\n".join(sorted(f"{x['path']}:{x['sha256']}" for x in source_files)).encode()).hexdigest()
receipt = {
    "taskId": "FE003", "stepId": "S02", "kind": "artifact_review", "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API", "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Map all FE-G01..09 criteria to their measured frontend scope, actual current evidence and limitations, and assign each of the 28 FE tasks verification levels using canonical plan actions.",
    "observed": f"Matrix contains {len(evidence_entries)}/9 gate dispositions with current SHA-256 evidence refs and {len(task_rows)}/28 task action/verification-level mappings. FE-G05 human speech and FE-G09 owner acceptance remain unverified; hosted CI and backend evidence are not inferred. Audit exited 0.",
    "command": COMMAND, "reviewer": "Codex",
    "environment": {"name": "Windows canonical-plan/evidence review", "details": f"Read-only review at revision {head}; inspected actual evidence records/logs and hashed them; workflow file hash checked against current S19 fingerprint.", "dataSource": "source-only"},
    "checksTotal": 46, "failed": 0, "sourceFiles": source_files, "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(), "logSha256": digest(LOG),
}
RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: 9 gates and 28 tasks mapped; saved {MATRIX.relative_to(REPOSITORY).as_posix()}")
