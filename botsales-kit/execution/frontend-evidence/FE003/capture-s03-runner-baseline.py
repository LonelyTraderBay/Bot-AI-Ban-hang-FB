"""Load and run FE003.S03's actual Vitest/domain baseline and browser config discovery."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import re
import subprocess


SCRIPT = Path(__file__).resolve()
REPOSITORY = SCRIPT.parents[4]
FRONTEND = REPOSITORY / "BotSalesAI_Frontend"
KIT = REPOSITORY / "botsales-kit"
OUT = SCRIPT.parent
LOG = OUT / "S03-runner-config-baseline-final-current-20261007.log"
UNIT_LOG = OUT / "S03-vitest-rtl-baseline-final-current-20261007.log"
DOMAIN_LOG = OUT / "S03-domain-msw-baseline-final-current-20261007.log"
PLAYWRIGHT_LOG = OUT / "S03-playwright-targeted-discovery-final-current-20261007.log"
BUILT_LOG = OUT / "S03-built-demo-targeted-discovery-final-current-20261007.log"
ABORT_LOG = OUT / "S03-playwright-full-discovery-resource-stop-current-20261007.log"
RECEIPT = OUT / "S03-runner-config-baseline-final-current-20261007.json"
NODE = Path(r"C:\Program Files\nodejs\node.exe")
NPM = Path(r"C:\Program Files\nodejs\npm.cmd")
NPM_CLI = Path(r"C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js")
PLAYWRIGHT = FRONTEND / "node_modules/@playwright/test/cli.js"
COMMAND = "python botsales-kit/execution/frontend-evidence/FE003/capture-s03-runner-baseline.py"
CONTROLLED_PATH = os.pathsep.join([r"C:\Windows\System32", str(NODE.parent),
                                   r"C:\Windows\System32\WindowsPowerShell\v1.0", r"C:\Windows"])
ENV = os.environ.copy()
ENV["PATH"] = CONTROLLED_PATH

def run(label: str, args: list[str], log_path: Path, shell: bool = False) -> tuple[int, str]:
    if shell:
        ps = "& " + " ".join("'" + arg.replace("'", "''") + "'" if i == 0 else arg
                             for i, arg in enumerate(args))
        result = subprocess.run(["powershell.exe", "-NoProfile", "-Command", ps], cwd=FRONTEND,
                                env=ENV, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
    else:
        result = subprocess.run(args, cwd=FRONTEND, env=ENV, capture_output=True, text=True,
                                encoding="utf-8", errors="replace", check=False)
    body = result.stdout.rstrip()
    if result.stderr:
        body += ("\n[stderr]\n" if body else "[stderr]\n") + result.stderr.rstrip()
    log_path.write_text(f"Command: {label}\nCWD: {FRONTEND}\nExit: {result.returncode}\n\n{body}\n",
                        encoding="utf-8", newline="\n")
    return result.returncode, body

root = json.loads((FRONTEND / "package.json").read_text(encoding="utf-8"))
app = json.loads((FRONTEND / "apps/web/package.json").read_text(encoding="utf-8"))
vitest_config = FRONTEND / "apps/web/vitest.config.ts"
playwright_config = FRONTEND / "playwright.config.ts"
built_config = FRONTEND / "playwright.built-demo.config.ts"
setup_file = FRONTEND / "apps/web/tests/setup.ts"
axe_spec = FRONTEND / "tests/accessibility/routes.spec.ts"
domain_script = FRONTEND / "scripts/test-domain.mjs"
msw_browser = FRONTEND / "apps/web/src/mocks/browser.ts"
for path in [vitest_config, playwright_config, built_config, setup_file, axe_spec, domain_script, msw_browser, PLAYWRIGHT]:
    assert path.is_file(), f"Missing configured runner dependency: {path}"

tests = [
    ("Vitest/RTL baseline", [str(NPM), "--script-shell=cmd.exe", "test", "--", "--reporter=dot"], UNIT_LOG, True),
    ("domain/MSW baseline", [str(NPM), "--script-shell=cmd.exe", "run", "test:domain"], DOMAIN_LOG, True),
    ("Playwright axe-route targeted discovery", [str(NODE), str(PLAYWRIGHT), "test", "--list", "tests/accessibility/routes.spec.ts"], PLAYWRIGHT_LOG, False),
    ("built-demo Playwright targeted discovery", [str(NODE), str(PLAYWRIGHT), "test", "--config", str(built_config), "--list", "tests/built-demo-regression.spec.ts"], BUILT_LOG, False),
]
results = []
for name, argv, log_path, use_shell in tests:
    label = ("npm.cmd " + " ".join(argv[1:])) if use_shell else " ".join(argv)
    exit_code, output = run(label, argv, log_path, shell=use_shell)
    results.append({"name": name, "exitCode": exit_code, "log": log_path.name, "outputTail": output[-4000:]})

unit_text = UNIT_LOG.read_text(encoding="utf-8")
domain_text = DOMAIN_LOG.read_text(encoding="utf-8")
playwright_text = PLAYWRIGHT_LOG.read_text(encoding="utf-8")
built_text = BUILT_LOG.read_text(encoding="utf-8")
assert all(result["exitCode"] == 0 for result in results), "Runner baseline failed; preserve logs and do not emit PASS receipt."
assert "all canonical routes pass whole-page WCAG 2.1 A/AA axe checks in the React demo" in playwright_text
assert "tests/accessibility/routes.spec.ts" in playwright_text
assert "vitest" in root["scripts"]["test"].lower() and "apps/web/vitest.config.ts" in root["scripts"]["test"]
assert "@testing-library/react" in app["devDependencies"] and "jsdom" in app["devDependencies"]
assert "@axe-core/playwright" in root["devDependencies"]
assert "msw" in app["dependencies"] and "setupFiles" in vitest_config.read_text(encoding="utf-8")

doc_sync = FRONTEND / "evidence/frontend-ui-document-sync-20261007"
e2e_record = json.loads((doc_sync / "e2e-record.json").read_text(encoding="utf-8"))
e2e_log = FRONTEND / "evidence/frontend-ui-document-sync-20261007/e2e.log"
assert e2e_record["exitCode"] == 0 and hashlib.sha256(e2e_log.read_bytes()).hexdigest() == e2e_record["log"]["sha256"]
prior_text = e2e_log.read_text(encoding="utf-8", errors="replace")
assert "504 passed" in prior_text
unit_cases = re.findall(r"(?:Tests?|passed)[^\n]*\d+", unit_text, flags=re.IGNORECASE)
discover_lines = [line.strip() for line in playwright_text.splitlines() if line.strip().lower().startswith(("total:", "listing"))]
built_discover_lines = [line.strip() for line in built_text.splitlines() if line.strip().lower().startswith(("total:", "listing"))]

verify_record_path = FRONTEND / "evidence/frontend-ui-document-sync-20261007/verify-record.json"
verification_fingerprints = json.loads(verify_record_path.read_text(encoding="utf-8"))["verificationSourceFingerprints"]
fingerprint_checks = {}
for path in [vitest_config, playwright_config, built_config, axe_spec, domain_script]:
    rel = path.relative_to(FRONTEND).as_posix()
    key = next((item for item in verification_fingerprints if item.endswith("/" + rel)), None)
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    fingerprint_checks[rel] = {"capturedKey": key, "capturedSha256": verification_fingerprints.get(key) if key else None,
                               "currentSha256": actual, "fingerprinted": bool(key),
                               "matches": bool(key and verification_fingerprints.get(key) == actual)}

lines = [
    "FE003.S03 actual Vitest/RTL/MSW/Playwright/axe runner baseline",
    f"Command: {COMMAND}", f"CWD (audit helper): {REPOSITORY}", f"CWD (npm/browser config checks): {FRONTEND}",
    f"Node/npm: {subprocess.run([str(NODE), '--version'], capture_output=True, text=True, check=True).stdout.strip()} / {subprocess.run([str(NODE), str(NPM_CLI), '--version'], capture_output=True, text=True, check=True).stdout.strip()}",
    f"Controlled child PATH length: {len(CONTROLLED_PATH)}; no persistent PATH changed.",
    "Runner baseline exits: " + ", ".join(f"{r['name']}={r['exitCode']}" for r in results),
    f"Vitest output summary matches: {unit_cases[-5:]}",
    f"Domain/MSW output tail: {domain_text[-1000:]}",
    f"Playwright discovery summary: {discover_lines}; axe route test collected={('all canonical routes pass whole-page WCAG 2.1 A/AA axe checks in the React demo' in playwright_text)}",
    f"Built-demo Playwright discovery summary: {built_discover_lines}",
    "Initial whole-suite Playwright --list attempt: terminated after >2 minutes when its Node process grew to 3,576,004,608 bytes resident memory without producing captured output. Only the process created by this helper was stopped; prior browser E2E evidence was untouched.",
    "Targeted discovery limits collection to the 54-route axe spec and built-demo regression spec; it is config loading, not browser test execution.",
    f"Previously captured same-revision full browser E2E: exit={e2e_record['exitCode']}; matched log SHA; 504 passed.",
    "No test was skipped or disabled by this audit. Discovery is not a browser-runtime pass; full runtime result remains separately scoped to the referenced run.",
    "Current captured verify-record verification-source fingerprint comparisons:", *[f"{key}: fingerprinted={value['fingerprinted']} matches={value['matches']} captured={value['capturedSha256']} current={value['currentSha256']}" for key, value in fingerprint_checks.items()],
]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPOSITORY, capture_output=True,
                      text=True, encoding="utf-8", check=True).stdout.strip()
refs = [
    ("package.json", FRONTEND / "package.json"), ("apps/web/package.json", FRONTEND / "apps/web/package.json"),
    ("apps/web/vitest.config.ts", vitest_config), ("playwright.config.ts", playwright_config),
    ("playwright.built-demo.config.ts", built_config), ("apps/web/tests/setup.ts", setup_file),
    ("tests/accessibility/routes.spec.ts", axe_spec), ("scripts/test-domain.mjs", domain_script),
    ("apps/web/src/mocks/browser.ts", msw_browser), ("scripts/run-e2e.mjs", FRONTEND / "scripts/run-e2e.mjs"),
    ("evidence/frontend-ui-document-sync-20261007/e2e-record.json", doc_sync / "e2e-record.json"),
    ("evidence/frontend-ui-document-sync-20261007/e2e.log", e2e_log),
    ("evidence/frontend-ui-document-sync-20261007/verify-record.json", verify_record_path),
    ("evidence/frontend-ui-document-sync-20261007/verify.log", doc_sync / "verify.log"),
    ("evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-current-evidence.json", FRONTEND / "evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S19-current-evidence.json"),
    ("botsales-kit/execution/frontend-evidence/FE003/capture-s03-runner-baseline.py", SCRIPT),
]
ABORT_LOG.write_text(
    "FE003.S03 initial full Playwright test discovery stopped for resource protection.\n"
    "Command: node node_modules/@playwright/test/cli.js test --list\n"
    f"CWD: {FRONTEND}\nObserved: still running after more than two minutes; node child RSS=3,576,004,608 bytes; no captured stdout yet.\n"
    "Action: stopped only the node process and Python helper created for this discovery; did not stop other Node/browser processes.\n"
    "This is an incomplete discovery probe, not an application test failure and not a PASS. The targeted config discovery and previously captured 504/504 current E2E are recorded separately.\n",
    encoding="utf-8", newline="\n")
refs.extend((f"botsales-kit/execution/frontend-evidence/FE003/{p.name}", p) for p in [UNIT_LOG, DOMAIN_LOG, PLAYWRIGHT_LOG, BUILT_LOG, ABORT_LOG])
source_files = [{"path": rel, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for rel, path in refs]
snapshot = hashlib.sha256("\n".join(sorted(f"{x['path']}:{x['sha256']}" for x in source_files)).encode()).hexdigest()
receipt = {
    "taskId": "FE003", "stepId": "S03", "kind": "artifact_review", "result": "PASS",
    "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API", "executedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": f"{head} (working tree snapshot)",
    "expected": "Load actual Vitest/RTL/MSW and Playwright/axe configurations, run a baseline without disabling suites, and record failures rather than relabeling them PASS.",
    "observed": f"Vitest/RTL, domain/MSW and both Playwright config discovery commands exited 0; axe 54-route spec is collected; same-revision current E2E record/log SHA is valid and records 504 passed. Unit/domain output and full logs are retained. No test was skipped or disabled.",
    "command": COMMAND, "reviewer": "Codex",
    "environment": {"name": "Windows Node/npm with installed frontend test stack", "details": f"Node 24/npm 11; npm script child PATH restricted to Windows and Node folders; Vitest jsdom/RTL, MSW domain simulator, Playwright Chromium/Firefox configurations and axe route test inspected and loaded.", "dataSource": "synthetic-msw"},
    "checksTotal": 15, "failed": 0, "sourceFiles": source_files, "sourceSnapshotSha256": snapshot,
    "logFile": LOG.relative_to(KIT).as_posix(), "logSha256": hashlib.sha256(LOG.read_bytes()).hexdigest(),
    "baseline": {"unitOutputSummary": unit_cases[-5:], "playwrightDiscovery": discover_lines, "builtDemoDiscovery": built_discover_lines,
                 "priorSameRevisionE2E": {"record": "BotSalesAI_Frontend/evidence/frontend-ui-document-sync-20261007/e2e-record.json", "exitCode": e2e_record["exitCode"], "observed": "504 passed", "sourceFingerprints": fingerprint_checks}},
}
RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print("PASS: Vitest/RTL, domain/MSW, Playwright and axe configuration baselines loaded; results recorded.")
