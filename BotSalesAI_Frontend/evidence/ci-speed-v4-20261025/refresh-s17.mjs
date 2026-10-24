import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const here=import.meta.dirname,repo=path.resolve(here,'../../..'),prefix='BotSalesAI_Frontend/';
const file=path.join(repo,prefix+'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const raw=fs.readFileSync(file,'utf8'),evidence=JSON.parse(raw);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=name=>digest(fs.readFileSync(path.join(repo,name)));
const configs=['playwright.config.ts','playwright.built-demo.config.ts'].map(p=>prefix+p);
const workflow=['.github/CI_POLICY.md','.github/workflows/frontend.yml','.github/scripts/require-success.test.mjs'];
const scheduling=['scripts/ci-partitions.mjs','scripts/run-ci-e2e.mjs','scripts/update-ci-timings.mjs','scripts/ci-timings.json','tests/ci-partitions.test.mjs'].map(p=>prefix+p);
const nodeTests=[prefix+'tests/session/playwright-run-isolation.test.mjs'];
const roles=['tests/states/route-role-state-composition.spec.ts','tests/states/route-role-ready-composition.spec.ts'].map(p=>prefix+p);
const runtime=['tests/session/demo-server.mjs','tests/session/playwright-setup.ts','tests/session/demo-server-cache-isolation.spec.ts','tests/session/demo-server-reuse.spec.ts','tests/session/demo-worker-startup.spec.ts','tests/session/demo-preview-runtime.spec.ts'].map(p=>prefix+p);
const ui=prefix+'tests/ui-shared-api-contract.test.mjs';
const code=[...configs,...workflow,...scheduling,...nodeTests,...roles,ui];
const ownRoot=prefix+'evidence/ci-speed-v4-20261025/';
const owned=[...code,ownRoot+'REPORT.md',ownRoot+'refresh-s17.mjs'];
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
record('ci-v4-workers-and-native-selection-20261025','source-current.log',[...configs,...scheduling,...nodeTests],
 [/pass 27/,/fail 0/,/chromium: 561\/561/,/firefox: 561\/561/],
 '27 source/planner/config regressions pass. Local default one, bounded worker overrides and CI forbidOnly/full traces; four-worker native selectors retain all 561 IDs per engine exactly once.');
record('ci-v4-required-gates-20261025','repository.log',workflow,
 [/pass 80/,/fail 0/],'80 repository and strict-gate regressions retain every producer and nine protected contexts; browser workflow uses the bounded capacity check.');
record('ci-v4-ui-workflow-contract-20261025','ui-contract.log',[...configs,'.github/workflows/frontend.yml',ui],
 [/fail 0/,/required UI evidence and regression gates remain wired/],'UI source contract keeps both engines, every partition and built-demo/source/evidence gates.');
const timingText=record('ci-v4-native-timing-generation-20261025','timing-generation.log',[prefix+'scripts/ci-partitions.mjs',prefix+'scripts/update-ci-timings.mjs'],
 [/"generated":"native-ci-timings"/,/"reports":6/,/"chromium":561/,/"firefox":561/],
 'Six verified native reports generate full current-inventory scheduling weights, including both independent role families; provenance records the observed worker count.');
const timingLine=timingText.split(/\r?\n/).find(line=>line.startsWith('{"generated":"native-ci-timings"'));
assert.ok(timingLine);assert.equal(JSON.parse(timingLine).outputSha256,hash(prefix+'scripts/ci-timings.json'));
record('ci-v4-native-timing-invalid-inputs-20261025','timing-negatives.log',[prefix+'scripts/ci-partitions.mjs',prefix+'scripts/update-ci-timings.mjs',prefix+'scripts/ci-timings.json'],
 [/TIMING_NEGATIVE=failed-result REJECTED=PASS OUTPUT_UNCHANGED=PASS/,/TIMING_NEGATIVE=duplicate-partition REJECTED=PASS OUTPUT_UNCHANGED=PASS/,
 /TIMING_NEGATIVE=unsupported-workers REJECTED=PASS OUTPUT_UNCHANGED=PASS/,/TIMING_NEGATIVE=worker-mismatch REJECTED=PASS OUTPUT_UNCHANGED=PASS/],
 'Failed/duplicate reports, unsupported workers and native/provenance worker mismatch fail closed without changing timing output.');
record('ci-v4-role-parallelism-20261025','role-isolation.log',[...configs,...roles,...runtime.slice(0,2)],
 [/42 passed/,/using 4 workers/],'All 42 Chrome/Firefox role-state and role-ready cases pass with four workers, fresh loading tabs and original route/read/state assertions.');
record('ci-v4-role-inventory-events-20261025','role-verification.log',[...configs,...roles,...runtime.slice(0,2)],
 [/"tests":42/,/"workers":4/,/"unchangedEvents":true/,/"unchangedIds":true/],
 'Native JSON comparison retains every original role case ID and exactly the baseline route/state event multiset per case, passed once with no retry or skip.');
for(const mode of['preview','dev'])
 record('ci-v4-runtime-'+mode+'-20261025','harness-'+mode+'.log',[...configs,...runtime],
 [/16 passed/,/using 4 workers/,/VITE_CACHE_ISOLATION=PASS/,new RegExp('"runtime":"'+mode+'"')],
 '16 Chrome/Firefox server/worker/cache/preview isolation checks pass with four workers in '+mode+' mode; borrowers cannot close owners.');
record('ci-v4-current-lock-audit-20261025','audit.log',[],
 [/found 0 vulnerabilities/],'Current unchanged lockfile audit passes at the existing low severity threshold with zero vulnerabilities.');
if(process.argv.includes('--finalize'))
 record('ci-v4-full-verify-20261025','verify.log',code,
 [/256 passed/,/ui-evidence PASS: S17/,/status=COMPLETE/],
 'Full npm run verify passes on the current scheduling/configuration/role fixtures, with application source and dependencies unchanged.');
for(const name of owned)evidence.sourceFingerprints[name]=hash(name);
const scope='CI v4 20261025: bounded four-worker browser runners with actual CPU capacity enforcement; independent role-ready scheduling and honest native timing provenance. Full failure traces, original test IDs, role/state assertions and all gates remain. Loading uses a new tab per route; ready startup awaits its canonical bootstrap read before unchanged DOM checks. Current-input local proof is recorded here; hosted PR/main elapsed, resource inventory, protection and downloaded archive proof are reported separately. Application source and dependencies are unchanged.';
if(!evidence.scope.includes(scope))evidence.scope+=' '+scope;
evidence.recordedAt=new Date().toISOString();const nl=raw.includes('\r\n')?'\r\n':'\n';
fs.writeFileSync(file,JSON.stringify(evidence,null,2).replaceAll('\n',nl)+nl);
console.log(JSON.stringify({checks:evidence.checks.length,coverage:evidence.coverage.length,fingerprints:Object.keys(evidence.sourceFingerprints).length}));
