import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('..'), dir='evidence/ui-table-reflow-20261112', manifest='evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const e=JSON.parse(await readFile(manifest,'utf8'));
const changed=['apps/web/src/modules/inventory/index.tsx','apps/web/src/modules/workspace/index.tsx','apps/web/src/shared/ui/components.tsx','apps/web/src/shared/ui/README.md','tests/ui-inventory-layout.spec.ts','tests/ui-remaining-tables.spec.ts','tests/ui-table-reflow.spec.ts','evidence/REPORT.md'];
const allowed=new Set(changed.map(f=>'BotSalesAI_Frontend/'+f));
for(const [file,hash] of Object.entries(e.sourceFingerprints)) {
 const actual=sha(await readFile(path.join(root,file)));
 if(actual!==hash) assert(allowed.has(file),`Unrelated fingerprint stale: ${file}`);
}
for(const f of changed) e.sourceFingerprints['BotSalesAI_Frontend/'+f]=sha(await readFile(f));
const artifacts={}; for(const f of await readdir(dir)) if(f.endsWith('.png') || f.endsWith('.log')) artifacts[f]=sha(await readFile(`${dir}/${f}`));
await writeFile(`${dir}/artifact-hashes.json`,JSON.stringify(artifacts,null,2)+'\n');
for(const [id,file,pattern,summary] of [
 ['table-reflow-regression-20261112','browser-regression.log',/20 passed[\s\S]*COMMAND_EXIT=0/,'20 scoped browser cases passed on Chromium and Firefox for inventory, team and prior regressions.'],
 ['table-reflow-semantics-20261112','semantic-final.log',/4 passed[\s\S]*COMMAND_EXIT=0/,'Four browser cases checked reflow, column headers, rows, cell containment and actions at 320, 390 and 1440 CSS px.'],
 ['table-reflow-composition-20261112','composition.log',/COMMAND_EXIT=0/,'Shared UI composition and catalog gate passed after updating the catalog.']
]) {const bytes=await readFile(`${dir}/${file}`); assert.match(bytes.toString('utf8'),pattern); assert(!e.checks.some(x=>x.id===id)); e.checks.push({id,command:file,exitCode:0,result:'PASS',expected:summary,observed:summary,log:{path:`BotSalesAI_Frontend/${dir}/${file}`,sha256:sha(bytes)}});}
const reason='Only stock movement history and team tables were reflowed and checked in the 20261112 batch. Other multi-action and read-only tables remain open; complete states and permissions, native zoom, text-only resize, screen reader, physical mobile and owner acceptance remain unverified.';
e.coverage.push({name:'table-reflow-acceptance-20261112',expected:1,observed:0,missing:1,result:'OPEN',reason}); e.knownLimits.push(reason); e.scope+=' Two named S17 tables received a scoped mobile reflow on 20261112; the remaining tables and acceptance stay open.'; e.status='IN_PROGRESS'; e.recordedAt=new Date().toISOString();
await writeFile(manifest,JSON.stringify(e,null,2)+'\n'); console.log('Recorded scoped checks; S17 remains IN_PROGRESS.');
