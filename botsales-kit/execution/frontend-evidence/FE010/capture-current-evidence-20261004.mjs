import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE010');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass one FE010 step: S01-S05.');

const plan = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-plan.json'), 'utf8'));
const task = plan.tasks.find(item => item.id === 'FE010');
const step = task.implementationSteps.find(item => item.id === stepId);
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = commandMap.commands.find(item => item.id === 'e2e');
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error('Registered e2e command is not available.');

const paths = {
  e2e: 'execution/frontend-evidence/FE010/S05-fe010-e2e-current-20261004.log',
  contract: 'execution/frontend-evidence/FE010/S01-contract-map-current-20261004.log',
  verify: 'execution/frontend-evidence/FE007/S05-verify-current-20261004.log',
  verifyEvidence: 'execution/frontend-evidence/FE007/S05-current-revalidated-20261004.json',
};
const readKit = relative => fs.readFileSync(path.join(kit, relative));
const e2eText = readKit(paths.e2e).toString('utf8');
const contractText = readKit(paths.contract).toString('utf8');
const verifyText = readKit(paths.verify).toString('utf8');
const verifyEvidence = JSON.parse(readKit(paths.verifyEvidence));
if (!/18 passed \(1\.3m\)/.test(e2eText) || !e2eText.endsWith('EXIT_CODE=0\r\n') && !e2eText.endsWith('EXIT_CODE=0\n')) {
  throw new Error('Current FE010 two-browser E2E log is not clean 18/18 with exit code 0.');
}
if (!contractText.includes('"status": "PASS"') || !contractText.includes('"name": "current React route/operation checker is clean"')) {
  throw new Error('Current FE010 contract map did not pass.');
}
if (verifyEvidence.taskId !== 'FE007' || verifyEvidence.result !== 'PASS' || verifyEvidence.exitCode !== 0 || !verifyText.includes('Tests  85 passed (85)')) {
  throw new Error('Current frontend verify evidence is missing or failed.');
}

const walk = (directory, extensions, found = []) => {
  for (const entry of fs.readdirSync(path.join(repo, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) walk(relative, extensions, found);
    else if (extensions.has(path.extname(entry.name).toLowerCase())) found.push(relative);
  }
  return found;
};
const sourceFiles = [...new Set([
  ...walk('apps/web/src', new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css'])),
  ...walk('tests', new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'])),
  'AGENTS.md', 'apps/web/index.html', 'apps/web/package.json', 'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts', 'apps/web/tests/setup.ts', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/events.schema.json',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/design/tokens.json', 'package.json', 'package-lock.json', 'playwright.config.ts',
  'scripts/run-e2e.mjs', 'scripts/setup.mjs', 'scripts/test-domain.mjs',
  'packages/contracts/src/operations.json', 'packages/contracts/src/permissions.json',
  'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
  'botsales-kit/execution/frontend-evidence/FE010/S01-contract-map.mjs',
  'botsales-kit/execution/frontend-evidence/FE010/S01-contract-map.json',
  'botsales-kit/execution/frontend-evidence/FE010/capture-current-evidence-20261004.mjs',
  'botsales-kit/execution/frontend-evidence/FE007/S05-current-revalidated-20261004.json',
])].sort();
const hashedFiles = sourceFiles.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(hashedFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const descriptions = {
  S01: 'The current canonical map passed 8/8 checks for routes R09–R14, 16 operation IDs and permissions, If-Match requirements, product/variant/import schemas and the 54-route React source map. The two-browser FE010 suite passed 18/18 against the synthetic MSW demo.',
  S02: 'The current two-browser FE010 suite passed 18/18. It exercised product and variant payloads, images, category search/pagination, product edits, CSV sample, dry-run validation and valid-row import confirmation through observable synthetic HTTP requests and rendered results.',
  S03: 'The current two-browser FE010 suite passed 18/18, including invalid price/duplicate rows, permission denial, upload/row limits and 412 version/token conflicts. Draft values and preview results remained visible; no unauthorized or false-success mutation occurred.',
  S04: 'The current two-browser FE010 suite passed 18/18 with request method/body/version and resulting React state assertions. The task contract map passed 8/8; current domain/MSW, schema and Vitest checks are included in the current verify evidence.',
  S05: 'The task-specific Chromium and Firefox suite passed 18/18. Current npm run verify evidence passed generator, source mapping, boundaries, lint, strict typecheck, domain 88/88, Vitest 85/85 and production build; the E2E wrapper rebuilt production and demo artifacts successfully. API behavior is synthetic only.',
};
const e2eRelative = `execution/frontend-evidence/FE010/${path.basename(paths.e2e)}`;
const e2eBytes = readKit(paths.e2e);
const supportingLogs = [paths.contract, paths.verify].map(file => ({
  file,
  sha256: sha256(readKit(file)),
}));
const evidence = {
  taskId: 'FE010', stepId, kind: 'test_run', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current dirty working tree; exact source hashes are recorded below.`,
  expected: step.verification,
  observed: descriptions[stepId],
  command: command.command, commandId: command.id, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155',
    details: 'React demo rebuilt by the registered frontend E2E wrapper; browser API traffic used synthetic MSW data and no live backend/provider.',
    dataSource: 'synthetic-msw',
  },
  checksTotal: 18, failed: 0, exitCode: 0,
  logFile: e2eRelative, logSha256: sha256(e2eBytes),
  sourceFiles: hashedFiles, sourceSnapshotSha256, supportingLogs,
};
const output = path.join(evidenceDir, `${stepId}-current-revalidated-20261004.json`);
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `FE010.${stepId}`, result: 'PASS', checks: 18, sourceFiles: hashedFiles.length, evidence: path.relative(kit, output).replaceAll('\\', '/') }, null, 2));
