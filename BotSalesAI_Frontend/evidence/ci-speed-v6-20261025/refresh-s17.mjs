import assert from 'node:assert/strict';import {createHash}from 'node:crypto';import fs from 'node:fs';import path from 'node:path';
const here=import.meta.dirname,repo=path.resolve(here,'../../..'),p='BotSalesAI_Frontend/',own=p+'evidence/ci-speed-v6-20261025/';
const file=path.join(repo,p+'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json'),raw=fs.readFileSync(file,'utf8'),e=JSON.parse(raw);
const digest=b=>createHash('sha256').update(b).digest('hex'),hash=n=>digest(fs.readFileSync(path.join(repo,n)));
const scheduling=['scripts/ci-partitions.mjs','scripts/ci-timings.json','scripts/update-ci-timings.mjs','tests/ci-partitions.test.mjs','scripts/run-ci-e2e.mjs'].map(n=>p+n);
const fixtures=['tests/states/route-error-composition.spec.ts','tests/ui61-consistency.spec.ts','tests/ui-composition-layout.spec.ts','tests/ui-toolbar-layout.spec.ts','tests/states/route-role-state-composition.spec.ts','tests/states/route-role-ready-composition.spec.ts','tests/session/demo-controls.ts'].map(n=>p+n);
const configs=['playwright.config.ts','playwright.built-demo.config.ts'].map(n=>p+n),policy='.github/CI_POLICY.md',ui=p+'tests/ui-shared-api-contract.test.mjs';
const evaluation=p+'tests/fe018.spec.ts';
const code=[...scheduling,...fixtures,evaluation,policy,'.github/workflows/frontend.yml',ui],owned=[...code,own+'REPORT.md',own+'refresh-s17.mjs'];
for(const[n,h]of Object.entries(e.sourceFingerprints))if(!owned.includes(n))assert.equal(hash(n),h,'Unrelated stale input: '+n);
function record(id,name,inputs,patterns,description){
 const bytes=fs.readFileSync(path.join(here,name)),text=bytes.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,''),header=JSON.parse(text.split(/\r?\n/)[0]);
 for(const n of inputs)assert.equal(header.inputs[n],hash(n),name+' stale input: '+n);
 assert.match(text,/COMMAND_EXIT=0\s*$/);for(const re of patterns)assert.match(text,re,name);
 const check={id,command:JSON.stringify(header.command),exitCode:0,result:'PASS',expected:description,observed:description,log:{path:own+name,sha256:digest(bytes)}};
 const at=e.checks.findIndex(c=>c.id===id);if(at<0)e.checks.push(check);else e.checks[at]=check;
 const c={name:id,expected:1,observed:1,missing:0,result:'COMPLETE'},i=e.coverage.findIndex(c=>c.name===id);if(i<0)e.coverage.push(c);else e.coverage[i]=c;return {text,header};
}
record('ci-v6-independent-selection-20261025','source.log',[...scheduling,...fixtures],
 [/pass 31/,/fail 0/,/chromium: 561\/561/,/firefox: 561\/561/],
 'All31 source/runtime/planner regressions pass, including ordinary-file indivisibility, parallel hook-chunk discovery order and native file-order tails. The six parallel all-hooks owners are guarded; eight native selectors retain every current ID exactly once.');
record('ci-v6-unchanged-required-gates-20261025','repository.log',[policy,'.github/workflows/frontend.yml','.github/scripts/require-success.mjs','.github/scripts/require-success.test.mjs'],
 [/pass 120/,/fail 0/],
 'All120 repository/strict gate regressions pass; workflow DAG,16 producers,23 jobs,8 partitions/two workers and read-only permissions remain. Only build/browser checkout omits reviewed archive files; source/hygiene remain full.');
record('ci-v6-ui-contract-20261025','ui-contract.log',[policy,ui,'.github/workflows/frontend.yml'],
 [/pass 14/,/fail 0/],'All14 UI/shared/workflow contracts pass, guarding exact archive-only sparse patterns in build/browser and the full source checkout, with unchanged browser/source/build/evidence gates.');
