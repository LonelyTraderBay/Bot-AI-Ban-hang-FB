// Task-local proof for the requested design revision; not a product UI gate.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const root = path.resolve(dir, '../../..');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261006/inventory.json'), 'utf8'));
const docs = ['AGENTS.md', 'botsales-kit/AGENTS.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/FRONTEND_SPACING_STANDARD.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'apps/web/src/shared/ui/README.md'];
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const snapshot = () => ({
  checkedAt: new Date().toISOString(),
  indexHash: hash(execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-path', 'index'], { cwd: root, encoding: 'utf8' }).trim()),
  files: inventory.files.filter(row => !docs.includes(row.path)).map(row => ({ path: row.path, sha256: hash(path.resolve(root, row.path)) })),
});
const baseline = path.join(dir, 'before.json');
if (process.argv.includes('--before')) {
  if (fs.existsSync(baseline)) throw new Error('Do not overwrite before evidence');
  fs.writeFileSync(baseline, JSON.stringify(snapshot(), null, 2) + '\n');
  console.log('Captured protected inventory and Git index before documentation edits');
} else {
  const before = JSON.parse(fs.readFileSync(baseline, 'utf8'));
  const after = snapshot();
  const failures = [];
  if (before.indexHash !== after.indexHash) failures.push('Git index changed');
  const changed = after.files.filter(row => before.files.find(old => old.path === row.path)?.sha256 !== row.sha256);
  failures.push(...changed.map(row => `Protected file changed: ${row.path}`));
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const plan = read(docs[6]);
  const standard = read(docs[5]);
  const steps = [...plan.slice(plan.indexOf('## 16.')).matchAll(/^\| (S\d{2}) \|/gm)].map(m => m[1]);
  if (steps.length !== 20 || new Set(steps).size !== 20) failures.push('Step IDs changed or duplicated');
  const rules = [...standard.matchAll(/^\*\*SPC-(\d{3}) —/gm)].map(m => m[1]);
  if (rules.length !== 75 || new Set(rules).size !== 75) failures.push('Rule IDs changed or duplicated');
  const design = plan.slice(plan.indexOf('<a id="design-revision"></a>'));
  const publicApis = ['components.tsx', 'composition.tsx'].flatMap(file => [...read(`apps/web/src/shared/ui/${file}`).matchAll(/^export function (\w+)/gm)].map(match => match[1]));
  const missingApis = publicApis.filter(name => !new RegExp(`\\b${name}\\b`).test(design));
  if (missingApis.length) failures.push(`Shared API decisions missing: ${missingApis.join(', ')}`);
  if (/^\| S\d{2} \|.*\|\s*BLOCKED\b/m.test(plan)) failures.push('Unexpected BLOCKED step');
  for (const file of docs) {
    const source = read(file);
    if (!source.includes('#unified-workflow')) failures.push(`Missing canonical workflow: ${file}`);
    for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].replace(/^<|>$/g, '').split('#')[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      if (!fs.existsSync(path.resolve(root, path.dirname(file), target))) failures.push(`Missing link: ${file} -> ${target}`);
    }
  }
  const result = { checkedAt: after.checkedAt, mode: 'DOCS_ONLY_DESIGN_REVISION', verdict: failures.length ? 'FAIL' : 'PASS', protectedFiles: after.files.length, changedProtectedFiles: changed, indexUnchanged: before.indexHash === after.indexHash, stableSteps: steps.length, stableRules: rules.length, publicApis, missingApiDecisions: missingApis, linkCheck: 'Local target existence, not all Markdown anchor validation', docs: docs.map(file => ({ path: file, sha256: hash(path.join(root, file)) })), failures, runtimeChecks: 'NOT_RUN_THIS_DOCS_TURN' };
  fs.writeFileSync(path.join(dir, 'validation.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  process.exitCode = failures.length ? 1 : 0;
}
