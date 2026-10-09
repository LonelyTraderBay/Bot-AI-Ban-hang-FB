import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const output = import.meta.dirname, root = path.resolve(output, '../..'), repo = path.dirname(root);
const recordPath = path.join(output, 'PLANNING_RECORD.json');
const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
const prior = JSON.parse(fs.readFileSync(path.join(root, 'evidence/frontend-width-fixes-20261008/S19-current-evidence.json'), 'utf8'));
const digest = relative => crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, relative))).digest('hex');
const drift = Object.entries(prior.sourceFingerprints).filter(([file, hash]) => digest(file) !== hash).map(([file]) => file);
if (drift.length !== 1 || drift[0] !== record.plan.path) throw Error('Unexpected scope drift: ' + JSON.stringify(drift));
const plan = fs.readFileSync(path.join(repo, record.plan.path), 'utf8');
if (!plan.includes('<a id="shared-consolidation-20261009"></a>') || !plan.includes('### 16.19.') || !plan.includes('PLANNED_NOT_IMPLEMENTED')) throw Error('Missing planning status/anchor');
const slug = heading => heading.trim().toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
const addedContent = plan.split('### 16.19.')[1] + plan.slice(0, plan.indexOf('## Lịch sử phiên bản')) + plan.slice(plan.indexOf('**09/10/2026 — bổ sung hợp nhất'), plan.indexOf('**08/10/2026 — WIDTH.W01'));
const links = [...addedContent.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]).filter(link => !link.startsWith('http'));
for (const link of links) {
  const [file, anchor] = link.split('#');
  const target = file ? path.resolve(root, 'docs', file) : path.join(repo, record.plan.path);
  if (!fs.existsSync(target)) throw Error('Missing link: ' + link);
  if (anchor) {
    const markdown = fs.readFileSync(target, 'utf8');
    const headings = [...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => slug(match[1]));
    if (!markdown.includes(`id="${anchor}"`) && !headings.includes(anchor)) throw Error('Missing anchor: ' + link);
  }
}
const args = ['diff', '--check', '--', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md'];
const check = spawnSync('git', args, {cwd: root, encoding: 'utf8', windowsHide: true});
const logFile = path.join(output, 'planning-diff-check.log');
fs.writeFileSync(logFile, (check.stdout || '') + (check.stderr || ''));
if (check.status !== 0) throw Error('Plan diff check failed');
record.finishedAt = new Date().toISOString();
record.clientDate = '2026-10-09';
record.clientTimezone = 'Asia/Vientiane';
record.plan.afterSha256 = digest(record.plan.path);
record.afterPlanEdit = {
  expectedDocumentationDrift: drift,
  unchangedReferenceFingerprints: Object.keys(prior.sourceFingerprints).length - drift.length,
  productSourceChanged: false,
  linksChecked: links.length,
  diffCheck: {executable: 'git', args, exitCode: check.status, log: path.relative(repo, logFile).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(logFile)).digest('hex')},
};
record.evidenceDisposition = 'Previous manifests retain original document hashes; UI plan now differs. This is planning-only and does not reclassify old full gates as fresh. Implementation requires a new baseline and canonical evidence closure.';
fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({planning: 'RECORDED', clientDate: record.clientDate, ...record.afterPlanEdit, implementation: record.implementation, newRuntimeChecks: record.newRuntimeChecks}));
