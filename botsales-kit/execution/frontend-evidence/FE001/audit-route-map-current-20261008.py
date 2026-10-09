"""Reconcile FE001.S02 against the current route matrix and captured browser evidence."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import re
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
MAP_PATH = FRONTEND / "docs/route-implementation.json"
MANIFEST_PATH = KIT / "contracts/route-manifest.json"
FEATURE_PATH = KIT / "contracts/feature-catalog.json"
E2E_RELATIVE = "execution/frontend-evidence/FE009/S02-e2e-current-20261007.log"
E2E_PATH = KIT / E2E_RELATIVE
E2E_RECEIPT_PATH = KIT / "execution/frontend-evidence/FE009/S02-current-20261007.json"
MATRIX_RECEIPT_PATH = KIT / "execution/frontend-evidence/FE022/S01-current-20261008.json"
MATRIX_LOG_PATH = KIT / "execution/frontend-evidence/FE022/S01-route-matrix-current-20261008.log"
LOG = SCRIPT.with_name("S02-route-map-audit-current-20261008.log")
RECEIPT = SCRIPT.with_name("S02-route-map-audit-current-20261008.json")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    global checks
    checks += 1
    if not condition:
        raise AssertionError(message)


def read_json(file: Path):
    return json.loads(file.read_text(encoding="utf-8"))


def frontend_source(relative: str) -> Path:
    file = (FRONTEND / relative).resolve()
    require(file.is_relative_to(FRONTEND.resolve()), f"Frontend source escapes workspace: {relative}")
    require(file.is_file(), f"Missing frontend source: {relative}")
    return file


def resolve_matrix_path(relative: str) -> Path:
    file = (FRONTEND / relative).resolve()
    require(file.is_relative_to(REPOSITORY.resolve()), f"Evidence path escapes repository: {relative}")
    require(file.is_file(), f"Missing referenced evidence: {relative}")
    return file


checks = 0
route_map = read_json(MAP_PATH)
manifest = read_json(MANIFEST_PATH)
feature_catalog = read_json(FEATURE_PATH)
e2e_receipt = read_json(E2E_RECEIPT_PATH)
matrix_receipt = read_json(MATRIX_RECEIPT_PATH)
e2e_log = E2E_PATH.read_text(encoding="utf-8", errors="replace")
manifest_by_id = {route["id"]: route for route in manifest["routes"]}
feature_by_id = {feature["id"]: feature for feature in feature_catalog["features"]}
module_root = FRONTEND / "apps/web/src/modules"
module_directories = {entry.name for entry in module_root.iterdir() if entry.is_dir()}
head = subprocess.run(
    ["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
    text=True, encoding="utf-8", check=True,
).stdout.strip()

require(len(route_map) == 54, f"Expected 54 mapped routes, got {len(route_map)}")
require(len(manifest["routes"]) == 54, f"Expected 54 manifest routes, got {len(manifest['routes'])}")
require(len({row.get("routeId") for row in route_map}) == len(route_map), "Duplicate route IDs")
require(len({row.get("route") for row in route_map}) == len(route_map), "Duplicate route paths")
require(len(feature_catalog["features"]) == 64, "Expected 64 canonical feature IDs")
require(e2e_receipt.get("sourceRevision", "").find(head[:7]) >= 0, "FE009 browser receipt is from another HEAD")
require(e2e_receipt.get("result") == "PASS" and e2e_receipt.get("failed") == 0,
        "FE009 full E2E evidence receipt is not PASS")
require("512/512" in e2e_receipt.get("observed", ""), "FE009 receipt does not record 512/512 E2E cases")
require(e2e_receipt.get("logFile") == f"execution/frontend-evidence/FE009/S02-e2e-current-20261007.log",
        "FE009 receipt points to a different browser log")
require(e2e_receipt.get("logSha256") == digest(E2E_PATH.read_bytes()), "FE009 browser log hash mismatch")
e2e_command_result = next((item for item in e2e_receipt.get("commandResults", []) if item.get("commandId") == "e2e"), None)
require(e2e_command_result is not None and e2e_command_result.get("exitCode") == 0 and e2e_command_result.get("passed") == 512,
        "FE009 E2E command result does not record exit 0 and 512 passing cases")
require(matrix_receipt.get("result") == "PASS", "FE022 route-matrix receipt is not PASS")
require(matrix_receipt.get("logFile") == f"execution/frontend-evidence/FE009/S02-e2e-current-20261007.log",
        "FE022 matrix receipt points to a different full browser log")
require(matrix_receipt.get("logSha256") == digest(E2E_PATH.read_bytes()), "FE022 full browser log hash mismatch")
require("512-test" in matrix_receipt.get("observed", ""), "FE022 matrix receipt does not bind the 512-test run")

# The matrix receipt captures the source snapshot taken while generating this route map.
matrix_source_checks = 0
for item in matrix_receipt.get("sourceFiles", []):
    relative = item["path"]
    if relative.startswith("../botsales-kit/"):
        file = KIT / relative.removeprefix("../botsales-kit/")
    else:
        file = frontend_source(relative)
    require(file.is_file(), f"Missing FE022 source snapshot file: {relative}")
    require(digest(file.read_bytes()) == item["sha256"], f"FE022 source snapshot changed: {relative}")
    matrix_source_checks += 1
require(matrix_source_checks == 40, f"Expected 40 FE022 source snapshots, got {matrix_source_checks}")

require(re.search(r"^\s*512 passed \([^)]+\)\s*$", e2e_log, re.MULTILINE) is not None,
        "Full E2E log does not report 512 passed")
for engine in ("chromium", "firefox"):
    route_case = re.search(
        rf"^\s*ok\s+\d+ \[{engine}\].*all canonical routes render inside the real React demo application",
        e2e_log, re.MULTILINE,
    )
    require(route_case is not None, f"Canonical route smoke is missing for {engine}")
matrix_case = re.search(
    r"^\s*ok\s+\d+ \[chromium\].*FE022\.S05 route and feature matrix covers canonical IDs with executed cases or explicit frontend gaps",
    e2e_log, re.MULTILINE,
)
require(matrix_case is not None, "FE022.S05 route/feature matrix browser case is missing")

mapped_modules = set()
mapped_sources = set()
feature_rows = []
referenced_tests = {"tests/frontend.spec.ts", "tests/vertical-slices/fe022-flows.spec.ts"}
route_lines = []
for row in route_map:
    route_id = row.get("routeId")
    canonical = manifest_by_id.get(route_id)
    require(canonical is not None, f"{route_id}: missing from canonical manifest")
    require(row.get("route") == canonical["path"], f"{route_id}: path differs from canonical manifest")
    source_relative = row.get("source", "")
    source_file = frontend_source(source_relative)
    source_text = source_file.read_text(encoding="utf-8", errors="replace")
    require(bool(row.get("component")) and row["component"] in source_text,
            f"{route_id}: component {row.get('component')} missing from {source_relative}")
    module = canonical.get("module")
    source_parts = Path(source_relative).parts
    source_module = source_parts[4] if len(source_parts) > 4 and source_parts[:4] == ("apps", "web", "src", "modules") else None
    require(source_module == module, f"{route_id}: source module {source_module} differs from {module}")
    mapped_modules.add(module)
    mapped_sources.add(source_relative)

    route_evidence = row.get("routeEvidence", {})
    require(route_evidence.get("testFile") == "tests/frontend.spec.ts", f"{route_id}: route test file mismatch")
    require(route_evidence.get("testTitle") == "all canonical routes render inside the real React demo application",
            f"{route_id}: route test title mismatch")
    require(route_evidence.get("result") == "PASS", f"{route_id}: route smoke is not marked PASS")
    require(resolve_matrix_path(route_evidence.get("logFile", "")) == E2E_PATH.resolve(),
            f"{route_id}: route evidence does not point to the current FE009 full E2E log")
    require(row.get("state") == "BROWSER_ROUTE_RENDERED_WITH_SYNTHETIC_API",
            f"{route_id}: route state overstates or omits synthetic scope")
    referenced_tests.add(route_evidence["testFile"])

    route_feature_rows = row.get("featureCoverage", [])
    require(route_feature_rows == sorted(route_feature_rows, key=lambda item: item.get("featureId", "")),
            f"{route_id}: feature coverage ordering is unstable")
    for coverage in route_feature_rows:
        feature_id = coverage.get("featureId")
        canonical_feature = feature_by_id.get(feature_id)
        require(canonical_feature is not None, f"{route_id}/{feature_id}: unknown canonical feature")
        require(route_id in canonical_feature.get("routeIds", []), f"{route_id}/{feature_id}: route not canonical")
        require(coverage.get("canonicalRouteIds") == canonical_feature["routeIds"],
                f"{route_id}/{feature_id}: canonical route IDs differ")
        require(coverage.get("coverage") == "FRONTEND_INTERACTION_VERIFIED_SYNTHETIC",
                f"{route_id}/{feature_id}: unexpected coverage level {coverage.get('coverage')}")
        require("synthetic" in coverage.get("gap", "").lower() and "backend/provider" in coverage.get("gap", "").lower(),
                f"{route_id}/{feature_id}: missing frontend/backend boundary")
        cases = coverage.get("evidenceCases", [])
        require(bool(cases), f"{route_id}/{feature_id}: no named evidence cases")
        require(any(case.get("id") == "ROUTE-SMOKE-54" for case in cases),
                f"{route_id}/{feature_id}: route smoke case missing")
        require(any(case.get("id") != "ROUTE-SMOKE-54" for case in cases),
                f"{route_id}/{feature_id}: feature-specific or journey evidence case missing")
        for case in cases:
            require(case.get("result") == "PASS", f"{route_id}/{feature_id}: non-PASS evidence case")
            require(case.get("title", "") in e2e_log,
                    f"{route_id}/{feature_id}: named browser test not found in the 512-case log: {case.get('title')}")
            require(resolve_matrix_path(case.get("logFile", "")) == E2E_PATH.resolve(),
                    f"{route_id}/{feature_id}: evidence case points to a different browser log")
            test_file = case.get("file", "")
            test_source = frontend_source(test_file).read_text(encoding="utf-8", errors="replace")
            require(case.get("title", "") in test_source,
                    f"{route_id}/{feature_id}: evidence test title not found in {test_file}")
            referenced_tests.add(test_file)
        feature_rows.append((route_id, feature_id, coverage["title"], cases[-1]["title"]))
    route_lines.append(f"{route_id}\t{canonical['path']}\t{module}\t{row['component']}\t{source_relative}")

require(mapped_modules == module_directories,
        f"Mapped module set differs from actual directories: mapped={sorted(mapped_modules)} actual={sorted(module_directories)}")
require(len(mapped_modules) == 16, f"Expected 16 frontend modules, got {len(mapped_modules)}")
require({route["module"] for route in manifest["routes"]} == module_directories,
        "Canonical manifest modules differ from the actual frontend module directories")
require(len(feature_rows) == 65, f"Expected 65 feature-route rows, got {len(feature_rows)}")
require({item[1] for item in feature_rows} == set(feature_by_id), "Mapped feature IDs differ from the canonical catalog")
require(len({item[1] for item in feature_rows}) == 64, "Expected 64 unique feature IDs")

# Build a fresh source snapshot for this audit, relative to the frontend source root.
source_paths = {"docs/route-implementation.json"}
source_paths.update(mapped_sources)
source_paths.update(referenced_tests)
source_paths.update({
    "botsales-kit/contracts/route-manifest.json",
    "botsales-kit/contracts/feature-catalog.json",
    "botsales-kit/execution/frontend-evidence/FE001/audit-route-map-current-20261008.py",
    "botsales-kit/execution/frontend-evidence/FE009/S02-current-20261007.json",
    "botsales-kit/execution/frontend-evidence/FE009/S02-e2e-current-20261007.log",
    "botsales-kit/execution/frontend-evidence/FE022/S01-current-20261008.json",
    "botsales-kit/execution/frontend-evidence/FE022/S01-route-matrix-current-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE022/S04-focused-vertical-slices-current-20261008.log",
    "botsales-kit/execution/frontend-evidence/FE022/S04-current-20261008.json",
    "tests/vertical-slices/generate-route-implementation.mjs",
})
source_files = []
for relative in sorted(source_paths):
    resolved = (KIT / relative.removeprefix("botsales-kit/")) if relative.startswith("botsales-kit/") else frontend_source(relative)
    require(resolved.is_file(), f"Missing snapshotted source: {relative}")
    source_files.append({"path": relative, "sha256": digest(resolved.read_bytes())})
source_snapshot = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())

lines = [
    "FE001.S02 canonical route and module map audit (current 2026-10-08)",
    "Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"Repository HEAD: {head}; browser receipt HEAD prefix: {e2e_receipt['sourceRevision']}",
    "Command: python botsales-kit/execution/frontend-evidence/FE001/audit-route-map-current-20261008.py",
    f"Canonical manifest routes: {len(manifest['routes'])}; mapped route rows: {len(route_map)}",
    f"Canonical feature IDs: {len(feature_catalog['features'])}; feature-route entries: {len(feature_rows)}",
    f"Mapped frontend modules: {len(mapped_modules)} ({', '.join(sorted(mapped_modules))})",
    f"Distinct route source files: {len(mapped_sources)}; feature evidence test files: {len(referenced_tests)}",
    f"Captured browser suite: 512/512; route smoke passed on Chromium and Firefox; FE022.S05 matrix case passed.",
    f"Named feature evidence cases found in the full browser log: {len({case['title'] for row in route_map for feature in row.get('featureCoverage', []) for case in feature.get('evidenceCases', [])})} unique titles.",
    f"FE022 source snapshot compared with current source: {matrix_source_checks}/{matrix_source_checks} hashes match.",
    "This proves the recorded React demo and synthetic API route/interaction checks only; it does not establish live backend/provider behavior or remaining product acceptance.",
    "Route rows: routeId | canonicalPath | module | component | source",
    *route_lines,
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

evidence = {
    "taskId": "FE001",
    "stepId": "S02",
    "kind": "artifact_review",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"HEAD {head}; working tree source snapshot checked",
    "expected": "Map all 54 canonical routes to real source/components across 16 frontend modules; connect each mapped feature to a named passing synthetic browser case and separate this evidence from real backend/provider acceptance.",
    "observed": f"Audited 54/54 canonical route rows, 16/16 actual modules, 64/64 feature IDs across 65 feature-route entries, and {len(mapped_sources)} route source files. Every mapped component exists in its module source; every feature entry has named tests present in the 512-case browser log, plus explicit synthetic/backend-provider limits. The Chromium+Firefox route smoke and FE022.S05 matrix test passed. FE022's 40-file current source snapshot still matches. This is local React demo/MSW evidence only.",
    "command": "python botsales-kit/execution/frontend-evidence/FE001/audit-route-map-current-20261008.py",
    "cwd": str(REPOSITORY),
    "reviewer": "Codex",
    "environment": {
        "name": "Local Windows source and captured browser evidence review",
        "details": "Python read-only audit reconciles canonical contracts, current route source/components, captured FE009 full Chromium/Firefox log and FE022 route-matrix/source-snapshot evidence. No live backend/provider was invoked.",
        "dataSource": "synthetic-msw",
    },
    "checksTotal": checks,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": source_snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: {checks} route, source, module, evidence and fingerprint checks")
print(f"Routes={len(route_map)} modules={len(mapped_modules)} routeSources={len(mapped_sources)} featureRows={len(feature_rows)} uniqueFeatures={len(feature_by_id)}")
print("E2E=512/512 routeSmoke=Chromium+Firefox matrix=PASS syntheticBackendBoundary=explicit")
print(f"FE022 source snapshot={matrix_source_checks}/{matrix_source_checks} hashes match")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
