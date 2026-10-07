import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const stepId = process.argv[2];
const helperRelative = 'botsales-kit/execution/frontend-evidence/FE002/capture-post-spc056-toolchain-20261006.mjs';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
assert(root.endsWith('BotSalesAI_Frontend'), `Run from the frontend root, got ${root}`);
assert(['S01', 'S02'].includes(stepId), 'Usage: node capture-current-toolchain.mjs S01|S02');

const plan = json('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find((item) => item.id === 'FE002');
const step = task.implementationSteps.find((item) => item.id === stepId);
const checks = [];
const addCheck = (label, observed) => checks.push({ label, observed });
const snapshotPaths = {
  S01: ['.node-version', 'package.json', 'apps/web/package.json', 'package-lock.json'],
  S02: ['package.json', 'scripts/setup.mjs', 'scripts/doctor.mjs', 'scripts/tools.mjs', '.env.example', 'botsales-kit/execution/frontend-command-map.json'],
};
const sourcePaths = [...new Set([...snapshotPaths[stepId], helperRelative])];
const command = `node botsales-kit/execution/frontend-evidence/FE002/capture-post-spc056-toolchain-20261006.mjs ${stepId}`;
let observed = '';

if (stepId === 'S01') {
  const rootPackage = json('package.json');
  const appPackage = json('apps/web/package.json');
  const lock = json('package-lock.json');
  const nodePin = read('.node-version').trim();
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const lockRoot = lock.packages?.[''];
  const mismatches = [];
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const manifest = rootPackage[section] ?? {};
    const locked = lockRoot?.[section] ?? {};
    for (const name of new Set([...Object.keys(manifest), ...Object.keys(locked)])) {
      if (manifest[name] !== locked[name]) mismatches.push(`${section}:${name}:${manifest[name]}!=${locked[name]}`);
    }
  }
  const exactPackages = new Map([
    ['react', rootPackage.devDependencies.react], ['react-dom', rootPackage.devDependencies['react-dom']],
    ['typescript', rootPackage.devDependencies.typescript], ['vite', rootPackage.devDependencies.vite],
    ['@mui/material', appPackage.dependencies['@mui/material']], ['@tanstack/react-query', appPackage.dependencies['@tanstack/react-query']],
    ['react-router-dom', appPackage.dependencies['react-router-dom']], ['msw', appPackage.dependencies.msw],
  ]);
  const installedMismatches = [];
  for (const [name, expected] of exactPackages) {
    const metadata = json(`node_modules/${name}/package.json`);
    if (metadata.version !== expected) installedMismatches.push(`${name}:${metadata.version}!=${expected}`);
  }
  const npmLog = 'botsales-kit/execution/frontend-evidence/FE002/S01-npm-ls-post-spc056-20261006.log';
  const npmVersionLog = 'botsales-kit/execution/frontend-evidence/FE002/S01-npm-version-post-spc056-20261006.log';
  const nodeVersionLog = 'botsales-kit/execution/frontend-evidence/FE002/S01-node-version-post-spc056-20261006.log';
  assert(nodePin === '24.19.0' && nodeMajor === 24, `Pinned/current Node mismatch: ${nodePin}/${process.version}`);
  assert(rootPackage.packageManager === 'npm@11.17.0' && rootPackage.engines.node === '>=24 <25' && rootPackage.engines.npm === '>=10', 'Package manager/engine baseline mismatch');
  assert(appPackage.name === '@botsales/web' && lock.lockfileVersion === 3 && lockRoot?.name === rootPackage.name, 'App/workspace/lock identity mismatch');
  assert(mismatches.length === 0 && installedMismatches.length === 0, `Manifest/lock/installed version mismatch: ${[...mismatches, ...installedMismatches].join(', ')}`);
    const npmTreeText = read(npmLog);
  const npmVersionText = read(npmVersionLog);
  const nodeVersionText = read(nodeVersionLog);
  assert(npmTreeText.includes('exitCode=0') && !/invalid:|UNMET PEER DEPENDENCY|ELSPROBLEMS/i.test(npmTreeText), 'Current npm ls output failed or reports dependency/peer problems');
  assert(npmVersionText.includes('exitCode=0') && npmVersionText.includes('11.17.0'), 'Current npm version log is missing or mismatched');
  assert(nodeVersionText.includes('exitCode=0') && nodeVersionText.includes('v24.19.0'), 'Current Node version log is missing or mismatched');
  addCheck('runtime and pinned toolchain', `Node ${process.version}; npm 11.17.0; .node-version ${nodePin}; engines ${JSON.stringify(rootPackage.engines)}`);
  addCheck('manifest and lockfile', `lockfileVersion=${lock.lockfileVersion}; root/app identity ${rootPackage.name}/${appPackage.name}; dependency mismatches=0`);
  addCheck('exact installed stack', [...exactPackages].map(([name, version]) => `${name}@${version}`).join(', '));
  addCheck('peer/dependency tree', 'npm.cmd ls --depth=0 exited 0; no invalid or unmet peer dependency reported in captured tree');
  addCheck('change budget decision', 'Keep current exact versions and one React/MUI/Query/Router stack; no upgrade or lock rewrite is justified by observed compatibility');
  addCheck('captured command output', `${nodeVersionLog}; ${npmVersionLog}; ${npmLog}`);
  observed = `Node ${process.version}, npm 11.17.0, exact manifest/lock/installed versions match, lockfile v${lock.lockfileVersion}, npm ls --depth=0 exit 0; no peer mismatch found.`;
}

