import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE003');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const paths = [
  'package.json',
  'apps/web/package.json',
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-evidence/FE003/S01-command-map-audit.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S01-map-refresh-evidence.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S01-map-refresh-audit.log',
];
const sourceFiles = paths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const logFile = 'execution/frontend-evidence/FE003/S01-map-refresh-audit.log';
const evidence = {
  taskId: 'FE003',
  stepId: 'S01',
  kind: 'artifact_review',
  result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: 'Current dirty working tree; command registry audit rerun locally',
  expected: 'Root/app npm script inventory matches frontend-command-map registrations; verified commands resolve to scripts or known direct commands, while unrun commands remain declared-only.',
  observed: 'Audit found 17 root scripts, 5 app scripts, 21 registry entries, 19 VERIFIED_AVAILABLE, 2 DECLARED_NOT_RUN, and zero unmapped verified commands. No backend, CI, or production result is inferred.',
  command: 'node botsales-kit/execution/frontend-evidence/FE003/S01-command-map-audit.mjs',
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: `Windows / Node ${process.version} / npm 11.17.0`,
    details: 'Current local frontend repository; audit reads root/app package scripts and frontend command registry.',
    dataSource: 'source-only',
  },
  checksTotal: 5,
  failed: 0,
  logFile,
  logSha256: sha256(fs.readFileSync(path.join(kit, logFile))),
  sourceFiles,
  sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
fs.writeFileSync(path.join(evidenceDir, 'S01-map-refresh.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidence: 'S01-map-refresh.json', sourceFiles: sourceFiles.length, logFile, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }, null, 2));
