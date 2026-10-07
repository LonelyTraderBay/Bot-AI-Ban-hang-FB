// Task-local documentation verification, not S14/S17 permanent runtime gates.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const dir = 'evidence/frontend-ui-improvements/ui-governance-unified-20261006';
const before = JSON.parse(fs.readFileSync(`${dir}/inventory-before-final-sync.json`, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(`${dir}/inventory.json`, 'utf8'));
const docs = ['AGENTS.md', 'botsales-kit/AGENTS.md', 'botsales-kit/AI_RULES_PROJECT.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'README.md', 'DESIGN.md', 'UX-CONTRACT.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md',
  'docs/FRONTEND_SPACING_STANDARD.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'apps/web/src/shared/ui/README.md', 'evidence/REPORT.md'];
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const failures = [], checks = [];
function check(name, actual, pass) {
  checks.push({ name, actual, verdict: pass ? 'PASS' : 'FAIL' });
  if (!pass) failures.push(name);
}
const standard = read(docs[10]), plan = read(docs[11]), catalog = read(docs[12]);
const spc = [...standard.matchAll(/^\*\*SPC-(\d{3}) —/gm)].map(m => Number(m[1]));
check('SPC stable unique sequential 001–075', spc, spc.length === 75 && new Set(spc).size === 75 && spc.every((v, i) => v === i + 1));
const code = [...read(docs[3]).matchAll(/^CODE-(\d{3}) —/gm)].map(m => Number(m[1]));
check('CODE stable unique sequential 001–037', code, code.length === 37 && new Set(code).size === 37 && code.every((v, i) => v === i + 1));
check('Versions/current mode', { standard: '1.25', plan: '16.0', catalog: '2.0' },
  standard.includes('**Phiên bản:** 1.25') && plan.includes('**Phiên bản:** 16.0') && catalog.includes('Catalog v2.0') && plan.includes('trước khi sửa code UI'));
check('One routed workflow in all 14 active docs', docs, docs.every(file => read(file).includes('#unified-workflow')));
const section16 = plan.slice(plan.indexOf('## 16.'));
const steps = [...section16.matchAll(/^\| (S\d{2}) \|([^\n]+)$/gm)].map(m => {
  const cols = m[2].split('|').map(c => c.trim());
  return { id: m[1], dependencies: [...cols[0].matchAll(/S\d{2}/g)].map(m => m[0]), status: cols[3] };
});
check('20 stable step IDs', steps.map(s => s.id), steps.length === 20 && steps.every((s, i) => s.id === `S${String(i + 1).padStart(2, '0')}`));
const byId = new Map(steps.map(s => [s.id, s]));
let cycle = false;
function visit(id, active = new Set(), done = new Set()) {
  if (active.has(id)) { cycle = true; return; }
  if (done.has(id)) return;
  active.add(id);
  for (const dep of byId.get(id)?.dependencies ?? []) {
    if (!byId.has(dep)) failures.push(`Missing dependency ${id}→${dep}`);
    else visit(dep, active, done);
  }
  active.delete(id); done.add(id);
}
steps.forEach(s => visit(s.id));
check('Dependencies acyclic and no optional cleanup prerequisite at S19', steps,
  !cycle && !byId.get('S19')?.dependencies.includes('S13'));
check('Docs-only statuses: 2 audit/spec, 18 runtime steps open', steps.map(s => ({id: s.id, status: s.status})),
  steps[0]?.status === 'DONE_AUDIT' && steps[1]?.status === 'DONE_SPECIFICATION' &&
  steps.slice(2).every(s => /^(READY|TODO)/.test(s.status)));
const exported = [];
for (const file of ['apps/web/src/shared/ui/components.tsx', 'apps/web/src/shared/ui/composition.tsx']) {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  source.statements.forEach(node => {
    if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) exported.push(node.name.text);
  });
}
const contractPart = catalog.slice(catalog.indexOf('## 2. CURRENT/TARGET'), catalog.indexOf('## 4. Owner UI'));
const tableNames = [...contractPart.matchAll(/^\| ([A-Z][A-Za-z]+) \/[^\n]+$/gm)].map(m => m[1]).filter(name => name !== 'Component');
check('CURRENT/TARGET tables cover all 27 real exports once', { exported, tableNames },
  exported.length === 27 && tableNames.length === 27 && new Set(tableNames).size === 27 && exported.every(n => tableNames.includes(n)));
const wavePart = section16.slice(section16.indexOf('### 16.11.'), section16.indexOf('### 16.12.'));
const waves = wavePart.split('\n').filter(l => l.startsWith('| ')).map(l => l.split('|').slice(1, -1).map(c => c.trim()));
const moduleChecks = inventory.modules.map(module => {
  const row = waves.find(cols => cols[1] === module.module);
  const routes = [];
  for (const match of row?.[2].matchAll(/R(\d{2})(?:–R(\d{2}))?/g) ?? []) {
    const a = Number(match[1]), b = Number(match[2] ?? match[1]);
    for (let i = a; i <= b; i++) routes.push(`R${String(i).padStart(2, '0')}`);
  }
  return { module: module.module, files: module.files.length, routes, pass: Boolean(row &&
    Number(row[2].match(/^(\d+)\s*file/)?.[1]) === module.files.length &&
    routes.length === module.routes.length && routes.every(id => module.routes.includes(id))) };
});
check('16 module waves reconcile 24 files /54 routes', moduleChecks,
  moduleChecks.length === 16 && moduleChecks.every(m => m.pass) &&
  moduleChecks.reduce((s, m) => s + m.files, 0) === 24 && moduleChecks.reduce((s, m) => s + m.routes.length, 0) === 54);
const inventoryPass = inventory.files.length === inventory.summary.workspaceRelevantFiles + inventory.summary.externalRelevantFiles &&
  inventory.files.every(f => f.owner && f.category && f.plannedTreatment && f.verificationStatus === 'NOT_RUN_THIS_DOCS_TURN' && f.rolloutSteps.length);
check('File inventory assigned, no inferred UI PASS', { entries: inventory.files.length, summary: inventory.summary, unknownFiles: inventory.unknownFiles },
  inventoryPass && !inventory.unknownFiles.length && !inventory.runtimeUnresolvedOwnImports.length);
const modified = [], protectedFiles = [];
for (const file of before.files) {
  if (docs.includes(file.path)) continue;
  if (!fs.existsSync(file.path) || hash(file.path) !== file.sha256) modified.push(file.path);
  else protectedFiles.push(file.path);
}
check('Code/config/inputs/tests/generated/ledger/originals unchanged', { compared: protectedFiles.length + modified.length, mismatches: modified }, !modified.length);
check('Original Universal root/kit byte identity', { rootHash: hash('AI_RULES.md'), kitHash: hash('botsales-kit/AI_RULES.md') }, hash('AI_RULES.md') === hash('botsales-kit/AI_RULES.md'));
const prior = JSON.parse(read('evidence/frontend-ui-improvements/ui-policy-steel-20261006/delivery-check.json'));
const priorImmutable = prior.immutable.filter(row => !docs.includes(row.file));
const priorChanged = priorImmutable.filter(row => !fs.existsSync(row.file) || hash(row.file) !== row.current).map(row => row.file);
check('Prior measured protected runtime/full-product/FE/rules unchanged', { compared: priorImmutable.length, mismatches: priorChanged }, !priorChanged.length);

const linkDocs = [...docs, `${dir}/REPORT.md`, `${dir}/FILE_INDEX.md`];
let links = 0;
const linkProblems = [];
const slug = value => value.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\- _]/gu, '').trim().replace(/ /g, '-');
function anchors(file) {
  const body = read(file), found = new Set(), collisions = new Map();
  for (const m of body.matchAll(/<a\s+id=["']([^"']+)["']/g)) found.add(m[1]);
  for (const m of body.matchAll(/^#{1,6} (.+)$/gm)) {
    const stem = slug(m[1]), count = collisions.get(stem) ?? 0;
    found.add(`${stem}${count ? `-${count}` : ''}`); collisions.set(stem, count + 1);
  }
  return found;
}
for (const doc of linkDocs) {
  for (const match of read(doc).matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, '');
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue;
    target = target.split(' "')[0];
    const [filePart, anchor] = target.split('#');
    const file = filePart ? path.resolve(path.dirname(doc), decodeURIComponent(filePart)) : path.resolve(doc);
    links++;
    if (!fs.existsSync(file)) linkProblems.push({doc, target, reason: 'missing file'});
    else if (anchor && /\.md$/i.test(file) && !anchors(file).has(decodeURIComponent(anchor))) linkProblems.push({doc, target, reason: 'missing anchor'});
  }
}
check('Local Markdown links and anchors', { documents: linkDocs.length, links, problems: linkProblems }, !linkProblems.length);
const generator = JSON.parse(read(`${dir}/generate-check.json`));
check('Actual npm generator exit', generator, generator.exitCode === 0);
const fe = JSON.parse(read(`${dir}/fe-status.log`));
const feCommand = JSON.parse(read(`${dir}/fe-status-command.json`));
check('Read-only FE freshness command; no blocked external prerequisite',
  {exitCode: feCommand.exitCode, verifiedSteps: fe.verifiedSteps, totalSteps: fe.totalSteps, stale: fe.stale.length, blocked: fe.blocked, next: fe.next},
  feCommand.exitCode === 0 && feCommand.ledgerMutation === false && fe.blocked.length === 0);