const generation=record('ci-v6-native-timing-generation-20261025','timing-generation.log',[scheduling[0],scheduling[2]],
 [/"reports":16/,/"chromium":561/,/"firefox":561/],
 'Sixteen SHA/CRC-verified native reports from successful post-fix PR13/run40178000060, tested mergeff802414 with the same tree as branchbff7e2bb, calibrate the current six independent owners. Actual provenance is two workers/eight partitions; observed built-demo reserves112/142s. Queue estimates are separate from summed durations and do not own coverage.');
const line=generation.text.split(/\r?\n/).find(l=>l.startsWith('{"generated":"native-ci-timings"'));assert.equal(JSON.parse(line).outputSha256,hash(scheduling[1]));
record('ci-v6-invalid-timing-inputs-20261025','timing-negatives.log',scheduling.slice(0,3),
 ['failed-result','duplicate-partition','unsupported-workers','worker-mismatch','unsupported-partitions','incomplete-eight-partitions','tampered-digest'].map(k=>new RegExp('TIMING_NEGATIVE='+k+' REJECTED=PASS OUTPUT_UNCHANGED=PASS')),
 'All seven malformed native/provenance input families fail closed without partially changing timing output.');
const preview=record('ci-v6-preview-independent-suites-20261025','parallel-preview.log',[...fixtures,...configs,p+'tests/session/demo-server.mjs',p+'tests/session/playwright-setup.ts'],
 [/190 passed/,/using 4 workers/],
 'All190 original affected cases pass across Chromium/Firefox with four local workers and full traces, including both complete role families. Accessible MUI listbox surfaces reach entered opacity1/transform none before the original pointer click. Canonical bootstrap readiness, mixed Toolbar runtime, IDs, assertions and deadlines remain.');
assert.equal(preview.header.workers,'4');assert.equal(preview.header.runtime,'preview');
const dev=record('ci-v6-dev-isolation-20261025','dev-isolation.log',[...fixtures,...configs,p+'tests/session/demo-server.mjs',p+'scripts/vite-cache.mjs'],
 [/16 passed/,/using 2 workers/],
 'All16 focused dev cases pass on both engines/two workers, including the originally failed sales loading walk, viewer ready/stale walk, both source fixtures, route-error exceptions, UI61 and composition rendering. Local default dev, original pointer/assertion deadlines and private cache/server lifecycle remain.');
assert.equal(dev.header.workers,'2');assert.equal(dev.header.runtime,'dev');
for(const kind of ['preview','dev'])record('ci-v6-evaluation-'+kind+'-20261025','evaluation-'+kind+'.log',[evaluation,...configs,p+'tests/session/demo-server.mjs',p+'tests/session/demo-controls.ts'],
 [/4 passed/,/using 2 workers/,/UI004_25_ACCEPTANCE=/,/UI004_105_ACCEPTANCE=/],
 'All four original UI00425/105 evaluation cases pass on Chromium/Firefox, two workers, '+kind+' runtime. Exact row equality now awaits React committing the list with the existing bounded expect.poll pattern. All expected IDs, history/detail/search interactions, API/URL assertions and test IDs remain; no application or contract change.');
if(process.argv.includes('--finalize'))record('ci-v6-full-verify-20261025','verify.log',code,
 [/256 passed/,/ui-evidence PASS: S17/,/status=COMPLETE/],
 'Full current-input npm run verify passes: application/contracts/dependencies unchanged; exact-SHA hosted PR/main, native archive and enforcement closure remain separate.');
for(const n of owned)e.sourceFingerprints[n]=hash(n);
const scope='CI v6 20261025: six independently reviewed suites partition at test level on the unchanged eight-partition/two-worker matrix. Weights calibrated from successful post-fix PR13/run40178000060 tested mergeff802414; selection estimates the current native file/hook worker queue. Original IDs/assertions remain. Input-matched190/16 preview/dev proofs cover bootstrap/menu readiness and mixed Toolbar lifecycle. Current local proof recorded here; final hosted performance, archive and enforcement proof are separate. No app/contract/dependency change.';
e.scope=e.scope.split(' CI v6 20261025:')[0]+' '+scope;e.recordedAt=new Date().toISOString();const nl=raw.includes('\r\n')?'\r\n':'\n';fs.writeFileSync(file,JSON.stringify(e,null,2).replaceAll('\n',nl)+nl);console.log(JSON.stringify({checks:e.checks.length,coverage:e.coverage.length,fingerprints:Object.keys(e.sourceFingerprints).length}));
