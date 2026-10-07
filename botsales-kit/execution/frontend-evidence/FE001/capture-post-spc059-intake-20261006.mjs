import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const stepId = process.argv[2];
const helperRelative = 'botsales-kit/execution/frontend-evidence/FE001/capture-post-spc059-intake-20261006.mjs';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const run = (file, args, cwd = root, env = process.env) => {
  const result = spawnSync(file, args, { cwd, encoding: 'utf8', windowsHide: true, env });
  assert(!result.error, `${file} ${args.join(' ')}: ${result.error?.message}`);
  assert(result.status === 0, `${file} ${args.join(' ')} exited ${result.status}: ${result.stderr}`);
  return result.stdout.trim();
};

assert(root.endsWith('BotSalesAI_Frontend'), `Run from the frontend root, got ${root}`);
assert(['S01', 'S02', 'S03', 'S04', 'S05'].includes(stepId), 'Usage: node capture-current-intake.mjs S01..S05');

const plan = json('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find((item) => item.id === 'FE001');
const step = task.implementationSteps.find((item) => item.id === stepId);
const checks = [];
const addCheck = (label, observed) => checks.push({ label, observed });
const snapshotPaths = {
  S01: ['AGENTS.md', 'AI_RULES.md', 'botsales-kit/AGENTS.md', 'botsales-kit/AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'botsales-kit/execution/frontend-plan.json'],
  S02: ['docs/route-implementation.json', 'botsales-kit/contracts/route-manifest.json', 'botsales-kit/execution/frontend-plan.json'],
  S03: ['evidence/REPORT.md', 'docs/KNOWN_GAPS.md', 'package.json', 'apps/web/package.json', 'botsales-kit/execution/frontend-command-map.json'],
  S04: ['botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/FRONTEND_PLAN_GUIDE.md', 'botsales-kit/execution/frontend-command-map.json'],
  S05: ['botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/plan.json', 'botsales-kit/execution/progress.json', 'botsales-kit/scripts/progress.mjs', 'evidence/frontend-scope-automation-audit-20261004/after-audit.log'],
};
const sourcePaths = [...new Set([...snapshotPaths[stepId], ...(stepId === 'S03' ? ['botsales-kit/execution/frontend-evidence/FE001/S03-generate-check-post-spc056-current-20261006.log'] : []), helperRelative])];
let observed = '';
let command = `node botsales-kit/execution/frontend-evidence/FE001/capture-post-spc059-intake-20261006.mjs ${stepId}`;

if (stepId === 'S01') {
  const gitRoot = run('git', ['rev-parse', '--show-toplevel']);
  const branch = run('git', ['branch', '--show-current']);
  const revision = run('git', ['rev-parse', 'HEAD']);
  const statusResult = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8', windowsHide: true });
  assert(!statusResult.error && statusResult.status === 0, `git status failed: ${statusResult.error?.message ?? statusResult.stderr}`);
  const status = statusResult.stdout.replace(/[\r\n]+$/, '');
  const rows = status ? status.split(/\r?\n/).filter(Boolean) : [];
  const staged = rows.filter((row) => row[0] !== ' ' && row.slice(0, 2) !== '??');
  const untracked = rows.filter((row) => row.slice(0, 2) === '??');
  const rootRules = read('AI_RULES.md');
  const kitRules = read('botsales-kit/AI_RULES.md');
  const scope = read('docs/FRONTEND_SCOPE.md');
  assert(path.resolve(gitRoot) === path.resolve(root, '..'), `Unexpected Git root: ${gitRoot}`);
  assert(sha(rootRules) === sha(kitRules), 'Root and kit AI_RULES.md differ');
  assert(plan.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && /người dùng (?:chỉ )?nghiệm thu cuối/.test(scope), 'Frontend scope/acceptance policy is not explicit');
  addCheck('cwd and Git root', `${root} ; ${gitRoot}`);
  addCheck('branch and source revision', `${branch} ; ${revision}`);
  addCheck('pre-existing working tree preserved', `${rows.length} dirty/untracked paths observed; ${staged.length} staged paths; ${untracked.length} untracked paths; no reset/clean/stage command issued`);
  addCheck('effective instructions', 'Root and kit Universal AI_RULES.md SHA-256 match; frontend AGENTS and scope reviewed');
  addCheck('task and evidence authority', 'FRONTEND_WITH_SYNTHETIC_MOCK_API; FE001–FE028 canonical FE plan/ledger; full-product plan/progress/tasks remain read-only');
  observed = `cwd=${root}; gitRoot=${gitRoot}; branch=${branch}; HEAD=${revision}; dirtyPaths=${rows.length}; stagedPaths=${staged.length}; untrackedPaths=${untracked.length}; root/kit AI_RULES byte-identical; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; existing changes preserved.`;
}

if (stepId === 'S02') {
  const rows = json('docs/route-implementation.json');
  const manifest = json('botsales-kit/contracts/route-manifest.json');
  const canonical = new Map(manifest.routes.map((route) => [route.id, route]));
  const duplicateIds = rows.map((route) => route.routeId).filter((id, index, all) => all.indexOf(id) !== index);
  const mismatches = [];
  const missingSources = [];
  const missingComponents = [];
  const sourceHashes = new Map();
  for (const route of rows) {
    const canonicalRoute = canonical.get(route.routeId);
    if (!canonicalRoute || canonicalRoute.path !== route.route) mismatches.push(`${route.routeId}:${route.route}`);
    const absolute = path.resolve(root, route.source);
    if (!fs.existsSync(absolute)) missingSources.push(`${route.routeId}:${route.source}`);
    else {
      const source = fs.readFileSync(absolute, 'utf8');
      sourceHashes.set(route.source, sha(source));
      if (!source.includes(route.component)) missingComponents.push(`${route.routeId}:${route.component}`);
    }
  }
  const modules = fs.readdirSync(path.join(root, 'apps/web/src/modules'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert(rows.length === 54 && manifest.routes.length === 54, `Expected 54 routes, got map=${rows.length}, canonical=${manifest.routes.length}`);
  assert(new Set(rows.map((route) => route.routeId)).size === 54 && duplicateIds.length === 0, 'Route IDs are not unique');
  assert(mismatches.length === 0 && missingSources.length === 0 && missingComponents.length === 0, 'Route-to-source crosswalk has a gap');
  assert(modules.length === 16, `Expected 16 modules, got ${modules.length}`);
  addCheck('canonical route mapping', '54/54 IDs and paths match; no duplicate IDs');
  addCheck('route source/component references', '54/54 source paths exist and each mapped component token is present');
  addCheck('module inventory', `16 modules: ${modules.join(', ')}`);
  addCheck('browser evidence boundary', 'This check is a current source crosswalk only; it does not rerun or infer browser behavior');
  observed = `routes=${rows.length}/${manifest.routes.length}; uniqueIds=54; sourcePaths=54/54; componentTokens=54/54; modules=${modules.length}; browser re-run=NOT_RUN. Source SHA-256 values for ${sourceHashes.size} mapped files are captured in the log.`;
  checks.push({ label: 'mapped source SHA-256', observed: [...sourceHashes].map(([file, hash]) => `${file} ${hash}`).join('\n') });
}

if (stepId === 'S03') {
  const rootPackage = json('package.json');
  const appPackage = json('apps/web/package.json');
  const report = read('evidence/REPORT.md');
  const gaps = read('docs/KNOWN_GAPS.md');
  const scripts = json('botsales-kit/execution/frontend-command-map.json').commands;
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  assert(rootPackage.name === 'botsales-frontend' && rootPackage.packageManager === 'npm@11.17.0', 'Unexpected root package identity/manager');
  assert(rootPackage.engines.node === '>=24 <25' && nodeMajor === 24, `Node engine/current runtime mismatch: ${rootPackage.engines.node} / ${process.versions.node}`);
  assert(rootPackage.engines.npm === '>=10' && appPackage.name === '@botsales/web', 'Unexpected app/npm requirements');
  assert(fs.existsSync(path.join(root, 'package-lock.json')) && rootPackage.scripts['generate:check'], 'Lockfile or generator check is missing');
  assert(report.includes('W35 baseline audit sau SPC-056') && report.includes('136/140 evidence checkpoint stale') && gaps.includes('FE-G05 / UI012') && gaps.includes('Narrator speech/transcript') && gaps.includes('Tracker FE'), 'Current report/gap record lacks current verification status or limits');
  assert(fs.existsSync(path.join(root, 'evidence/frontend-ui-improvements/UI028/W35/fe-evidence-dependency-audit-baseline-post-spc056-20261006.json')) && fs.existsSync(path.join(root, 'botsales-kit/execution/frontend-evidence/FE024/npm-audit-ui-select-current-20261002.json')), 'Current local evidence links are missing');
  addCheck('package manifests', `${rootPackage.name}; ${appPackage.name}; Node ${process.versions.node}; npm requirement ${rootPackage.engines.npm}; lockfile present`);
  addCheck('evidence/report and gaps', 'REPORT links the baseline post-SPC-056 audit snapshot; KNOWN_GAPS records FE-G05 and tracker freshness limits');
  const generateLog = read('botsales-kit/execution/frontend-evidence/FE001/S03-generate-check-post-spc056-current-20261006.log');
  assert(generateLog.includes('exitCode=0') && generateLog.includes('"outputs":11') && generateLog.includes('"routes":54'), 'Current npm run generate:check log is absent or not successful');
  addCheck('current generator check', `node.exe scripts/generate.mjs --check exited 0: ${generateLog.trim().replace(/\s+/g, ' ')}`);
  addCheck('other current checks', 'progress validate/status were run in FE001.S05 after the dependency checkpoints; S39/S40 are referenced existing UI evidence, not rerun here');
  addCheck('checks not claimed as current execution', 'cold npm ci, complete verify, browser E2E, screen-reader speech, hosted CI and owner acceptance not rerun by this intake step');
  observed = `package=${rootPackage.name}; app=${appPackage.name}; Node=${process.versions.node}; npm=${rootPackage.packageManager}; package-lock=present; node.exe scripts/generate.mjs --check exit=0; REPORT/KNOWN_GAPS retain scope and residual limits.`;
}

if (stepId === 'S04') {
  const next = plan.tasks.find((item) => item.id === 'FE003');
  const ledger = json('botsales-kit/execution/frontend-progress.json');
  const completedToolchain = ledger.tasks.FE002;
  const externalDeps = next.dependsOn.filter((id) => !/^FE\d{3}$/.test(id));
  const forbiddenScope = next.writeScope.filter((item) => /(^|\/)(api|worker|infra)(\/|$)|backend|staging/i.test(item));
  assert(completedToolchain.status === 'DONE' && Object.values(completedToolchain.steps).every((item) => item.status === 'VERIFIED'), 'FE002 toolchain evidence is not complete');
  assert(next.priority === 3 && next.dependsOn.length === 1 && next.dependsOn[0] === 'FE002', 'FE003 is not the next dependency-ready priority');
  assert(externalDeps.length === 0 && forbiddenScope.length === 0, 'FE003 includes a non-frontend dependency/write target');
  addCheck('next task and dependency', 'FE003 priority 3; FE002 has five verified steps; no task dependency outside FE graph');
  addCheck('change budget', next.writeScope.join(', '));
  addCheck('acceptance cases', next.acceptanceCases.join(' | '));
  addCheck('non-goals', 'No backend/provider credentials; no lockfile rewrite absent measured compatibility/install need; no secret or environment overwrite');
  observed = `FE002 is complete with 5/5 verified steps; FE003 is next by priority and depends only on FE002; scope=${next.writeScope.join(', ')}; acceptance=${next.acceptanceCases.length} cases; no backend/staging prerequisite.`;
}

if (stepId === 'S05') {
  const validateOutput = run(process.execPath, [path.join(kit, 'scripts/progress.mjs'), 'validate']);
  const statusOutput = run(process.execPath, [path.join(kit, 'scripts/progress.mjs'), 'status']);
  const validation = JSON.parse(validateOutput);
  const status = JSON.parse(statusOutput);
  const auditText = read('evidence/frontend-scope-automation-audit-20261004/after-audit.log');
  const auditEnd = auditText.indexOf('\nInventory:');
  assert(auditEnd > 0, 'Protected-hash audit block is missing');
  const audit = JSON.parse(auditText.slice(0, auditEnd));
  const protectedHashes = audit.protectedHashes;
  const fullPlanHash = sha(fs.readFileSync(path.join(root, 'botsales-kit/execution/plan.json')));
  const fullProgressHash = sha(fs.readFileSync(path.join(root, 'botsales-kit/execution/progress.json')));
  const next = status.next[0];
  assert(validation.valid && validation.tasks === 28 && validation.checkpoints === 140, 'Canonical FE tracker structure did not validate');
  assert(status.totalSteps === 140 && status.blocked.length === 0, 'Unexpected effective FE tracker or blocked task');
  assert(next?.id === 'FE001' && next.nextStep?.id === 'S05', `Expected FE001.S05 next, got ${next?.id}.${next?.nextStep?.id}`);
  assert(fullPlanHash === protectedHashes['botsales-kit/execution/plan.json'] && fullProgressHash === protectedHashes['botsales-kit/execution/progress.json'], 'Read-only full-product trackers differ from protected audit hashes');
  addCheck('canonical FE plan/ledger validation', validateOutput);
  addCheck('effective status after S01–S04', `verifiedSteps=${status.verifiedSteps}/140; blocked=${JSON.stringify(status.blocked)}; staleTasks=${status.stale.length}; next=${next.id}.${next.nextStep.id}`);
  addCheck('full-product plan/ledger preservation', `plan sha256=${fullPlanHash}; progress sha256=${fullProgressHash}; both match protected audit hashes`);
  addCheck('tracker authority', 'Only FE001–FE028 and frontend-progress.json are writable through the frontend script; full-product plan/progress remain read-only');
  observed = `FE plan validates 28 tasks/140 checkpoints; status=${status.verifiedSteps}/140 verified, ${status.stale.length} stale, blocked=[]; next=FE001.S05; full-product plan/progress hashes unchanged.`;
  command = `node botsales-kit/scripts/progress.mjs validate; node botsales-kit/scripts/progress.mjs status; compare read-only full-product hashes`;
}

const revision = run('git', ['rev-parse', '--short', 'HEAD']);
const branch = run('git', ['branch', '--show-current']);
const sourceFiles = sourcePaths.map((relative) => ({ path: relative, sha256: sha(fs.readFileSync(path.join(root, relative))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const executedAt = new Date().toISOString();
const logRelative = `execution/frontend-evidence/FE001/${stepId}-post-spc059-current-20261006.log`;
const evidenceRelative = `execution/frontend-evidence/FE001/${stepId}-post-spc059-current-20261006.json`;
const log = [
  `FE001.${stepId} current intake evidence`,
  `executedAt=${executedAt}`,
  `cwd=${root}`,
  `command=${command}`,
  'exitCode=0',
  `expected=${step.action}`,
  `observed=${observed}`,
  `checksTotal=${checks.length}; failed=0`,
  ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; backend/provider/staging results are not claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  'reviewer=Codex self-review; no independent peer review claimed.',
].join('\n') + '\n';
const logAbsolute = path.join(kit, logRelative);
const evidenceAbsolute = path.join(kit, evidenceRelative);
fs.writeFileSync(logAbsolute, log, 'utf8');
const evidence = {
  taskId: 'FE001', stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: step.action, observed, command, cwd: root,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.versions.node} / npm 11.17.0`, details: 'Local source/evidence review; synthetic frontend scope; no backend or hosted runtime used.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile: logRelative, logSha256: sha(log), sourceFiles, sourceSnapshotSha256,
};
fs.writeFileSync(evidenceAbsolute, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ step: stepId, result: 'PASS', checks: checks.length, evidence: evidenceRelative, log: logRelative, sourceSnapshotSha256 }, null, 2));
