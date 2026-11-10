import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import path from 'node:path';
const root=path.resolve('..'),m=JSON.parse(await readFile('evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json','utf8'));
const files=[...new Set([...Object.keys(m.sourceFingerprints),'BotSalesAI_Frontend/tests/ui-remaining-tables.spec.ts','BotSalesAI_Frontend/tests/ui-team-mobile-dialog.spec.ts','BotSalesAI_Frontend/apps/web/tests/team-display-name.test.tsx'])];const hashes={};for(const f of files)hashes[f]=createHash('sha256').update(await readFile(path.join(root,f))).digest('hex');
await writeFile('evidence/ui-remaining-tables-20261110/final-input-hashes.json',JSON.stringify(hashes,null,2)+'\n');


