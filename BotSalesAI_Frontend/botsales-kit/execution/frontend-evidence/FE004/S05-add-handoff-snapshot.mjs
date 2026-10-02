import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidencePath = path.join(kit, 'execution/frontend-evidence/FE004/S05-refresh.json');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const additional = [
  'botsales-kit/execution/frontend-evidence/FE004/handoff.md',
  'botsales-kit/execution/frontend-evidence/FE004/S05-append-current-baseline.mjs',
  'botsales-kit/execution/frontend-evidence/FE004/S05-add-handoff-snapshot.mjs',
];
const files = new Map(evidence.sourceFiles.map(file => [file.path, file.sha256]));
for (const file of additional) files.set(file, sha256(fs.readFileSync(path.join(repo, file))));
evidence.sourceFiles = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, hash]) => ({ path: file, sha256: hash }));
evidence.sourceSnapshotSha256 = sha256(Buffer.from(evidence.sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
evidence.observed += ' The FE004 handoff was refreshed with current 53-file/378-import boundary results and the explicit noUncheckedIndexedAccess gap, and its exact bytes are included in this source snapshot.';
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidence: 'FE004/S05-refresh.json', sourceFiles: evidence.sourceFiles.length, handoffHash: files.get(additional[0]), sourceSnapshotSha256: evidence.sourceSnapshotSha256 }, null, 2));
