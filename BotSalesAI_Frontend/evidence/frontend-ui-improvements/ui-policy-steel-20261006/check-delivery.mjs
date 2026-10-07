import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Task-local delivery validation, not the permanent policy/evidence gate planned in S14/S17.
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../..');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const audit = JSON.parse(fs.readFileSync(path.join(directory, 'audit.json'), 'utf8'));
const failures = [];
const expectedDocChanges = new Set(['apps/web/src/shared/ui/README.md']);
const immutable = audit.sourceHashes.map(item => {
    const current = fs.existsSync(path.join(root, item.file)) ? hash(path.join(root, item.file)) : null;
    if (current !== item.sha256 && !expectedDocChanges.has(item.file)) failures.push(`Unexpected immutable change: ${item.file}`);
    return { ...item, current, unchanged: current === item.sha256, expectedDocumentationChange: expectedDocChanges.has(item.file) };
});
const docs = ['AGENTS.md', 'README.md', 'DESIGN.md', 'UX-CONTRACT.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/FRONTEND_SPACING_STANDARD.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'botsales-kit/docs/18_CODING_STANDARDS.md', 'apps/web/src/shared/ui/README.md', 'evidence/REPORT.md', 'evidence/frontend-ui-improvements/ui-policy-steel-20261006/REPORT.md'];
const standard = fs.readFileSync(path.join(root, 'docs/FRONTEND_SPACING_STANDARD.md'), 'utf8');
const ruleIds = [...standard.matchAll(/^\*\*SPC-(\d{3}) —/gm)].map(match => Number(match[1]));
if (ruleIds.length !== 75 || new Set(ruleIds).size !== 75 || ruleIds.some((value, index) => value !== index + 1)) failures.push('Expected unique sequential SPC-001..075 declarations');
const plan = fs.readFileSync(path.join(root, 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md'), 'utf8');
const taskIds = [...plan.slice(plan.indexOf('<a id="steel-plan">')).matchAll(/^\| S(\d{2}) \|/gm)].map(match => Number(match[1]));
if (taskIds.length !== 20 || new Set(taskIds).size !== 20) failures.push('Expected twenty unique S steps in section16');
const links = [];
const linkWarnings = [];
for (const file of docs) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    if (!source.includes('steel-policy') && !source.includes('SPC-001–075')) failures.push(`Missing policy pointer: ${file}`);
    for (const match of source.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
        const url = match[1].replace(/^<|>$/g, '');
        if (/^(?:https?:|plugin:|app:|#)/.test(url)) continue;
        const [target, anchor] = url.split('#');
        const resolved = path.resolve(path.dirname(path.join(root, file)), decodeURIComponent(target));
        const exists = fs.existsSync(resolved);
        const isCurrentPointer = /steel-policy|steel-plan|ui-policy-steel-20261006/.test(url);
        if (!exists && isCurrentPointer) failures.push(`Missing current link: ${file} -> ${url}`);
        else if (!exists) linkWarnings.push({ file, url, disposition: 'OUTSIDE_CURRENT_POINTER_VALIDATION; review historical link separately' });
        if (exists && ['steel-policy', 'steel-plan'].includes(anchor) && !fs.readFileSync(resolved, 'utf8').includes(`id="${anchor}"`)) failures.push(`Missing current anchor: ${file} -> ${url}`);
        links.push({ file, url, exists });
    }
}
const baselineRules = hash(path.join(root, 'AI_RULES.md'));
if (baselineRules !== hash(path.join(root, 'botsales-kit/AI_RULES.md'))) failures.push('Original root/kit AI_RULES mismatch');
const generation = spawnSync(process.execPath, ['scripts/generate.mjs', '--check'], { cwd: root, encoding: 'utf8' });
fs.writeFileSync(path.join(directory, 'generate-after-policy.log'), `exit=${generation.status}\n${generation.stdout}${generation.stderr}`);
if (generation.status !== 0) failures.push('generate:check equivalent failed after policy');
const status = spawnSync(process.execPath, ['botsales-kit/scripts/progress.mjs', 'status'], { cwd: root, encoding: 'utf8' });
fs.writeFileSync(path.join(directory, 'frontend-status-after-policy.log'), `exit=${status.status}\n${status.stdout}${status.stderr}`);
if (status.status !== 0) failures.push('Read-only FE status failed');
const result = { checkedAt: new Date().toISOString(), status: failures.length ? 'FAIL' : 'PASS_SCOPED', scope: 'Documentation pointers/new stable anchors/rule and step IDs plus unchanged runtime/rules/contracts/generated inputs/ledgers; not an application acceptance gate.', ruleIds, taskIds, immutable, docs: docs.map(file => ({ file, sha256: hash(path.join(root, file)) })), links, linkWarnings, generateExit: generation.status, feStatusExit: status.status, failures, limitations: ['Historical heading anchors not validated; permanent catalog/API/profile/evidence validator is planned, not implemented.', 'No build/full E2E/native200/hosted or owner acceptance in this docs-only delivery.'] };
fs.writeFileSync(path.join(directory, 'delivery-check.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, rules: ruleIds.length, steps: taskIds.length, unchanged: immutable.filter(item => item.unchanged).length, immutableTotal: immutable.length, links: links.length, historicalLinkWarnings: linkWarnings.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
