import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const frontend = process.cwd(), repo = path.resolve(frontend, '..');
const manifest = JSON.parse(await readFile('evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json', 'utf8'));
const extra = ['BotSalesAI_Frontend/tests/ui-mobile-followup.spec.ts', 'BotSalesAI_Frontend/apps/web/tests/ui-audit-fixes.test.tsx'];
const hashes = {};
for (const file of [...new Set([...Object.keys(manifest.sourceFingerprints), ...extra])]) hashes[file] = createHash('sha256').update(await readFile(path.join(repo,file))).digest('hex');
await writeFile('evidence/ui-mobile-followup-20261110/final-input-hashes.json', JSON.stringify(hashes,null,2)+'\n');