const diffChecks = JSON.parse(read(`${dir}/diff-checks.json`));
check('Working/scoped-doc whitespace; staged historic whitespace reported separately', diffChecks,
  diffChecks[0].exitCode === 0 && diffChecks[2].exitCode === 0 && diffChecks[1].currentDocIssues.length === 0);
check('Current local compiler matches pinned dependency; global fallback not certified',
  {actual: ts.version, declared: JSON.parse(read('package.json')).devDependencies.typescript, localPath: fs.realpathSync('node_modules/typescript')},
  ts.version === JSON.parse(read('package.json')).devDependencies.typescript);
const result = { scope: 'docs-only delivery verification; no UI implementation/full-product certification', checkedAt: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS', failures, checks,
  outsideScopeFindings: diffChecks[1].exitCode ? [{type: 'STAGED_WHITESPACE', exitCode: diffChecks[1].exitCode, paths: diffChecks[1].affectedPaths, disposition: diffChecks[1].disposition}] : [],
  unchangedBaseline: `${dir}/inventory-before-final-sync.json`, sourceSnapshots: inventory.checkedAt,
  editedDocs: docs.map(file => ({file, sha256: hash(file)})) };
fs.writeFileSync(`${dir}/validation.json`, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({status: result.status, checks: checks.length, failures, localLinks: links,
  protectedFiles: protectedFiles.length, exports: exported.length, rules: spc.length, steps: steps.length}) + '\n');
process.exitCode = failures.length ? 1 : 0;
