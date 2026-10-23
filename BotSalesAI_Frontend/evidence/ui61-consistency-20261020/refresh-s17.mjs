import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repository=path.resolve(here,'../../..');
const frontend=path.join(repository,'BotSalesAI_Frontend');
const manifest=path.join(frontend,'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const raw=await readFile(manifest,'utf8'), evidence=JSON.parse(raw);
const changed=[
    'apps/web/src/shared/ui/components.tsx','apps/web/src/shared/ui/composition.tsx','apps/web/src/shared/ui/visual.ts','apps/web/src/shared/ui/README.md',
    ...['bot/index.tsx','catalog/imports.tsx','finance/index.tsx','finance/management.tsx','finance/report-warnings.tsx','fulfillment/index.tsx','integrations/index.tsx','knowledge/index.tsx','notifications/index.tsx','operations/index.tsx','workspace/index.tsx'].map(name=>'apps/web/src/modules/'+name),
    'apps/web/tests/report-warnings.test.tsx','tests/ui61-consistency.spec.ts','tests/ui61-states.spec.ts','tests/design/report-warnings-fixture.tsx','tests/ui-dashboard-layout.spec.ts',
    'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md','evidence/REPORT.md','evidence/ui61-consistency-20261020/CONTRACT.md','evidence/ui61-consistency-20261020/refresh-s17.mjs',
];
const allowed=new Set(changed.map(name=>'BotSalesAI_Frontend/'+name));
for(const [name,hash] of Object.entries(evidence.sourceFingerprints))
    if(!allowed.has(name)) assert.equal(digest(await readFile(path.join(repository,name))),hash,'Unrelated stale source: '+name);
const hashes=Object.fromEntries(await Promise.all(changed.map(async name=>[name,digest(await readFile(path.join(frontend,name)))])));
const runtime=changed.filter(name=>name.startsWith('apps/web/src/')&&!name.endsWith('.md'));
const clean=text=>text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
async function record(id,file,expected,patterns,inputs){
    const bytes=await readFile(path.join(here,file));const log=clean(bytes.toString('utf8'));
    assert.equal((await readFile(path.join(here,file+'.exit'),'utf8')).trim(),'0',file+' must terminate successfully');
    const line=log.split(/\r?\n/).find(line=>line.startsWith('UI61_SOURCES_SHA256='));assert.ok(line,file+' must identify source');
    const captured=JSON.parse(line.slice('UI61_SOURCES_SHA256='.length));
    for(const input of inputs)assert.equal(captured[input],hashes[input]||digest(await readFile(path.join(frontend,input))),file+' stale input '+input);
    for(const pattern of patterns)assert.match(log,pattern,file);
    const check={id,command:log.split(/\r?\n/).filter(line=>line.startsWith('COMMAND=')).join('\n'),exitCode:0,result:'PASS',expected,observed:expected,log:{path:'BotSalesAI_Frontend/evidence/ui61-consistency-20261020/'+file,sha256:digest(bytes)}};
    const old=evidence.checks.find(item=>item.id===id);if(old)Object.assign(old,check);else evidence.checks.push(check);
    const coverage={name:id,expected:1,observed:1,missing:0,result:'COMPLETE'};
    const oldCoverage=evidence.coverage.find(item=>item.name===id);if(oldCoverage)Object.assign(oldCoverage,coverage);else evidence.coverage.push(coverage);
}
await record('ui61-20261020-source','source-final.log','TypeScript, lint, 42 shared API/composition tests and strict layout/visual/composition checks pass.',[/pass 42/,/fail 0/,/layout-check PASS/,/visual-token-check PASS/,/ui-composition PASS/],runtime);
await record('ui61-20261020-target','target-final.log','26 Chromium/Firefox cases pass: 61-route desktop/mobile matrices, empty tables, status widths, delegation inset, card/dialog radii, Pager, valid jobs/challenge, conditional cards and 0/1/8 long warnings.',[/26 passed/,/COMMAND_EXIT=0/],[...runtime,'tests/ui61-consistency.spec.ts','tests/ui61-states.spec.ts','tests/design/report-warnings-fixture.tsx']);
await record('ui61-20261020-shared','shared-final2.log','40 existing Chromium/Firefox Dashboard, component, finance and dialog/draft regressions pass.',[/40 passed/,/COMMAND_EXIT=0/],[...runtime,'tests/ui-dashboard-layout.spec.ts']);
if(process.argv.includes('--finalize'))await record('ui61-20261020-verify','verify-final2.log','Full npm run verify passes with 256 Vitest cases, generated contracts, source/type/build, policy and S17 gates.',[/256 passed/,/ui-evidence PASS: S17;/,/status=COMPLETE/],[...runtime,'apps/web/tests/report-warnings.test.tsx']);
for(const [name,hash] of Object.entries(hashes))evidence.sourceFingerprints['BotSalesAI_Frontend/'+name]=hash;
evidence.recordedAt=new Date().toISOString();
const scope='UI61 consistency 20261020: current local MSW checks cover 61 canonical routes at desktop/mobile, 3 additional valid job/challenge flows, shared empty-table layout, intrinsic statuses, canonical operational-card radii, delegation inset, responsive pagination and complete finance warnings. Earlier dated checks are retained as historical evidence. Native zoom/text-only resizing, screen reader, physical mobile, backend/provider/production and human acceptance are not claimed.';
if(!evidence.scope.includes(scope))evidence.scope+=' '+scope;
const nl=raw.includes('\r\n')?'\r\n':'\n';await writeFile(manifest,JSON.stringify(evidence,null,2).replaceAll('\n',nl)+nl,'utf8');
console.log(JSON.stringify({phase:process.argv.includes('--finalize')?'finalize':'preverify',checks:evidence.checks.length,coverage:evidence.coverage.length,fingerprints:Object.keys(evidence.sourceFingerprints).length}));
