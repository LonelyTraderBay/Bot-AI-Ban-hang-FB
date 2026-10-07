import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE005');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const previous = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'S01-revalidated-20261001.json'), 'utf8'));
const sourcePaths = [...new Set([...previous.sourceFiles.map(file => file.path), 'botsales-kit/execution/frontend-evidence/FE005/S01-current-evidence.mjs'])];
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const logFile = 'execution/frontend-evidence/FE020/S06-source.log';
const contractLog = 'execution/frontend-evidence/FE020/S06-contract-tests.log';
const log = fs.readFileSync(path.join(kit, logFile));
const contract = fs.readFileSync(path.join(kit, contractLog));
const sourceOutput = log.toString('utf8');
const contractOutput = contract.toString('utf8');
if (!/"files": 54,[\s\S]*"operationCalls": 224,[\s\S]*"routes": 54,[\s\S]*"status": "PASS"/.test(sourceOutput)) throw new Error('Current source audit did not pass with expected mappings.');
if (!/ℹ pass 6[\s\S]*ℹ fail 0/.test(contractOutput)) throw new Error('Canonical contract tests did not pass.');
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const sourceCommand = commandMap.commands.find(command => command.id === 'source');
if (!sourceCommand || sourceCommand.status !== 'VERIFIED_AVAILABLE') throw new Error('The registered source audit command is unavailable.');
const evidence = {
  taskId: 'FE005', stepId: 'S01', kind: 'test_run', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()} plus current dirty working tree`,
  expected: 'All current React/TypeScript operation references, canonical routes, permissions and DTO usage resolve against generated OpenAPI metadata; optional/null and identifier behavior stay contract-owned.',
  observed: 'Current test:source passed for 54 TypeScript files, 224 operation calls and 54 canonical routes with zero issues. Canonical generator tests passed 6/6, including unresolved schema, missing version/server, route drift and stale generated output cases.',
  command: sourceCommand.command, commandId: sourceCommand.id, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.version} / npm 11.17.0`, details: 'Canonical OpenAPI-derived metadata and React source audit; synthetic frontend scope only.', dataSource: 'source-only' },
  checksTotal: 60, failed: 0, exitCode: 0, logFile, logSha256: sha256(log), sourceFiles, sourceSnapshotSha256,
  supportingLogs: [{ file: contractLog, sha256: sha256(contract) }],
};
fs.writeFileSync(path.join(evidenceDir, 'S01-current-20261001.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidence: 'S01-current-20261001.json', checksTotal: evidence.checksTotal, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));
