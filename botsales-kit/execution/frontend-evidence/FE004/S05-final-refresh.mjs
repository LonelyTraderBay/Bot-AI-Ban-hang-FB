import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const base = 'botsales-kit/execution/frontend-evidence/FE004';
const handoffPath = path.join(repo, base, 'handoff.md');
const evidencePath = path.join(repo, base, 'S05-refresh.json');
const helperPath = `${base}/S05-final-refresh.mjs`;
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const marker = '## Final refresh — 30/09/2026';
const section = `${marker}

After the FE006 token/theme test changes and FE003 evidence refresh, FE004's current-source gates were rerun from the repository root on Windows. \`npm run typecheck\` passed with zero diagnostics; \`npm run lint\` passed with zero warnings/errors; \`npm run boundaries\` passed on 53 source files and 378 imports with 8/8 negative fixtures and zero issues; \`npm run test:source\` passed on 53 files, 207 operation references and 54 routes with zero issues. \`git diff --check\` exited 0; Git emitted only line-ending conversion warnings for the existing Windows working tree. Logs are \`S05-*-current-refresh.log\`.

The current FE003 run provides the shared unit/E2E evidence: 45/45 unit tests and 23/23 serialized Chromium browser tests passed. No source restructuring was needed for FE004 because the full checks show no current TypeScript, lint, source-mapping, or module-boundary defect. The diagnostic-only \`noUncheckedIndexedAccess\` probe remains 11 errors in mock files outside FE004's write scope; it is an open compatibility gap and is not counted as a passing gate. No production/demo build, CI, backend/provider, staging, UAT, or production-readiness claim is made here.
`;
let handoff = fs.readFileSync(handoffPath, 'utf8');
if (!handoff.includes(marker)) {
  handoff += `\n\n${section}`;
  fs.writeFileSync(handoffPath, handoff);
}
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const oldText = 'Unit tests are current at 43/43 in FE003.S03; no build, CI, backend or production claim is made.';
const newText = 'Unit tests are current at 45/45 and serialized Chromium browser tests at 23/23 in FE003.S03; no build, CI, backend or production claim is made.';
if (evidence.observed.includes(oldText)) evidence.observed = evidence.observed.replace(oldText, newText);
else if (!evidence.observed.includes('45/45') || !evidence.observed.includes('23/23')) throw new Error('Current shared test counts are absent from the evidence observation.');
const files = new Map(evidence.sourceFiles.map(file => [file.path, file.sha256]));
files.set(`${base}/handoff.md`, sha256(fs.readFileSync(handoffPath)));
files.set(helperPath, sha256(fs.readFileSync(path.join(repo, helperPath))));
evidence.sourceFiles = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, hash]) => ({ path: file, sha256: hash }));
evidence.sourceSnapshotSha256 = sha256(Buffer.from(evidence.sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ taskId: evidence.taskId, stepId: evidence.stepId, unitTests: '45/45', browserTests: '23/23', handoffHash: files.get(`${base}/handoff.md`), helperHash: files.get(helperPath), sourceSnapshotSha256: evidence.sourceSnapshotSha256 }, null, 2));
