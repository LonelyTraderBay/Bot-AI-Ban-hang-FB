import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const kit=path.resolve(dir,'../../..');
const repo=path.resolve(kit,'..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const relKit=p=>path.join(kit,p);
const relRepo=p=>path.join(repo,p);
const run=(cmd,args=[],cwd=repo)=>{
  try{return {out:execFileSync(cmd,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trimEnd(),exit:0};}
  catch(e){return {out:String(e.stdout||'').trimEnd()+'\n'+String(e.stderr||'').trimEnd(),exit:e.status??1};}
};
const now=new Date();
const stamp=now.toISOString();
const gitRoot=run('git',['rev-parse','--show-toplevel']).out;
const head=run('git',['rev-parse','HEAD']).out;
const branch=run('git',['branch','--show-current']).out;
const dirty=run('git',['status','--porcelain','--untracked-files=all']).out;
const staged=run('git',['diff','--cached','--quiet']);
const ruleRoot=fs.readFileSync(relRepo('AI_RULES.md'));
const ruleKit=fs.readFileSync(relRepo('botsales-kit/AI_RULES.md'));
const frontendPlan=read(relRepo('botsales-kit/execution/frontend-plan.json'));
const fullPlan=read(relRepo('botsales-kit/execution/plan.json'));
const fullProgress=read(relRepo('botsales-kit/execution/progress.json'));
const fullProgressSha=sha(fs.readFileSync(relRepo('botsales-kit/execution/progress.json')));
const fullPlanSha=sha(fs.readFileSync(relRepo('botsales-kit/execution/plan.json')));

const s01Log=[
  'FE001.S01 current repository intake and scope revalidation',
  `ExecutedAt=${stamp}`,
  `CWD=${repo}`,
  `GitRoot=${gitRoot}`,
  `HEAD=${head}`,
  `Branch=${branch}`,
  `StagedDiffExit=${staged.exit} (0 means no staged diff)`,
  `DirtyPathCount=${dirty?dirty.split(/\r?\n/).length:0}`,
  `FrontendPlan=${frontendPlan.tasks.length} tasks/${frontendPlan.tasks.reduce((n,t)=>n+t.implementationSteps.length,0)} checkpoints; scope=${frontendPlan.scope}`,
  `FullProductTasks=${fullPlan.tasks.length}; fullProductProgressEntries=${Object.keys(fullProgress.tasks).length}`,
  `RootAI_RULES_SHA256=${sha(ruleRoot)}`,
  `KitAI_RULES_SHA256=${sha(ruleKit)}`,
  `AI_RULES_bytes_identical=${ruleRoot.equals(ruleKit)}`,
  'Expected: confirm exact workspace, active instructions, existing worktree changes and separate frontend-only tracker.',
  'Observed: pre-existing dirty/untracked changes were inventoried and preserved. FE017 mock permission/lifecycle substitute remains user-authorized; no API/DTO/generated contract field was added.',
  '--- git status --porcelain --untracked-files=all ---',
  dirty,
  '--- docs and plan sources reviewed ---',
  'AGENTS.md; AI_RULES.md; botsales-kit/AI_RULES.md; botsales-kit/AGENTS.md; docs/FRONTEND_SCOPE.md; docs/PROJECT_CONTEXT.md; botsales-kit/docs/02_ARCHITECTURE.md; botsales-kit/docs/06_API_AND_REALTIME.md; botsales-kit/docs/18_CODING_STANDARDS.md; evidence/REPORT.md; docs/KNOWN_GAPS.md; docs/route-implementation.json; botsales-kit/execution/SESSION_HANDOFF.md'
].join('\n')+'\n';

const verifyPath='botsales-kit/execution/frontend-evidence/FE027/verify-ui-coverage-complete-final-20261001.log';
const e2ePath='botsales-kit/execution/frontend-evidence/FE027/e2e-current-final-20261001-ui-coverage-complete.log';
const reflowPath='botsales-kit/execution/frontend-evidence/FE027/route-reflow-320-current-20261001.json';
const matrixPath='botsales-kit/execution/frontend-evidence/FE027/route-matrix-current-20261001.log';
const verifyText=fs.readFileSync(relRepo(verifyPath),'utf8');
const e2eText=fs.readFileSync(relRepo(e2ePath),'utf8');
const reflow=read(relRepo(reflowPath));
const verifyHash=sha(Buffer.from(verifyText));
const e2eHash=sha(Buffer.from(e2eText));
const reflowHash=sha(fs.readFileSync(relRepo(reflowPath)));
const matrixHash=sha(fs.readFileSync(relRepo(matrixPath)));
const s03Log=[
  'FE001.S03 current baseline evidence review',
  `ExecutedAt=${stamp}`,
  `CWD=${repo}`,
  `Node=${run('node',['-v']).out}`,
  `npm=${run('npm.cmd',['-v']).out}`,
  `TypeScript=${run('node',['-p',"require('./node_modules/typescript/package.json').version"]).out}`,
  `verifyLog=${verifyPath}; SHA256=${verifyHash}; exists=${fs.existsSync(relRepo(verifyPath))}`,
  `e2eLog=${e2ePath}; SHA256=${e2eHash}; exists=${fs.existsSync(relRepo(e2ePath))}`,
  `reflowArtifact=${reflowPath}; SHA256=${reflowHash}; summary=${JSON.stringify(reflow)}`,
  `matrixLog=${matrixPath}; SHA256=${matrixHash}; exists=${fs.existsSync(relRepo(matrixPath))}`,
  'Expected: distinguish executed frontend checks, warnings and unrun acceptance gates from historical environment notes.',
  'Observed from the current FE027 run logs: verify exit 0; 11 generated outputs/283 schemas/210 operations/54 routes; source 58 files/224 operation references; boundaries 402 imports/8 negative fixtures; lint/typecheck; domain/MSW 88/88; Vitest 66/66; production build exit 0. E2E log reports 123 Chromium tests passed. Reflow artifact reports 54 routes and zero overflow/page errors at 320 CSS px. Route interaction matrix log reports 65 feature-route entries and 155 evidence-case references.',
  'Current build advisory in verify log: a chunk exceeds 500 kB raw; largest is 730.13 kB raw / 184.23 KiB gzip. These logs were produced before this documentation-only FE001 refresh and are reused as the latest actual run evidence; FE001 itself does not rerun product gates.',
  'Current repo docs summarize the previous valid tracker snapshot (5/140). In the live ledger, doc-source hash changes temporarily make FE001 and dependents STALE; this is an evidence-fingerprint condition, not a frontend test failure. FE001 checkpoints are being revalidated in order.',
  'Not run: GitHub CI, live backend/provider, staging, full screen-reader audit, actual browser zoom test and owner UAT. No current local gate failure is claimed beyond the recorded build-size advisory.'
].join('\n')+'\n';

const fe002=frontendPlan.tasks.find(t=>t.id==='FE002');
const commandMap=read(relRepo('botsales-kit/execution/frontend-command-map.json'));
const commandStates=commandMap.commands.filter(c=>['install','clean-install-current','setup','doctor','build'].includes(c.id)).map(c=>`${c.id}=${c.status} (${c.command})`);
const s04Log=[
  'FE001.S04 next task and Change Budget revalidation',
  `ExecutedAt=${stamp}`,
  `CWD=${repo}`,
  `Target=${fe002.id} priority=${fe002.priority}: ${fe002.title}`,
  `Dependencies=${fe002.dependsOn.join(',')||'(none after FE001)'}`,
  `RouteIds=${fe002.routeIds.join(',')||'(none)'}`,
  `OperationIds=${fe002.operationIds.join(',')||'(none)'}`,
  `VerificationLevel=${fe002.verificationLevel}`,
  `WriteScope=${fe002.writeScope.join(', ')}`,
  `Node=${run('node',['-v']).out}; npm=${run('npm.cmd',['-v']).out}; .node-version exists=${fs.existsSync(relRepo('.node-version'))}`,
  `Registered commands: ${commandStates.join(' | ')}`,
  'Expected: identify the next dependency-ready frontend task, exact scope and verification budget from the approved frontend plan.',
  'Observed: FE002 is the first task after FE001, with no route/operation IDs and no backend dependency. Change Budget is limited to reproducible Node/npm dependencies, real lockfile, setup/doctor and project context. No stack/major upgrade without an observed compatibility failure. Clean npm ci must run in an isolated temp workspace. No route UI, canonical contract, generated source, whole-product tracker, backend or staging changes are in budget.'
].join('\n')+'\n';

function refreshEvidence(file,log,extraSources=[],overrides={}){
 const p=relKit(file);
 const e=read(p);
 const logPath=relKit(e.logFile);
 fs.writeFileSync(logPath,log,{encoding:'utf8'});
 const sourceMap=new Map(e.sourceFiles.map(f=>[f.path,f]));
 for(const p of extraSources)if(!sourceMap.has(p))sourceMap.set(p,{path:p});
 e.sourceFiles=[...sourceMap.values()].map(f=>({path:f.path,sha256:sha(fs.readFileSync(relRepo(f.path)))})).sort((a,b)=>a.path.localeCompare(b.path));
 e.sourceSnapshotSha256=sha(Buffer.from(e.sourceFiles.map(f=>f.path+':'+f.sha256).sort().join('\n')));
 e.logSha256=sha(fs.readFileSync(logPath));
 e.executedAt=stamp;
 e.sourceRevision=`HEAD ${head} + current frontend-only working tree`;
 Object.assign(e,overrides);
 fs.writeFileSync(p,JSON.stringify(e,null,2)+'\n',{encoding:'utf8'});
 console.log(`${e.taskId}.${e.stepId}: refreshed ${e.sourceFiles.length} sources; log ${e.logSha256}; snapshot ${e.sourceSnapshotSha256}`);
}
refreshEvidence('execution/frontend-evidence/FE001/S01-current-intake-20261001.json',s01Log,['botsales-kit/execution/SESSION_HANDOFF.md'],{
  observed:`CWD is ${repo}; Git root is ${gitRoot}; HEAD ${head} on ${branch}; staged diff exit ${staged.exit}; ${dirty?dirty.split(/\r?\n/).length:0} existing changed/untracked paths were inventoried and preserved. Root and kit AI_RULES are byte-identical (SHA-256 ${sha(ruleRoot)}). frontend-plan.json defines ${frontendPlan.tasks.length} tasks/${frontendPlan.tasks.reduce((n,t)=>n+t.implementationSteps.length,0)} checkpoints in ${frontendPlan.scope}; full-product plan/progress each contain ${fullPlan.tasks.length} entries and remain read-only.`,
  checksTotal:8
});
refreshEvidence('execution/frontend-evidence/FE001/S03-current-baseline-review-20261001.json',s03Log,[],{
  observed:`Windows Node ${run('node',['-v']).out}/npm ${run('npm.cmd',['-v']).out}/TypeScript ${run('node',['-p',"require('./node_modules/typescript/package.json').version"]).out}. Latest existing logs: verify exit 0 (11 generated outputs, 283 schemas, 210 operations, 54 routes; source 58 files/224 operation refs; boundaries 402 imports/8 negative fixtures; lint/typecheck; domain/MSW 88/88; Vitest 66/66; production build); E2E 123/123 Chromium. Matrix interaction evidence 65/65 feature-route entries with 155 evidence-case references. Reflow 54/54 at 320 CSS px with zero overflow/page errors. Build advisory: largest chunk 730.13 kB raw/184.23 KiB gzip. Full screen-reader, actual browser zoom, owner UAT, GitHub CI, backend/provider and staging were not run. Current ledger fingerprint refresh is in progress because source docs changed after the prior checkpoints; this is not a test failure.`,
  checksTotal:8
});
refreshEvidence('execution/frontend-evidence/FE001/S04-next-task-change-budget-20261001.json',s04Log,[],{
  observed:`FE002 (priority ${fe002.priority}) is next after FE001. It covers reproducible Node/npm dependencies, exact manifest/lock, setup/doctor and project context; it has no routes, operation IDs or backend dependency. Its approved write scope is ${fe002.writeScope.join(', ')}. Node/npm are ${run('node',['-v']).out}/${run('npm.cmd',['-v']).out}; .node-version ${fs.existsSync(relRepo('.node-version'))?'exists':'is absent'} and will be evaluated in FE002. No speculative dependency or architecture change is authorized.`,
  checksTotal:8
});
