"""Verify FE001.S02 route/source mapping against the canonical manifest and current browser record."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
LOG = SCRIPT.with_name("S02-route-map-audit-current-20261007.log")
RECEIPT = SCRIPT.with_name("S02-route-map-audit-current-20261007.json")
MAP_PATH = FRONTEND / "docs/route-implementation.json"
MANIFEST_PATH = KIT / "contracts/route-manifest.json"
FEATURE_PATH = KIT / "contracts/feature-catalog.json"
E2E_LOG_PATH = FRONTEND / "evidence/frontend-ui-document-sync-20261007/e2e.log"
E2E_RECORD_PATH = FRONTEND / "evidence/frontend-ui-document-sync-20261007/e2e-record.json"
TEST_PATH = FRONTEND / "tests/frontend.spec.ts"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


route_map = json.loads(MAP_PATH.read_text(encoding="utf-8"))
manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
feature_catalog = json.loads(FEATURE_PATH.read_text(encoding="utf-8"))
e2e_record = json.loads(E2E_RECORD_PATH.read_text(encoding="utf-8"))
e2e_log = E2E_LOG_PATH.read_text(encoding="utf-8", errors="replace")
manifest_by_id = {route["id"]: route for route in manifest["routes"]}
modules_root = FRONTEND / "apps/web/src/modules"
module_directories = {item.name for item in modules_root.iterdir() if item.is_dir()}
fingerprints = e2e_record.get("runtimeSourceFingerprints", {})
checks = 0
rows = []
mapped_modules = set()
mapped_sources = set()
feature_gaps = 0

require(len(route_map) == 54, f"Expected 54 route rows, got {len(route_map)}")
require(len(manifest["routes"]) == 54, f"Expected 54 canonical routes, got {len(manifest['routes'])}")
checks += 2
route_ids = [row.get("routeId") for row in route_map]
route_paths = [row.get("route") for row in route_map]
require(len(set(route_ids)) == len(route_ids), "Duplicate route IDs in map")
require(len(set(route_paths)) == len(route_paths), "Duplicate paths in map")
checks += 2

for row in route_map:
    route_id = row.get("routeId")
    canonical = manifest_by_id.get(route_id)
    require(canonical is not None, f"{route_id}: absent from canonical manifest")
    require(row.get("route") == canonical["path"], f"{route_id}: route path differs from manifest")
    checks += 2

    source_relative = row.get("source", "")
    source_file = FRONTEND / source_relative
    require(source_file.is_file(), f"{route_id}: missing source file {source_relative}")
    source_text = source_file.read_text(encoding="utf-8", errors="replace")
    require(bool(row.get("component")) and row["component"] in source_text,
            f"{route_id}: component {row.get('component')} not found in {source_relative}")
    checks += 2

    module = canonical.get("module")
    source_parts = Path(source_relative).parts
    source_module = source_parts[4] if len(source_parts) > 4 and source_parts[:4] == ("apps", "web", "src", "modules") else None
    require(source_module == module, f"{route_id}: source module {source_module} differs from manifest {module}")
    mapped_modules.add(module)
    mapped_sources.add(source_relative)
    checks += 1

    route_evidence = row.get("routeEvidence", {})
    require(route_evidence.get("testFile") == "tests/frontend.spec.ts", f"{route_id}: unexpected route test reference")
    require(route_evidence.get("result") == "PASS", f"{route_id}: route smoke is not marked PASS")
    require(route_evidence.get("logFile") == "evidence/frontend-ui-document-sync-20261007/e2e.log",
            f"{route_id}: route log reference is not the current captured run")
    require(row.get("state") == "BROWSER_ROUTE_RENDERED_WITH_SYNTHETIC_API",
            f"{route_id}: route state overstates or omits the synthetic browser scope")
    checks += 4

    for coverage in row.get("featureCoverage", []):
        if coverage.get("coverage") != "FRONTEND_INTERACTION_VERIFIED_SYNTHETIC":
            require(bool(coverage.get("gap")), f"{route_id}/{coverage.get('featureId')}: missing explicit gap")
            feature_gaps += 1
        else:
            require(bool(coverage.get("gap")), f"{route_id}/{coverage.get('featureId')}: missing backend/scope limitation")
            feature_gaps += 1
        checks += 1

    fingerprint_key = f"BotSalesAI_Frontend/{source_relative.replace('\\', '/')}"
    require(fingerprints.get(fingerprint_key) == digest(source_file.read_bytes()),
            f"{route_id}: route source differs from full browser-run fingerprint")
    checks += 1
    rows.append(f"{route_id}\t{canonical['path']}\t{module}\t{row['component']}\t{source_relative}\t{row['state']}")

require(mapped_modules == module_directories,
        f"Mapped module set differs from actual directories: mapped={sorted(mapped_modules)} actual={sorted(module_directories)}")
require(len(mapped_modules) == 16, f"Expected 16 modules, got {len(mapped_modules)}")
checks += len(module_directories) + 1

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
require(e2e_record.get("exitCode") == 0, "E2E record exit code is not 0")
require(e2e_record.get("sourceRevision") == head, "E2E record HEAD differs from current HEAD")
require(re.search(r"^\s*504 passed \([^)]+\)\s*$", e2e_log, re.MULTILINE) is not None,
        "Current captured E2E log does not report 504 passed")
chromium_case = re.search(r"^\s*ok \d+ \[chromium\].*all canonical routes render inside the real React demo application", e2e_log, re.MULTILINE)
firefox_case = re.search(r"^\s*ok \d+ \[firefox\].*all canonical routes render inside the real React demo application", e2e_log, re.MULTILINE)
require(chromium_case is not None and firefox_case is not None,
        "Canonical route browser case is not PASS in both recorded engines")
require(len(feature_catalog["features"]) == 64, "Canonical feature catalog count changed from 64")
checks += 6

lines = [
    "FE001.S02 canonical route and module map audit",
    f"Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API",
    f"Current HEAD: {head}",
    f"Canonical manifest routes: {len(manifest['routes'])}",
    f"Route map rows: {len(route_map)}",
    f"Feature catalog entries: {len(feature_catalog['features'])}",
    f"Mapped frontend modules: {len(mapped_modules)} ({', '.join(sorted(mapped_modules))})",
    f"Distinct source files referenced by routes: {len(mapped_sources)}",
    f"Explicit feature scope/gap descriptions reviewed: {feature_gaps}",
    f"Current E2E record: {e2e_record['runId']} exit={e2e_record['exitCode']} started={e2e_record['startedAt']} finished={e2e_record['finishedAt']}",
    f"Current E2E result: 504 passed; canonical route browser case PASS on Chromium and Firefox.",
    "Route map rows: routeId | canonicalPath | module | component | source | recorded state",
    *rows,
    "Conclusion: every route has a current manifest path, source file, component symbol, route test/log pointer, and current E2E source fingerprint. This is React demo + synthetic API evidence; it does not establish backend/provider behavior or every feature acceptance case.",
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

source_paths = {
    "docs/route-implementation.json",
    "tests/frontend.spec.ts",
    "evidence/frontend-ui-document-sync-20261007/e2e.log",
    "evidence/frontend-ui-document-sync-20261007/e2e-record.json",
    *mapped_sources,
    "botsales-kit/contracts/route-manifest.json",
    "botsales-kit/contracts/feature-catalog.json",
    "botsales-kit/execution/frontend-evidence/FE001/audit-route-map.py",
}
source_files = []
for relative in sorted(source_paths):
    resolved = REPOSITORY / relative if relative.startswith("botsales-kit/") else FRONTEND / relative
    require(resolved.is_file(), f"Missing snapshotted source: {relative}")
    source_files.append({"path": relative, "sha256": digest(resolved.read_bytes())})
snapshot = digest("\n".join(sorted(f"{item['path']}:{item['sha256']}" for item in source_files)).encode())
evidence = {
    "taskId": "FE001",
    "stepId": "S02",
    "kind": "artifact_review",
    "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
    "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Map all 54 canonical routes to existing source/components across 16 frontend modules; separate verified browser route rendering from feature and backend scope.",
    "observed": f"54/54 manifest rows and paths match; every mapped component exists in its source file; all 16 module directories are represented; {feature_gaps} feature rows carry explicit synthetic-scope/gap descriptions. Current captured React demo E2E record at HEAD {head} exited 0 with 504/504 cases, including canonical route smoke on Chromium and Firefox; route-source fingerprints match current files.",
    "command": "python execution/frontend-evidence/FE001/audit-route-map.py",
    "reviewer": "Codex",
    "environment": {
        "name": "Local Windows source and captured browser evidence review",
        "details": "Python read-only route/manifest/source audit; the referenced browser result is a React demo run backed by synthetic MSW, not backend integration.",
        "dataSource": "synthetic-msw",
    },
    "checksTotal": checks,
    "failed": 0,
    "sourceFiles": source_files,
    "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(),
    "logSha256": digest(LOG.read_bytes()),
}
RECEIPT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"PASS: {checks} route, source, module, evidence and fingerprint checks")
print(f"Routes={len(route_map)} modules={len(mapped_modules)} routeSources={len(mapped_sources)} features={len(feature_catalog['features'])}")
print(f"E2E={e2e_record['runId']} exit={e2e_record['exitCode']} result=504/504")
print(f"Wrote {LOG.relative_to(REPOSITORY).as_posix()}")
print(f"Wrote {RECEIPT.relative_to(REPOSITORY).as_posix()}")
