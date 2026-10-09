import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const output=import.meta.dirname, frontend=path.resolve(output,'../..'), repository=path.dirname(frontend);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel=file=>path.relative(repository,file).replaceAll('\\','/');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const fingerprints={},checks=[],records={};
const stages=[
 ['generate','11 outputs / 283 schemas / 210 operations / 54 routes',/"outputs":11,"schemas":283,"operations":210,"routes":54/],
 ['verify','Full verify: 174 unit, 88 domain/network and strict source/build/UI gates',/Tests\s+174 passed \(174\)/],
 ['e2e','One complete full Chromium/Firefox run: 580/580',/\b580 passed \(/],
 ['unit','174/174 unit cases',/Tests\s+174 passed \(174\)/],
 ['contracts','39/39 contract/composition/ancestry cases',/pass 39\s/],
 ['layout','82/82 fixtures; 79 source files; zero findings; one declared exception',/layout-check PASS: 79 source files, 0 finding\(s\), 1 exception\(s\) used/],
 ['evidence-validator','11/11 provenance fixtures',/pass 11\s/],
 ['source-maps','16/16 feature source-map cases',/pass 16\s/],
 ['built-demo','6/6 dedicated built-demo cases',/\b6 passed \(/],
];
for(const [stage,expected,pattern] of stages){
 const record=read(path.join(repository,read(path.join(output,stage+'-latest.json')).record));
 assert(record.exitCode===0&&!record.sourceDrift.length,'Failed/changed run: '+stage);
 assert(hash(path.join(repository,record.log.path))===record.log.sha256,'Changed raw log: '+stage);
 const log=fs.readFileSync(path.join(repository,record.log.path),'utf8');
 assert(pattern.test(log),'Missing actual full result: '+stage);
 if(stage==='e2e'){
  assert(!/\b\d+ failed\b/.test(log),'Never combine targeted passes with a failed full run');
  for(const marker of ['ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS','ROUTE_EMPTY_COMPOSITION=11/11 RESULT=PASS','ROUTE_ERROR_COMPOSITION=51/51 RESULT=PASS'])assert(log.split(marker).length-1===2,'Missing both-engine proof: '+marker);
  for(const browser of ['chromium','firefox'])for(const [file,count] of [['ui-component-layout.spec.ts',7],['ui-toolbar-layout.spec.ts',6]])assert(log.split('\n').filter(line=>/^\s*ok\s+\d+/.test(line)&&line.includes('['+browser+']')&&line.includes(file+':')).length===count,'Missing current owner cases: '+browser+':'+file);
 }
 if(stage==='verify')assert(log.includes('"passed":88')&&log.includes('Boundary fixtures: PASS 10/10'),'Missing strict domain/boundary proof');
 for(const [file,digest] of Object.entries(record.sourceFingerprints))assert(hash(path.join(repository,file))===digest,'Stale executed source: '+stage+':'+file);
 Object.assign(fingerprints,record.sourceFingerprints);records[stage]=record;
 checks.push({id:stage,command:record.executable+' '+record.args.join(' '),exitCode:0,result:'PASS',expected,observed:expected,log:record.log});
}
function proof(id,file,expected,validate){
 const absolute=path.resolve(frontend,file),value=read(absolute);validate(value);fingerprints[rel(absolute)]=hash(absolute);
 checks.push({id,command:'Actual execution/reviewer documented in '+file,exitCode:0,result:'PASS',expected,observed:expected,log:{path:rel(absolute),sha256:hash(absolute)}});return value;
}
const cold=proof('cold-build','evidence/frontend-component-fixes-20261008/clean-artifacts-components-20261008.json','10 actual isolated stages; repeated production/demo byte identical',value=>{
 assert(value.status==='PASS'&&value.commandRuns.length===10&&value.commandRuns.every(run=>run.exitCode===0),'Cold stages incomplete');
 assert(value.sourceLockSha256===hash(path.join(frontend,'package-lock.json'))&&!value.userEnvLocalCopied,'Cold lock/scope changed');
 assert(!value.artifacts.productionRepeat.workerIncluded&&value.artifacts.demoRepeat.workerIncluded&&!value.artifacts.productionMarkerMatches.length,'Mock isolation failed');
 for(const [directory,name] of [['dist','productionRepeat'],['dist-demo','demoRepeat']])for(const file of value.artifacts[name].files)assert(hash(path.join(frontend,'apps/web',directory,file.path))===file.sha256,'Current/cold artifact differs: '+file.path);
});
proof('environment','evidence/frontend-component-fixes-20261008/environment-current.json','Six install/tree/setup/doctor/audit executions; protected files unchanged',value=>{
 assert(value.runs.length===6&&value.runs.every(run=>!run.exitCode)&&!value.drift.length,'Environment incomplete');
 for(const [file,digest]of Object.entries(value.before))assert(hash(path.join(frontend,file))===digest,'Environment source changed');
 for(const run of value.runs)assert(hash(path.join(repository,run.log.path))===run.log.sha256,'Environment log changed');
});
const nativeFiles={
 'evidence/frontend-component-fixes-20261008/actual-browser-zoom-200-current-components-native-r5-20261008.json':7,
 'evidence/frontend-component-fixes-20261008/native-text-only-200-current-components-native-r5-20261008.json':7,
 'evidence/frontend-corrections-20261008/actual-browser-zoom-200-current-components-inherited-current-20261008.json':1,
 'evidence/frontend-corrections-20261008/native-text-only-200-current-components-inherited-current-20261008.json':1,
 'evidence/frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-components-inherited-current-20261008.json':5,
 'evidence/frontend-ui-improvements/UI028/W30/native-text-only-200-current-components-inherited-current-20261008.json':5,
 'evidence/frontend-toolbar-20261008/actual-browser-zoom-200-current-components-inherited-current-20261008.json':3,
 'evidence/frontend-toolbar-20261008/native-text-only-200-current-components-inherited-current-20261008.json':4,
};
for(const [file,count]of Object.entries(nativeFiles))proof('native-'+path.basename(file)+'-'+count,file,count+'/'+count+' native scenarios PASS',value=>{
 assert(value.result==='PASS'&&value.scenarios.length===count&&value.scenarios.every(item=>item.result==='PASS'),'Native incomplete: '+file);
 for(const [source,digest]of Object.entries(value.sourceSha256)){assert(hash(path.resolve(frontend,source))===digest,'Stale native source: '+source);fingerprints[rel(path.resolve(frontend,source))]=digest;}
});
proof('built-review','evidence/frontend-component-fixes-20261008/built-comparison-review-current.json','Both engines: compiled conflict flow, Toolbar and A01/A02/A03/A07 at 320/1440',value=>{
 assert(value.status==='PASS'&&!value.execution.exitCode&&value.observations.length===2,'Built review incomplete');
 for(const observation of value.observations){assert(observation.result==='PASS'&&observation.toolbar.length===2&&observation.components.length===2&&!observation.pageErrors.length,'Built observations incomplete');for(const item of observation.components){assert(item.order.actual<=item.order.natural+1&&item.imports.actual<=item.imports.natural+1&&item.readonlyAddress&&item.readonlyPayment,'Built layout invariant failed');assert(hash(path.join(repository,item.screenshot.path))===item.screenshot.sha256,'Built screenshot changed');}}
 for(const file of value.artifactFiles)assert(hash(path.join(frontend,file.path))===file.sha256,'Built artifact changed');
 for(const [source,digest]of Object.entries(value.sourceFingerprints))assert(hash(path.join(frontend,source))===digest,'Built reviewer changed');
});
proof('final-verify-preservation','evidence/frontend-component-fixes-20261008/final-verify-preservation.json','Final verify PASS; fresh domain output retained; current domain proof preserved',value=>{
 assert(!value.exitCode&&value.freshExecution&&value.originalRestored&&!value.sourceDrift.length&&value.verificationRecord===read(path.join(output,'verify-latest.json')).record,'Final verify provenance invalid');
 assert(value.producedResult.status==='PASS'&&value.producedResult.simulator===75&&value.producedResult.network===13,'Fresh domain result incomplete');
 for(const artifact of [value.original,value.produced]){assert(hash(path.join(repository,artifact.path))===artifact.sha256,'Domain artifact changed');fingerprints[artifact.path]=artifact.sha256;}
 assert(hash(path.join(frontend,'evidence/domain-tests.json'))===value.original.sha256,'Canonical domain proof changed');
});
proof('route-matrices','evidence/frontend-component-fixes-20261008/route-matrices-refresh-current.json','Two canonical generators; current actual unit/browser logs; unchanged route/feature/state/role semantics',value=>{
 assert(value.status==='PASS'&&!value.semanticDrift.length&&value.runs.length===2&&value.runs.every(run=>!run.exitCode),'Route matrix refresh incomplete');
 for(const artifact of [...value.inputs,...value.outputs])assert(hash(path.join(repository,artifact.path))===artifact.sha256,'Changed matrix evidence: '+artifact.path);
 for(const [file,digest]of Object.entries(value.sourceFingerprints)){assert(hash(path.join(repository,file))===digest,'Changed matrix owner');fingerprints[file]=digest;}
});
const inventory=read(path.join(output,'inventory-current.json')),apis=read(path.join(output,'shared-api-current.json')).apis,documents=read(path.join(output,'documents-current.json')),diff=read(path.join(output,'diff-review-current.json'));
assert(inventory.summary.allRelevantAssigned&&!inventory.unknownFiles.length&&!inventory.runtimeUnresolvedOwnImports.length&&!inventory.summary.routeMappingsMissing&&inventory.summary.modules===16&&inventory.summary.sourceFiles===76&&apis.length===28,'Incomplete inventory');
for(const file of inventory.files)assert(hash(path.resolve(frontend,file.path))===file.sha256,'Stale inventory: '+file.path);
assert(!documents.problems.length,'Documentation problems');for(const [file,digest]of Object.entries(documents.sourceFingerprints)){assert(hash(path.join(repository,file))===digest,'Stale document review');fingerprints[file]=digest;}
assert(!diff.unexpectedChanges.length&&!diff.originalPathsMissing.length&&!diff.beforeProtectedDirty.length&&!diff.gitDiffCheck.exitCode&&!diff.fullProductGitCheck.exitCode,'Unreviewed source or original work changed');
const canonicalPointer=read(path.join(output,'canonical-revalidation-latest.json')),canonical=read(path.join(output,canonicalPointer.record));
const status=JSON.parse(execFileSync(process.execPath,['scripts/progress.mjs','status'],{cwd:path.join(repository,'botsales-kit'),encoding:'utf8'}));
assert(!canonical.fullProductDrift.length&&status.verifiedSteps===140&&status.totalSteps===140&&!status.stale.length&&!status.blocked.length,'Canonical FE is not fresh');
const baseline=read(path.join(output,'baseline.json')),provenance=read(path.join(output,'implementation-provenance-current.json'));
assert(Date.parse(baseline.capturedAt)<Date.parse(provenance.implementationStartedAt)&&provenance.runtimeFingerprintsCompared===76&&!provenance.mismatches.length,'Before-source provenance not paired');
const auditFile=path.resolve(output,'../frontend-component-risk-audit-20261008/audit-final.json'),audit=read(auditFile);
assert(hash(auditFile)===baseline.pairedBaseline.manifestHash,'Before audit changed');
for(const [file,digest]of Object.entries(audit.artifacts))assert(hash(path.join(path.dirname(auditFile),file))===digest,'Historical baseline artifact changed: '+file);
const baselineFiles=['baseline.json','implementation-provenance.json','implementation-provenance-current.json','runs/components-1791457648969-87668/regression-record.json','runs/components-1791457648969-87668/regression.log'].map(file=>path.join(output,file)).concat(auditFile);
for(const file of ['inventory-current.json','shared-api-current.json','documents-current.json','diff-review-current.json','canonical-revalidation-latest.json',canonicalPointer.record,'REPORT.md','CONTRACT.md','ANALOGOUS_PATTERNS.md','ACCEPTANCE_GUIDE.md','S01-contract-crosswalk-current-20261008.json','uat-matrix-components-20261008.json','quality-gate-matrix-components-20261008.json','production-claim-review-components-20261008.json','finalize-current.mjs'])fingerprints[rel(path.join(output,file))]=hash(path.join(output,file));
const matrix=read(path.join(frontend,'docs/route-state-role-matrix.json'));assert(matrix.routes.length===54&&matrix.summary.routeRoleBrowserMatrix==='PASS'&&matrix.summary.routeMountSmoke==='PASS','Current route/state proof incomplete');
const coverage=(name,count,reason)=>({name,expected:count,observed:count,missing:0,result:'COMPLETE',reason});
const manifest={schemaVersion:1,step:'S19',scope:'A01–A07 and all confirmed analogous consumers; full inherited React/MSW local regression on final source.',recordedAt:new Date().toISOString(),status:'COMPLETE',checks,coverage:[coverage('source-files',76,'Runtime/import/owner inventory with strict source/build gates.'),coverage('shared-api-exports',28,'Actual symbol/catalog contracts and direct render tests; supporting Column is separate.'),coverage('route-mappings',54,'Canonical manifest/router/component mapping.'),coverage('rendered-routes',54,'Full route smoke/axe/role/layout cases in both engines; not every business branch.'),coverage('slots',28,'All public APIs covered by direct rendered contracts; affected field/action/readonly/menu behavior has dedicated regression.'),coverage('states',432,'Canonical applicable/shared/route-specific/N/A dispositions retain distinctions.'),coverage('baseline-records',712,'Prior 432 route,204 state,16 select,60 stress observations, hash paired to before-source baseline; diagnostic findings are not treated as after-fix PASS.'),coverage('native-scenarios',33,'Separate actual browser zoom and native text-only methods, current source hashes.'),coverage('affected-runtime-files',diff.changedInputs.length,'13 permitted owner/consumer changes; unchanged owners KEEP_VERIFY.')],baseline:{status:'CAPTURED',capturedAt:baseline.capturedAt,implementationStartedAt:provenance.implementationStartedAt,artifacts:baselineFiles.map(file=>({path:rel(file),sha256:hash(file)})),sourceFingerprints:Object.fromEntries(Object.entries(baseline.source).map(([file,digest])=>['BotSalesAI_Frontend/'+file,digest])),reason:'Before-source baseline matches all76 runtime inputs of the failing A01 run. Actual first runtime patch timestamp/call ID is captured from this task session. Historical audit artifacts are unchanged; their diagnostic mode is not acceptance evidence. A06 is conditional hardening with no seed failure.'},sourceFingerprints:fingerprints,knownLimits:['Frontend synthetic local scope only; Backend/provider/staging/production runtime outside scope.','Screen-reader speech, broad human conformance and hosted CI NOT_RUN; user acceptance PENDING.','Failed/interrupted attempts remain historical; targeted passes never close a failed full run.','Cold workspace retention is explicit; no cleanup claim.','Regressions protect measured invariants; no guarantee against every future UI defect.']};
fs.writeFileSync(path.join(output,'S19-current-evidence.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({checks:checks.length,coverage:manifest.coverage.length,sourceFingerprints:Object.keys(fingerprints).length,FE:status.verifiedSteps+'/140',fullBrowser:580,demoTree:cold.artifacts.demoRepeat.treeSha256}));
