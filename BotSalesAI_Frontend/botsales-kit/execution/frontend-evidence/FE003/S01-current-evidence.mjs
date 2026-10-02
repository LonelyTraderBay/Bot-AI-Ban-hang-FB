import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const logFile = 'execution/frontend-evidence/FE003/S01-current-map-audit.log';
const log = fs.readFileSync(path.join(kit, logFile));
const output = JSON.parse(log.toString('utf8'));
if (output.status !== 'PASS' || output.unmappedVerifiedCommands.length !== 0) throw new Error('Command-map audit did not pass.');
const sourcePaths = [
  'package.json',
  'apps/web/package.json',
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-evidence/FE003/S01-command-map-audit.mjs',
];
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const evidence = {
  taskId: 'FE003', stepId: 'S01', kind: 'artifact_review', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()} plus current dirty working tree`,
  expected: 'Root/app scripts and all registered frontend commands match package scripts or supported direct commands; unrun commands remain explicitly declared-only.',
  observed: `${output.rootScripts} root scripts, ${output.appScripts} app scripts and ${output.registryEntries} registered commands reviewed; ${output.verified} verified, ${output.declaredNotRun} declared-not-run, ${output.failedBaseline} failed-baseline, and zero unmapped verified commands.`,
  command: "node 'botsales-kit/execution/frontend-evidence/FE003/S01-command-map-audit.mjs'",
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.version} / npm 11.17.0`, details: 'Local frontend script and command registry audit; no backend, CI or production inference.', dataSource: 'source-only' },
  checksTotal: output.registryEntries + 2,
  failed: 0,
  exitCode: 0,
  logFile,
  logSha256: sha256(log),
  sourceFiles,
  sourceSnapshotSha256,
};
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'S01-current.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidence: 'S01-current.json', checksTotal: evidence.checksTotal, sourceSnapshotSha256 }, null, 2));
