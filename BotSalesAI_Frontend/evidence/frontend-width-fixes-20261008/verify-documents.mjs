import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, '../../..');
const audit = JSON.parse(fs.readFileSync(path.join(output, '../frontend-ui-document-audit-20261007/audit-current.json'), 'utf8'));
const files = audit.documents.filter(file => ['active-document', 'generated-frontend-view'].includes(file.category) || file.path === 'botsales-kit/execution/FRONTEND_PLAN_GUIDE.md').map(file => file.path);
files.push('BotSalesAI_Frontend/evidence/REPORT.md', ...['REPORT.md', 'ANALOGOUS_PATTERNS.md', 'ACCEPTANCE_GUIDE.md', 'CONTRACT.md'].map(file => 'BotSalesAI_Frontend/evidence/frontend-width-fixes-20261008/' + file));
files.push('BotSalesAI_Frontend/evidence/frontend-corrections-20261008/REPORT.md');
files.push(...['FE001','FE003','FE022','FE023','FE028'].map(id => 'botsales-kit/execution/frontend-evidence/' + id + '/handoff.md'));
files.splice(0, files.length, ...new Set(files));
const hashes = {};
const problems = [];
let links = 0;
const read = file => fs.readFileSync(file, 'utf8');
const withoutFences = text => text.replace(/^\s*(```|~~~)[\s\S]*?^\s*\1[^\n]*$/gm, '');
function anchors(text) {
    const ids = new Set([...text.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
    const occurrences = new Map();
    for (const match of withoutFences(text).matchAll(/^#{1,6}\s+(.+)$/gm)) {
        const id = match[1].trim().toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
        const count = occurrences.get(id) || 0;
        ids.add(count ? `${id}-${count}` : id);
        occurrences.set(id, count + 1);
    }
    return ids;
}
for (const relative of files) {
    const file = path.join(root, relative);
    const bytes = fs.readFileSync(file);
    hashes[relative] = crypto.createHash('sha256').update(bytes).digest('hex');
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(bytes.toString('utf8')))
        problems.push({ file: relative, reason: 'unexpected control character in documentation' });
    const activeText = bytes.toString('utf8').includes('<!-- CORRECTIONS_CURRENT -->')
        ? bytes.toString('utf8').split('## HISTORICAL_SNAPSHOT')[0] : bytes.toString('utf8');
    for (const match of withoutFences(activeText).matchAll(/\]\(([^\s)]+)\)/g)) {
        const target = match[1];
        if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
        const [destination, fragment] = target.split('#');
        const candidate = destination ? path.resolve(path.dirname(file), decodeURIComponent(destination)) : file;
        links++;
        if (candidate !== root && !candidate.startsWith(root + path.sep)) { problems.push({ file: relative, target, reason: 'outside repository' }); continue; }
        if (!fs.existsSync(candidate)) { problems.push({ file: relative, target, reason: 'missing path' }); continue; }
        if (fragment && /\.(?:md|txt)$/i.test(candidate) && !anchors(read(candidate)).has(decodeURIComponent(fragment)))
            problems.push({ file: relative, target, reason: 'missing anchor' });
    }
}
const frontend = path.join(root, 'BotSalesAI_Frontend');
const plan = read(path.join(frontend, 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md'));
const tasks = [...plan.matchAll(/^\| (UI\d{3}) \|[^\n]*\| (DONE|IN_PROGRESS) \| (\d+)\/(\d+) \|/gm)]
    .map(match => ({ id: match[1], status: match[2], done: Number(match[3]), total: Number(match[4]) }));
const feStatus = JSON.parse(execFileSync(process.execPath, ['scripts/progress.mjs', 'status'], { cwd: path.join(root, 'botsales-kit'), encoding: 'utf8' }));
const generated = JSON.parse(read(path.join(root, 'botsales-kit/execution/frontend-progress-report.json')));
if (generated.verifiedSteps !== feStatus.verifiedSteps || generated.overallPercent !== feStatus.overallPercent) problems.push({ reason: 'generated frontend progress differs from effective tracker' });
if (tasks.length !== 28 || tasks.reduce((sum, task) => sum + task.total, 0) !== 140) problems.push({ reason: 'UI backlog denominator changed unexpectedly' });
if (!plan.includes('id="ui-rollout-status"')) problems.push({ reason: 'live status anchor missing' });
const liveStatus = plan.slice(plan.indexOf('### 16.6.'), plan.indexOf('### 16.7.'));
const s17Row = liveStatus.split('\n').find(line => line.startsWith('| S17 |')) || '';
for (const [stage, label] of [['contracts', 'contract'], ['layout', 'layout'], ['evidence-validator', 'validator']]) {
    const pointer = JSON.parse(read(path.join(output, stage + '-latest.json')));
    const recordPath = path.join(root, pointer.record), record = JSON.parse(read(recordPath));
    const logPath = path.join(root, record.log.path), log = read(logPath);
    const count = Number(log.match(/\bpass (\d+)\s/)?.[1] || 0);
    const logHash = crypto.createHash('sha256').update(fs.readFileSync(logPath)).digest('hex');
    if (record.exitCode || record.sourceDrift.length || logHash !== record.log.sha256 || !count || !new RegExp('\\b' + count + ' ' + label + '\\b').test(s17Row))
        problems.push({ reason: 'current S17 count does not match its actual successful gate log', stage, count });
    hashes[path.relative(root, recordPath).replaceAll('\\', '/')] = crypto.createHash('sha256').update(fs.readFileSync(recordPath)).digest('hex');
    hashes[record.log.path] = logHash;
}
hashes[path.relative(root, fileURLToPath(import.meta.url)).replaceAll('\\', '/')] = crypto.createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
const standard = read(path.join(frontend, 'docs/FRONTEND_SPACING_STANDARD.md'));
const ruleIds = [...standard.matchAll(/^\*\*SPC-(\d{3})\s*[—–-]/gm)].map(match => Number(match[1]));
if (ruleIds.length !== 75 || ruleIds.some((id, index) => id !== index + 1)) problems.push({ reason: 'normative SPC IDs are missing, duplicated or out of order', ruleIds });
if (fs.existsSync(path.join(frontend, 'botsales-kit'))) problems.push({ reason: 'duplicate nested kit exists' });
const report = { checkedAt: new Date().toISOString(), scope: 'Active documents and generated frontend views: local paths/anchors, stable normative SPC IDs, backlog arithmetic, effective FE display, canonical kit location. No external web or runtime claim.', documents: files.length, links, normativeRuleCount: ruleIds.length, problems, sourceFingerprints: hashes, uiBacklog: { tasks: tasks.length, doneTasks: tasks.filter(task => task.status === 'DONE').length, checkpoints: tasks.reduce((sum, task) => sum + task.done, 0), totalCheckpoints: 140 }, effectiveFe: { percent: feStatus.overallPercent, verified: feStatus.verifiedSteps, total: feStatus.totalSteps, stale: feStatus.stale, blocked: feStatus.blocked } };
fs.writeFileSync(path.join(output, 'documents-current.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ documents: report.documents, links, problems, uiBacklog: report.uiBacklog, effectiveFe: { percent: feStatus.overallPercent, staleTasks: feStatus.stale.length } }, null, 2));
process.exitCode = problems.length ? 1 : 0;
