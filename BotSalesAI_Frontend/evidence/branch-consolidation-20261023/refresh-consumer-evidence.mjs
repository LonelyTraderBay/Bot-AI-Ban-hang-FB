import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../..');
const prefix='BotSalesAI_Frontend/';
const manifest=path.join(repo,prefix+'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw=fs.readFileSync(manifest,'utf8'),evidence=JSON.parse(raw);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const emptyInputs=['tests/session/assert-empty-table.ts','tests/states/route-empty-composition.spec.ts','tests/states/route-role-empty-list-composition.spec.ts','tests/states/route-role-state-composition.spec.ts'];
const layoutInputs=['tests/ui-dashboard-layout.spec.ts','tests/ui61-consistency.spec.ts'];
const inboxInputs=['tests/ui012-keyboard.spec.ts','apps/web/src/modules/inbox/index.tsx'];
const owned=[...emptyInputs,...layoutInputs,...inboxInputs,'evidence/branch-consolidation-20261023/refresh-consumer-evidence.mjs'].map(name=>prefix+name);
for(const [name,hash]of Object.entries(evidence.sourceFingerprints))if(!owned.includes(name))assert.equal(digest(fs.readFileSync(path.join(repo,name))),hash,'Unrelated stale fingerprint: '+name);

function record(id,file,inputs,count,patterns){
    const bytes=fs.readFileSync(path.join(here,file));
    const text=bytes.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
    const header=JSON.parse(text.split(/\r?\n/)[0]);
    assert.equal(header.vite,'7.3.7');
    for(const name of [...inputs,'package.json','package-lock.json'])assert.equal(header.inputs[prefix+name],digest(fs.readFileSync(path.join(repo,prefix+name))),file+' stale input '+name);
    assert.match(text,/COMMAND_EXIT=0/);
    for(const pattern of patterns)assert.match(text,pattern);
    if(count)assert.match(text,new RegExp('\\b'+count+' passed'));
    const expected=count?`${count} Chromium/Firefox cases pass with the current scoped inputs.`:'Full verify passes after the consumer assertion/readiness and inbox response-order fixes.';
    const check={id,command:JSON.stringify(header.command),exitCode:0,result:'PASS',expected,observed:expected,log:{path:prefix+'evidence/branch-consolidation-20261023/'+file,sha256:digest(bytes)}};
    const at=evidence.checks.findIndex(c=>c.id===id);if(at<0)evidence.checks.push(check);else evidence.checks[at]=check;
    const coverage={name:id,expected:1,observed:1,missing:0,result:'COMPLETE'};
    const ci=evidence.coverage.findIndex(c=>c.name===id);if(ci<0)evidence.coverage.push(coverage);else evidence.coverage[ci]=coverage;
}
record('consolidation-empty-consumers-20261023','empty-consumers-target.log',emptyInputs,30,[/ROLE_EMPTY_LIST_COMPOSITION=owner:46\/46 RESULT=PASS/,/BROWSER=chromium ROLE_STATE=empty/,/BROWSER=firefox ROLE_STATE=empty/]);
record('consolidation-layout-consumers-20261023','layout-consumers-target.log',layoutInputs,28,[]);
record('consolidation-inbox-consumers-20261023','inbox-consumers-target.log',inboxInputs,24,[/messages resolve before conversation/]);
record('consolidation-inbox-built-demo-20261023','inbox-built-demo.log',['apps/web/src/modules/inbox/index.tsx'],6,[]);
if(process.argv.includes('--finalize'))record('consolidation-consumers-verify-20261023','consumers-verify.log',[...emptyInputs,...layoutInputs,...inboxInputs],0,[/256 passed/,/ui-evidence PASS: S17/,/status=COMPLETE/]);
for(const name of owned)evidence.sourceFingerprints[name]=digest(fs.readFileSync(path.join(repo,name)));
const scope='Branch consolidation consumer fixes 20261023: route/role empty-table assertions now verify the UI61 surface-owned status/polite announcement, named table region and zero data rows; Stats uses a single measured snapshot after canonical URL normalization; the route layout matrix waits up to 15 seconds for cold Suspense chunks. Inbox auto-scroll also observes the initial conversation readiness so messages resolving before their container can scroll when it mounts. Geometry/permission/error-state expectations are retained. Earlier browser records remain historical to their inputs.';
if(!evidence.scope.includes(scope))evidence.scope+=' '+scope;
const limit='Hosted 71078cc2 Firefox shards 2/3 and 3/3 exposed stale empty-table assertions, layout test readiness races and inbox response-order auto-scroll; their failed logs/artifacts are retained separately. Local scoped results are not final hosted or main closing CI.';
if(!evidence.knownLimits.includes(limit))evidence.knownLimits.push(limit);
evidence.recordedAt=new Date().toISOString();
const nl=raw.includes('\r\n')?'\r\n':'\n';
fs.writeFileSync(manifest,JSON.stringify(evidence,null,2).replaceAll('\n',nl)+nl);
console.log(JSON.stringify({phase:process.argv.includes('--finalize')?'finalize':'preverify',checks:evidence.checks.length,coverage:evidence.coverage.length,fingerprints:Object.keys(evidence.sourceFingerprints).length}));
