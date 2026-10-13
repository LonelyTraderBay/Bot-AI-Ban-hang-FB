import fs from 'node:fs';
import {verifyCurrentInputs} from './current-inputs.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import ts from 'typescript';
const out=import.meta.dirname, frontend=path.resolve(out,'../..'), repo=path.dirname(frontend), kit=path.join(repo,'botsales-kit');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sha=text=>createHash('sha256').update(text).digest('hex');
const resolveSource=file=>file.startsWith('botsales-kit/')?path.join(kit,file.slice(13)):path.join(frontend,file);
const plan=read(path.join(kit,'execution/frontend-plan.json'));
assert.equal(plan.tasks.length,28);assert.equal(plan.tasks.reduce((n,t)=>n+t.implementationSteps.length,0),140);
const records={},logs={};
function record(stage){
  if(records[stage])return records[stage];
  const r=read(path.join(out,stage+'.record.json'));
  assert.equal(r.exitCode,0,stage);assert.deepEqual(r.sourceDrift,[],stage);
  assert.equal(digest(path.join(repo,r.log.path)),r.log.sha256,stage+' log');
  r.postRunProofToolChanges=verifyCurrentInputs(r);
  records[stage]=r;logs[stage]=fs.readFileSync(path.join(repo,r.log.path),'utf8');return r;
}
for(const stage of ['final-verify-r3','final-unit-r3','final-source-maps-r4','final-e2e-r8','final-built-demo','final-kit-r3','final-doctor-r3','final-dependencies-r3','final-audit-r2','final-native-browser-200-r5','final-native-text-200-r6','final-native-chrome-200-r7','metadata-generator-after-fix','metadata-state-role-final','final-generated-map-e2e','final-marketing-boundaries'])record(stage);
function flatten(suites){return suites.flatMap(s=>[...(s.specs||[]).flatMap(spec=>(spec.tests||[]).map(t=>({...t,title:spec.title,file:spec.file.replaceAll('\\','/'),line:spec.line}))),...flatten(s.suites||[])]);}
function completedResult(stage,count){const result=read(path.join(out,stage+'.results.json')),cases=flatten(result.suites);assert.equal(result.errors.length,0);assert.equal(cases.length,count);assert.equal(result.stats.expected,count);assert.equal(result.stats.unexpected+result.stats.skipped+result.stats.flaky,0);for(const c of cases){assert.equal(c.status,'expected',c.title);assert.equal(c.results.length,1,'No retries used to mask a failing execution');assert.equal(c.results[0].status,'passed',c.title);}return {result,cases};}
const full=completedResult('final-e2e-r8',878),built=completedResult('final-built-demo',6);
const unitCount=Number(logs['final-unit-r3'].match(/Tests\s+(\d+) passed \(\1\)/)?.[1]);assert.equal(unitCount,242);
assert.match(logs['final-source-maps-r4'],/pass 16\b/);assert.match(logs['final-source-maps-r4'],/fail 0\b/);
assert.match(logs['final-verify-r3'],/Boundary fixtures: PASS 10\/10/);
const domain=read(path.join(frontend,'evidence/domain-tests.json'));assert.equal(domain.status,'PASS');assert.equal(domain.network.status,'PASS');
const domainCases=[...domain.checks,...domain.network.checks];assert.equal(domainCases.length,117);assert.ok(domainCases.every(c=>c.status==='PASS'));
const measurementReport=read(path.join(out,'source-measurements-final-r2.json'));
const measurements=measurementReport.summary;
assert.deepEqual(measurements.operations.missingRouteOps.map(o=>o.id).sort(),['approvePrivacyRequest','stepUp']);
const routes=read(path.join(frontend,'docs/route-implementation.json')),states=read(path.join(frontend,'docs/route-state-role-matrix.json'));
assert.equal(routes.length,61);assert.equal(states.summary.routeRoleBrowserMatrix,'PASS');assert.equal(states.summary.routeMountSmoke,'PASS');
const contract=read(path.join(frontend,'packages/contracts/src/operations.json'));
const nativeFiles=['actual-browser-zoom-200-current-r5.json','native-text-only-200-current-r6.json','actual-browser-zoom-200-current-r7.json'];
const nativeHelpers=['native-browser-200.mjs','native-text-200.mjs'];
const native=nativeFiles.map((name,i)=>{const value=read(path.join(out,name));assert.equal(value.result,'PASS');assert.equal(value.scenarios.length,[8,16,8][i]);assert.ok(value.scenarios.every(s=>s.result==='PASS'));for(const [file,hash] of Object.entries(value.sourceSha256))assert.equal(digest(path.resolve(frontend,file)),hash);return {path:'evidence/frontend-completeness-20261013-aaf74b7/'+name,sha256:digest(path.join(out,name)),count:value.scenarios.length};});
const cold=read(path.join(out,'cold-artifacts-final.json'));assert.equal(cold.status,'PASS');assert.equal(cold.stageCount,13);assert.deepEqual(cold.sourceDrift,[]);assert.deepEqual(cold.artifactDrift,[]);
const install=read(path.join(out,'cold-install-final.json'));assert.equal(install.complete,true);assert.deepEqual(install.sourceDrift,[]);assert.equal(install.runs.length,3);for(const r of install.runs){assert.equal(r.exitCode,0);assert.equal(digest(path.join(repo,r.log.path)),r.log.sha256);}
const copy=read(path.join(out,'cold-source-final.json'));assert.deepEqual(copy.drift,[]);for(const c of copy.copies){assert.equal(c.sha256,c.copiedSha256);assert.equal(digest(path.join(frontend,c.path)),c.sha256);}
const crosswalk=measurements.operations;
const unitFiles={FE005:['api-client.test.tsx','command-lifetime.test.tsx'],FE006:['components.test.tsx','composition.test.tsx','shared-ui-render-contract.test.tsx','pager-retention.test.tsx'],FE007:['scope-events.test.tsx','command-lifetime.test.tsx'],FE023:['states/fe023-state.test.tsx','versioned-draft.test.tsx','pager-retention.test.tsx'],FE024:['api-client.test.tsx','format.test.ts','command-read-scope.test.ts']};
function unitProof(file){const relative='apps/web/tests/'+file,absolute=path.join(frontend,relative),ast=ts.createSourceFile(relative,fs.readFileSync(absolute,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),titles=[];function visit(n){if(ts.isCallExpression(n)&&['it','test'].includes(n.expression.getText(ast))&&ts.isStringLiteral(n.arguments[0])){const title=n.arguments[0].text;assert.ok(logs['final-unit-r3'].split('\n').some(line=>line.includes('✓ '+relative+' >')&&line.includes(title)),relative+':'+title);titles.push(title);}ts.forEachChild(n,visit);}visit(ast);assert.ok(titles.length);return {file:relative,sha256:digest(absolute),cases:titles};}
function browserProof(file){
  const absolute=path.join(frontend,file),text=fs.readFileSync(absolute,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),assertions=[],literalTitles=[];
  function visit(n){if(ts.isCallExpression(n)&&/^expect(?:\.|\()/.test(n.expression.getText(ast)))assertions.push({line:ast.getLineAndCharacterOfPosition(n.getStart()).line+1,text:n.getText(ast)});if(ts.isCallExpression(n)&&n.expression.getText(ast)==='test'&&ts.isStringLiteral(n.arguments[0]))literalTitles.push(n.arguments[0].text);ts.forEachChild(n,visit);}visit(ast);
  assert.ok(assertions.length,'Browser owner needs actual assertions: '+file);
  const cases=full.cases.filter(c=>c.file===file.replace(/^tests\//,''));assert.ok(cases.length,'No current executions for '+file);
  for(const title of [...new Set(cases.map(c=>c.title))])for(const browser of ['chromium','firefox'])assert.ok(cases.some(c=>c.title===title&&c.projectName===browser),'Missing owner case '+browser+':'+title);
  for(const title of literalTitles)assert.ok(cases.some(c=>c.title===title),'Literal owner test missing: '+title);
  return {file,sha256:digest(absolute),assertions,cases:cases.map(c=>({title:c.title,line:c.line,project:c.projectName,status:c.results[0].status,durationMs:c.results[0].duration}))};
}
function ownerFiles(task){
  const n=Number(task.id.slice(2));let files;
  if(n>=9&&n<=21)files=['tests/'+task.id.toLowerCase()+'.spec.ts'];
  else files=({FE006:['tests/ui-composition-layout.spec.ts','tests/ui012-keyboard.spec.ts'],FE007:['tests/frontend.spec.ts','tests/session/session-revocation.spec.ts','tests/ui009-scope-regression.spec.ts'],FE008:['tests/vertical-slices/fe022-flows.spec.ts','tests/frontend.spec.ts'],FE022:['tests/vertical-slices/fe022-flows.spec.ts'],FE023:['tests/states/fe023.spec.ts','tests/ui010-dialog-draft.spec.ts','tests/frontend-corrections.spec.ts'],FE024:['tests/security.spec.ts','tests/session/session-revocation.spec.ts','tests/ui009-scope-regression.spec.ts','tests/ui021-permission-edge.spec.ts'],FE025:['tests/artifacts/demo-preview.spec.ts','tests/ui012-keyboard.spec.ts'],FE026:['tests/artifacts/demo-preview.spec.ts'],FE001:['tests/frontend.spec.ts','tests/vertical-slices/fe022-flows.spec.ts','tests/frontend-corrections.spec.ts'],FE027:['tests/frontend.spec.ts','tests/vertical-slices/fe022-flows.spec.ts','tests/frontend-corrections.spec.ts'],FE028:['tests/frontend.spec.ts','tests/vertical-slices/fe022-flows.spec.ts','tests/frontend-corrections.spec.ts']})[task.id]||['tests/frontend-corrections.spec.ts'];
  if(['FE006','FE025','FE027','FE028'].includes(task.id)||task.routeIds.some(id=>['R26','R28','R29','R30','R32','R37','R39','R54'].includes(id)))files.push('tests/frontend-completeness.spec.ts');
  if(['FE006','FE025','FE027','FE028'].includes(task.id))files.push('tests/ui-component-layout.spec.ts','tests/ui-density-layout.spec.ts','tests/ui-shell-layout.spec.ts');
  return [...new Set(files)];
}
const commandMap=read(path.join(kit,'execution/frontend-command-map.json'));
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const allSteps=[];
for(const task of plan.tasks){
  const taskRoutes=task.routeIds.map(id=>{const r=routes.find(r=>r.routeId===id);assert.ok(r,id);assert.ok(fs.readFileSync(path.join(frontend,r.source),'utf8').includes(r.component));return r;});
  for(const id of task.operationIds)assert.ok(contract[id],task.id+':'+id);
  const owners=ownerFiles(task).map(browserProof),units=(unitFiles[task.id]||['versioned-draft.test.tsx','command-lifetime.test.tsx','scope-events.test.tsx']).map(unitProof);
  const cases=owners.flatMap(o=>o.cases),negative=cases.filter(c=>/unknown|reject|conflict|stale|forbidden|redact|denied|offline|error|expired|cannot|scope|invalid|unavailable|empty|blocks|does not|never|403|404|503/i.test(c.title));
  const moduleTask=Number(task.id.slice(2))>=9&&Number(task.id.slice(2))<=21;
  const positive=cases.filter(c=>!negative.includes(c));
  const operationRefs=task.operationIds.map(id=>({id,locations:measurementReport.operations[id]||[],policyUnavailable:['stepUp','approvePrivacyRequest'].includes(id)}));
  if(moduleTask){assert.ok(positive.length,task.id+' missing positive owner executions');assert.ok(negative.length,task.id+' missing negative owner executions');for(const op of operationRefs)assert.ok(op.locations.length||op.policyUnavailable,task.id+' lacks frontend operation source '+op.id);}
  for(const step of task.implementationSteps){
    if(Number(task.id.slice(2))>=9&&Number(task.id.slice(2))<=21&&step.id==='S03')assert.ok(negative.length,'Missing negative owner proof '+task.id);
    const stage=task.id==='FE026'?'final-built-demo':(['FE005','FE006','FE007','FE023'].includes(task.id)&&['S02','S03','S04'].includes(step.id))?'final-unit-r3':Number(task.id.slice(2))>=9?'final-e2e-r8':'final-verify-r3';
    let primary=record(stage),commandId='completion-'+stage;
    if(task.id==='FE002'&&['S03','S05'].includes(step.id)){primary={...install.runs.find(r=>r.id==='ci'),sourceFingerprints:records['final-verify-r3'].sourceFingerprints};commandId='completion-cold-install';}
    assert.ok(commandMap.commands.some(c=>c.id===commandId&&c.command===primary.command&&c.status==='VERIFIED_AVAILABLE'),'Register exact successful command '+commandId);
    const facts=[{name:'Canonical criterion and whole-task acceptance self-review',action:step.action,verification:step.verification,acceptanceCases:task.acceptanceCases,scopeInterpretation:'Current named owner assertions and actual executions are reviewed against each acceptance. Legacy 54 routes use the current 61-route manifest; approved C05/C06 contracts supersede old address/account catalog gaps. Privacy/OIDC remains unavailable under FE009.S03; manual speech/owner acceptance are not forged.'},{name:'Current route/operation owners',routes:taskRoutes.map(r=>({id:r.routeId,source:r.source,component:r.component})),operationIds:task.operationIds,sourceCrosswalk:{apiTotal:245,required:crosswalk.routeRequired,referenced:crosswalk.routeReferenced,missing:crosswalk.missingRouteOps,limits:'stepUp/approvePrivacyRequest deliberately unavailable under FE009.S03 OIDC policy; reference coverage is not code completion.'}},{name:'Executed owner browser cases',proof:owners,negativeExecutions:negative.length},{name:'Executed unit owners',proof:units},{name:'Current dependency gates',unit:unitCount,domain:domainCases.length,sourceMaps:16,fullBrowser:full.cases.length,builtArtifact:built.cases.length,coldStages:13,limits:'Distinct suite counts are not added into a percentage.'},{name:'Native affected-owner review',proof:native,scope:'Eight affected detail views; Chromium and installed Chrome browser zoom, Firefox native text-only zoom. Full browser suite covers all existing consumers. Historical global native matrices are not re-certified.'},{name:'Cold source and artifacts',artifact:'cold-artifacts-final.json',lockSha256:copy.lockSha256},{name:'Review and acceptance boundary',handoff:'ACCEPTANCE_GUIDE.md',architecture:'ARCHITECTURE_REVIEW.md',quality:'quality-gates-final.json',rawPremiumScanner:'FAIL_EXIT_1: all 14 actual semantic actions reviewed in premium-semantic-review.json; no scanner PASS or owner approval claimed',ownerAcceptance:'PENDING',screenReaderSpeech:'NOT_RUN',hostedCI:'NOT_RUN',backend:'OUTSIDE_SCOPE'}];
    const sources=[...new Set([...Object.keys(primary.sourceFingerprints).map(f=>f.startsWith('BotSalesAI_Frontend/')?f.slice(20):f),...taskRoutes.map(r=>r.source),...owners.map(o=>o.file),...units.map(u=>u.file),'docs/route-implementation.json','docs/route-state-role-matrix.json','botsales-kit/execution/frontend-plan.json','botsales-kit/execution/frontend-command-map.json',...['revalidate-checkpoints.mjs','c10-review.mjs','C10-scoped-result.json','marketing-boundaries.test.ts','marketing-boundaries.config.ts','final-marketing-boundaries.record.json','current-inputs.mjs','proof-tool-delta.mjs','proof-tool-delta.json','route-generator-before-fix.mjs','metadata-generator-after-fix.record.json','metadata-state-role-final.record.json','final-generated-map-e2e.record.json','browser-binary-probe-e2e.record.json','COMPLETION-CONTRACT.md','ACCEPTANCE_GUIDE.md','ARCHITECTURE_REVIEW.md','quality-gates-final.json','cold-artifacts-final.json','cold-source-final.json','source-measurements-final-r2.json','premium-semantic-review.json',...nativeFiles,...nativeHelpers].map(f=>'evidence/frontend-completeness-20261013-aaf74b7/'+f),...(step.requiredEvidenceKind==='artifact_review'?['docs/PROJECT_CONTEXT.md','docs/CONTINUE_FRONTEND.md','docs/KNOWN_GAPS.md','docs/FRONTEND_UI_IMPROVEMENT_PLAN.md','evidence/REPORT.md']:[])])].sort();
    const sourceFiles=sources.map(file=>({path:file,sha256:digest(resolveSource(file))}));
    facts.push({name:'Criterion-specific proof selection',step:step.id,verification:step.verification,
      interpretation:moduleTask?({S01:'Canonical route/component/operation mapping, with actual AST source locations; privacy policy exceptions remain explicit.',S02:'Named positive UI/request/state assertions in the task owner source, executed on both supported engines; counts alone do not establish this criterion.',S03:'Named negative owner assertions preserve draft, permission/version/unavailable/unknown behavior; no password step-up or unsupported policy bypass.',S04:'Task owner browser component and HTTP assertions plus executed transport/unit/domain dependency cases; synthetic contract verification, not backend behavior.',S05:'Named current owner browser executions, responsive/keyboard/permission cases and declared limits; generated maps trace current routes and preserve scope gaps.'}[step.id]):'This foundation/cross-module/handoff criterion is self-reviewed against its exact action/verification and the named source, owner assertions, toolchain/gate/artifact and handoff proofs above; no points are inferred solely from a shared suite total.',
      selectedOperationLocations:step.id==='S01'?operationRefs:[],
      selectedBrowserCases:moduleTask?(step.id==='S02'?positive:step.id==='S03'?negative:cases):cases,
      ownerSourceAssertions:owners.map(o=>({file:o.file,sha256:o.sha256,assertionLines:o.assertions.map(a=>a.line)})),
      policyLimits:task.id==='FE009'?'stepUp/approvePrivacyRequest unavailable as required by FE009.S03, not implemented or removed from denominator.':'Manual speech/owner acceptance/hosted CI are not fabricated.'});
    const sourceSnapshotSha256=sha(sourceFiles.map(f=>f.path+':'+f.sha256).sort().join('\n'));
    const name=step.id+'-completion-20261013',folder=path.join(kit,'execution/frontend-evidence',task.id);fs.mkdirSync(folder,{recursive:true});
    const logFile=path.join(folder,name+'.log'),executedAt=new Date().toISOString();
    fs.writeFileSync(logFile,JSON.stringify({taskId:task.id,stepId:step.id,executedAt,facts,executionRecords:Object.values(records).map(r=>({stage:r.stage,command:r.command,cwd:r.cwd,startedAt:r.startedAt,finishedAt:r.finishedAt,exitCode:r.exitCode,log:r.log,sourceDrift:r.sourceDrift,postRunProofToolChanges:r.postRunProofToolChanges||[]})),sourceSnapshotSha256},null,2)+'\n');
    const receipt={taskId:task.id,stepId:step.id,kind:step.requiredEvidenceKind,result:'PASS',verificationScope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',executedAt,sourceRevision:head+' plus hashed current working tree',expected:step.verification,observed:taskRoutes.length+' current route owners and '+task.operationIds.length+' canonical operations; '+cases.length+' named current owner browser executions including '+negative.length+' negative executions; actual owner assertions, unit cases and completed dependency logs bound above; one later report-generator-only title update is separately reconciled in proof-tool-delta.json. Local mock scope only; owner/manual speech/hosted CI remain unverified.',commandId,command:primary.command,cwd:primary.cwd,reviewer:'Codex criterion/source/actual execution self-review; not independent review or owner acceptance',environment:{name:'Windows Node '+process.version+' / Chromium + Firefox',details:'Actual current React/MSW execution; production/demo builds and cold local checks. Receipt criterion reviews use named current cases, source assertions, immutable logs and SHA256. A single post-run report-generator title update is separately verified by proof-tool-delta.json, fresh generator/map/static/cold checks; app/mock/test/config inputs remain identical.',dataSource:'synthetic-msw'},checksTotal:facts.length,failed:0,sourceFiles,sourceSnapshotSha256,logFile:path.relative(kit,logFile).replaceAll('\\','/'),logSha256:digest(logFile),facts,supportingLogs:Object.values(records).map(r=>r.log)};
    const file=path.join(folder,name+'.json');fs.writeFileSync(file,JSON.stringify(receipt,null,2)+'\n');allSteps.push({taskId:task.id,stepId:step.id,receipt:path.relative(kit,file).replaceAll('\\','/'),sha256:digest(file)});
  }
  console.log(task.id+' 5 criterion receipts preflighted; '+cases.length+' owner browser executions');
}
fs.writeFileSync(path.join(out,'checkpoint-preflight.json'),JSON.stringify({recordedAt:new Date().toISOString(),steps:allSteps,total:allSteps.length},null,2)+'\n');