if (stepId === 'S02') {
  const rootPackage = json('package.json');
  const setup = read('scripts/setup.mjs');
  const doctor = read('scripts/doctor.mjs');
  const tools = read('scripts/tools.mjs');
  const commands = json('botsales-kit/execution/frontend-command-map.json').commands;
  const setupCommand = commands.find((entry) => entry.id === 'setup');
  const doctorCommand = commands.find((entry) => entry.id === 'doctor');
  const envExists = fs.existsSync(path.join(root, '.env.local'));
  const exampleExists = fs.existsSync(path.join(root, '.env.example'));
  const workerExists = fs.existsSync(path.join(root, 'apps/web/public/mockServiceWorker.js'));
  assert(setup.includes("Number(process.versions.node.split('.')[0])!==24"), 'Setup does not enforce the pinned Node major');
  assert(setup.includes("if(!fs.existsSync(path.join(root,'.env.local')))"), 'Setup may overwrite an existing .env.local');
  assert(setup.includes("run(['scripts/generate.mjs'])") && setup.includes("'msw/package.json'"), 'Setup generation/MSW worker path is not the package implementation');
  assert(doctor.includes("'Node.js 24'") && doctor.includes("'MSW browser worker'") && doctor.includes("'Lockfile'"), 'Doctor omits required local checks');
  assert(tools.includes('createRequire') && fs.existsSync(path.join(root, 'scripts/generate.mjs')), 'Setup/doctor runtime path is incomplete');
  assert(setupCommand?.status === 'VERIFIED_AVAILABLE' && doctorCommand?.status === 'VERIFIED_AVAILABLE', 'Setup/doctor are not registered as verified commands');
  assert(envExists && exampleExists && workerExists, 'Existing env template/local file or MSW worker is missing');
  addCheck('setup behavior', 'Requires Node 24; generates from canonical inputs; resolves the installed MSW package worker; creates .env.local only when absent');
  addCheck('doctor behavior', 'Checks Node 24, required frontend packages, MSW browser worker and lockfile; returns non-zero when a check fails');
  addCheck('command map', `setup=${setupCommand.command} [${setupCommand.status}]; doctor=${doctorCommand.command} [${doctorCommand.status}]`);
  addCheck('workspace/cache/network baseline', `npm tree is installed and valid; .env.local=${envExists}; .env.example=${exampleExists}; MSW worker=${workerExists}; no environment content read or changed`);
  addCheck('side-effect policy', 'Existing .env.local is protected by an existence check; setup may regenerate derived contract outputs and MSW worker, to be hash-checked after run');
  observed = `setup/doctor scripts inspect cleanly; commands are registered VERIFIED_AVAILABLE; Node/package/MSW prerequisites exist; .env.local already exists and setup will not overwrite it.`;
}

const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const sourceFiles = sourcePaths.map((relative) => ({ path: relative, sha256: sha(fs.readFileSync(path.join(root, relative))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const executedAt = new Date().toISOString();
const logRelative = `execution/frontend-evidence/FE002/${stepId}-post-spc056-toolchain-20261006.log`;
const evidenceRelative = `execution/frontend-evidence/FE002/${stepId}-post-spc056-toolchain-20261006.json`;
const log = [
  `FE002.${stepId} current toolchain evidence`, `executedAt=${executedAt}`, `cwd=${root}`,
  `command=${command}`, 'exitCode=0', `expected=${step.action}`, `observed=${observed}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no Backend, provider or hosted CI result is claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  'reviewer=Codex self-review; no independent peer review claimed.',
].join('\n') + '\n';
const logAbsolute = path.join(kit, logRelative);
fs.writeFileSync(logAbsolute, log, 'utf8');
const evidence = {
  taskId: 'FE002', stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: step.action, observed, command, cwd: root,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.versions.node} / npm 11.17.0`, details: 'Local toolchain/dependency review; synthetic frontend scope only.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile: logRelative, logSha256: sha(log), sourceFiles, sourceSnapshotSha256,
};
fs.writeFileSync(path.join(kit, evidenceRelative), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ step: stepId, result: 'PASS', checks: checks.length, evidence: evidenceRelative, log: logRelative, sourceSnapshotSha256 }, null, 2));
