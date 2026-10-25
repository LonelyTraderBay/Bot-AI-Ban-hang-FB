import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const here=import.meta.dirname,repo=path.resolve(here,'../../..'),prefix='BotSalesAI_Frontend/';
const file=path.join(repo,prefix+'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw=fs.readFileSync(file,'utf8'),evidence=JSON.parse(raw);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=name=>digest(fs.readFileSync(path.join(repo,name)));
const workflow=['.github/CI_POLICY.md','.github/workflows/frontend.yml','.github/scripts/require-success.mjs','.github/scripts/require-success.test.mjs'];
const scheduling=['scripts/ci-partitions.mjs','scripts/run-ci-e2e.mjs','scripts/update-ci-timings.mjs','scripts/ci-timings.json','tests/ci-partitions.test.mjs'].map(p=>prefix+p);
const ui=prefix+'tests/ui-shared-api-contract.test.mjs',code=[...workflow,...scheduling,ui];
const ownRoot=prefix+'evidence/ci-speed-v5-20261025/',owned=[...code,ownRoot+'REPORT.md',ownRoot+'refresh-s17.mjs'];
for(const[name,expected]of Object.entries(evidence.sourceFingerprints))
 if(!owned.includes(name))assert.equal(hash(name),expected,'Unrelated stale fingerprint: '+name);
function record(id,log,inputs,patterns,description){
 const bytes=fs.readFileSync(path.join(here,log)),text=bytes.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
 const header=JSON.parse(text.split(/\r?\n/)[0]);
 for(const name of inputs)assert.equal(header.inputs[name],hash(name),log+' stale input: '+name);
 assert.match(text,/COMMAND_EXIT=0\s*$/);for(const pattern of patterns)assert.match(text,pattern,log);
 const check={id,command:JSON.stringify(header.command),exitCode:0,result:'PASS',expected:description,observed:description,log:{path:ownRoot+log,sha256:digest(bytes)}};
 const at=evidence.checks.findIndex(c=>c.id===id);if(at<0)evidence.checks.push(check);else evidence.checks[at]=check;
 const coverage={name:id,expected:1,observed:1,missing:0,result:'COMPLETE'},index=evidence.coverage.findIndex(c=>c.name===id);
 if(index<0)evidence.coverage.push(coverage);else evidence.coverage[index]=coverage;
 return text;
}
record('ci-v5-eight-native-partitions-20261025','source.log',scheduling,
 [/pass 27/,/fail 0/,/chromium: 561\/561/,/firefox: 561\/561/],
 'All 27 source/runtime/planner regressions pass; eight native two-worker selectors retain all 561 current IDs per engine exactly once, including new unweighted tests.');
record('ci-v5-sixteen-required-producers-20261025','repository.log',workflow,
 [/pass 120/,/fail 0/],
 'All 120 repository and strict-gate regressions pass; both aggregate gates require all sixteen browser producers from one run/attempt and reject missing, failed, skipped or neutral jobs, including partition eight.');
record('ci-v5-ui-workflow-contract-20261025','ui-contract.log',[...workflow,scheduling[1],ui],
 [/pass 14/,/fail 0/,/required UI evidence and regression gates remain wired/],
 'All fourteen shared UI contract regressions pass; full source/build/evidence checks, Chrome Stable and Firefox, eight native partitions and one built-demo per engine stay wired.');
const timingText=record('ci-v5-native-timing-generation-20261025','timing-generation.log',[scheduling[0],scheduling[2]],
 [/"generated":"native-ci-timings"/,/"reports":12/,/"chromium":561/,/"firefox":561/],
 'Twelve digest/CRC-verified successful native reports from main21ca3e3b/run40125457076 generate weights for all current IDs. Provenance retains the actual two workers and six partitions; measured built-demo wall reserves110/123s.');
const generated=JSON.parse(timingText.split(/\r?\n/).find(line=>line.startsWith('{"generated":"native-ci-timings"')));
assert.equal(generated.outputSha256,hash(scheduling[3]));
assert.equal(generated.revision,'21ca3e3b125edb0a9e5614e4f0abfd665543c85d');
record('ci-v5-native-timing-invalid-inputs-20261025','timing-negatives.log',[scheduling[0],scheduling[2],scheduling[3]],
 ['failed-result','duplicate-partition','unsupported-workers','worker-mismatch','unsupported-partitions','incomplete-eight-partitions','tampered-digest'].map(kind=>new RegExp('TIMING_NEGATIVE='+kind+' REJECTED=PASS OUTPUT_UNCHANGED=PASS')),
 'Failed/duplicate/incomplete/tampered native reports and incompatible worker/partition metadata fail closed without changing timing output; supported provenance partition counts are3,6,8.');
if(process.argv.includes('--finalize'))record('ci-v5-full-verify-20261025','verify.log',[...scheduling,ui],
 [/256 passed/,/ui-evidence PASS: S17/,/status=COMPLETE/],
 'Full npm run verify passes with eight-partition scheduling and calibrated current weights; these source/build inputs remain unchanged during the run. Sparse aggregate checkout wiring changed after that run started and has separate current-input repository/UI contract proofs above. Application/contracts/dependencies unchanged. Hosted exact-SHA PR/main verification, performance, native archive closure and protection readback are separate proofs.');
for(const name of owned)evidence.sourceFingerprints[name]=hash(name);
const scope='CI v5 20261025: eight partitions per engine, two workers per runner, calibrated from verified successful final-main native reports at21ca3e3b. Current discovery owns all IDs; native plan/results and both aggregates retain every producer with no skip/retry/trace reduction. Application/contracts/dependencies unchanged. Current-input local proof is recorded here; hosted performance, protection and archive closure are separate.';
evidence.scope=evidence.scope.split(' CI v5 20261025:')[0]+' '+scope;
evidence.recordedAt=new Date().toISOString();const nl=raw.includes('\r\n')?'\r\n':'\n';
fs.writeFileSync(file,JSON.stringify(evidence,null,2).replaceAll('\n',nl)+nl);
console.log(JSON.stringify({checks:evidence.checks.length,coverage:evidence.coverage.length,fingerprints:Object.keys(evidence.sourceFingerprints).length}));
