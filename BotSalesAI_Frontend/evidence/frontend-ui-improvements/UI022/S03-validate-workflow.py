from __future__ import annotations

import json
import re
from pathlib import Path

import yaml


project_root = Path(__file__).resolve().parents[3]
repository_root = project_root.parent
workflow_path = repository_root / ".github" / "workflows" / "frontend.yml"
old_nested_path = project_root / ".github" / "workflows" / "frontend.yml"
workflow = yaml.load(workflow_path.read_text(encoding="utf-8"), Loader=yaml.BaseLoader)
package = json.loads((project_root / "package.json").read_text(encoding="utf-8"))

assert not old_nested_path.exists(), f"obsolete nested workflow still exists: {old_nested_path}"
assert workflow["name"] == "frontend"
assert set(workflow["on"]) == {"push", "pull_request"}
for event in ("push", "pull_request"):
    assert "BotSalesAI_Frontend/**" in workflow["on"][event]["paths"]
    assert ".github/workflows/frontend.yml" in workflow["on"][event]["paths"]

job = workflow["jobs"]["verify"]
assert job["defaults"]["run"]["working-directory"] == "BotSalesAI_Frontend"
steps = job["steps"]
uses = [step["uses"] for step in steps if "uses" in step]
for reference in uses:
    sha = reference.rsplit("@", 1)[1].split()[0]
    assert re.fullmatch(r"[0-9a-f]{40}", sha), f"action is not pinned to a full SHA: {reference}"

setup = next(step for step in steps if step.get("uses", "").startswith("actions/setup-node@"))
assert setup["with"]["node-version"] == "24"
assert setup["with"]["cache-dependency-path"] == "BotSalesAI_Frontend/package-lock.json"
assert (project_root / "package-lock.json").is_file()

run_commands = [step.get("run") for step in steps]
required_commands = [
    "npm ci",
    "npm audit --audit-level=low",
    "npm run setup",
    "npm run verify",
    "npx playwright install --with-deps chromium",
    "npm run test:e2e",
]
assert all(command in run_commands for command in required_commands)
assert all(command.split()[:3][2] in package["scripts"] for command in ("npm run setup", "npm run verify", "npm run test:e2e"))

artifact_step = steps[-1]
artifact_name = artifact_step["with"]["name"]
artifact_paths = artifact_step["with"]["path"]
assert "${{ github.run_id }}" in artifact_name
assert "${{ github.run_attempt }}" in artifact_name
assert "${{ github.sha }}" in artifact_name
for expected in (
    "BotSalesAI_Frontend/apps/web/dist/",
    "BotSalesAI_Frontend/apps/web/dist-demo/",
    "BotSalesAI_Frontend/test-results/",
):
    assert expected in artifact_paths

print("yaml_parse=PASS")
print("workflow_discovery_path=PASS (repository-root .github/workflows)")
print("old_nested_workflow_removed=PASS")
print("event_filters=PASS (push, pull_request; Frontend paths)")
print("run_working_directory=PASS")
print(f"action_sha_pins=PASS ({len(uses)})")
print("locked_toolchain_and_install_steps=PASS")
print("required_frontend_commands=PASS")
print("revision_scoped_artifacts=PASS (production, demo, Playwright results)")
print("hosted_runner_execution=NOT_RUN")
