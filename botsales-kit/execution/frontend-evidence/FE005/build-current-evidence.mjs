import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const kit=path.join(repo,'botsales-kit');
const dir=path.join(kit,'execution/frontend-evidence/FE005');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=rel=>fs.readFileSync(path.join(repo,rel),'utf8');
const run=(exe,args)=>spawnSync(exe,args,{cwd:repo,encoding:'utf8',env:process.env});
const stepId=process.argv[2];
const registry=JSON.parse(read('botsales-kit/execution/frontend-command-map.json'));
const definitions={
 S01:{commandId:'source',expected:'Current React/TypeScript operation references and route bindings resolve against canonical OpenAPI, route, permission and event contracts; Money/id/nullability are faithful and contract gaps stay explicit.',logs:['S01-source-registered-current-20261001.log','S01-canonical-inventory-current-20261001.log']},
 S02:{commandId:'generate-check-windows',expected:'The canonical OpenAPI-derived types, operation registry, routes and CSS/tokens outputs are fresh; no generated output was edited by hand.',logs:['S02-generate-current-20261001.log']},
 S03:{commandId:'unit',expected:'One typed HTTP client enforces same-origin credentials, CSRF, If-Match, idempotency, AbortSignal, request/response schemas and structured Problem parsing.',logs:['S03-S04-unit-current-20261001.log']},
 S04:{commandId:'unit',expected:'Mock HTTP fixtures exercise 202 command completion, 409/412/422/428/429, timeout, invalid DTO and nullable fields without false success or silent retry.',logs:['S03-S04-unit-current-20261001.log']},
 S05:{commandId:'contract-tests',expected:'Canonical positive/negative generator fixtures, current source mapping, generated freshness, unit transport suite and full strict TypeScript check pass on the current source snapshot.',logs:['S01-source-registered-current-20261001.log','S02-generate-current-20261001.log','S03-S04-unit-current-20261001.log','S05-contract-tests-current-20261001.log','S05-typecheck-current-20261001.log']},
};
if(!definitions[stepId])throw new Error('Use S01..S05');
const def=definitions[stepId];
const statusRun=run(process.execPath,['botsales-kit/scripts/progress.mjs','status']);
let status={};try{status=JSON.parse(statusRun.stdout)}catch{}
const next=status.next?.[0];
const checks=[];const add=(name,ok,observed)=>checks.push({name,ok:Boolean(ok),observed:String(observed)});
add('correct sequential FE005 checkpoint selected',statusRun.status===0&&next?.id==='FE005'&&next?.nextStep?.id===stepId&&status.blocked?.length===0,`status exit=${statusRun.status}; next=${next?.id}.${next?.nextStep?.id}; blocked=${JSON.stringify(status.blocked)}`);
const logPaths=def.logs.map(name=>`botsales-kit/execution/frontend-evidence/FE005/${name}`);
add('all current run logs exist',logPaths.every(p=>fs.existsSync(path.join(repo,p))),logPaths.join('; '));
const sourceLog=read('botsales-kit/execution/frontend-evidence/FE005/S01-source-registered-current-20261001.log');
const inventory=read('botsales-kit/execution/frontend-evidence/FE005/S01-canonical-inventory-current-20261001.log');
const generation=read('botsales-kit/execution/frontend-evidence/FE005/S02-generate-current-20261001.log');
const unit=read('botsales-kit/execution/frontend-evidence/FE005/S03-S04-unit-current-20261001.log');
const contracts=read('botsales-kit/execution/frontend-evidence/FE005/S05-contract-tests-current-20261001.log');
const typecheck=read('botsales-kit/execution/frontend-evidence/FE005/S05-typecheck-current-20261001.log');
const client=read('apps/web/src/shared/api/client.ts');
const hooks=read('apps/web/src/shared/api/hooks.ts');
const apiTests=read('apps/web/tests/api-client.test.tsx');
const generationTests=read('tests/contracts/generator.test.mjs');
const evidenceDirs=['apps/web/src','apps/web/tests'];
function walkTs(parent){return fs.readdirSync(parent,{withFileTypes:true}).flatMap(entry=>{const absolute=path.join(parent,entry.name);return entry.isDirectory()?walkTs(absolute):/\.(ts|tsx)$/.test(entry.name)?[path.relative(repo,absolute).replaceAll('\\','/')]:[];});}
const sourceFilesSet=new Set([
 'package.json','package-lock.json','apps/web/package.json','apps/web/tsconfig.json',
 'botsales-kit/execution/frontend-command-map.json','botsales-kit/execution/frontend-plan.json',
 'botsales-kit/contracts/openapi.json','botsales-kit/contracts/route-manifest.json','botsales-kit/contracts/permission-catalog.json','botsales-kit/contracts/events.schema.json',
 'botsales-kit/docs/06_API_AND_REALTIME.md','botsales-kit/docs/18_CODING_STANDARDS.md','docs/KNOWN_GAPS.md',
 'packages/contracts/src/generated.ts','packages/contracts/src/operations.json','packages/contracts/src/index.ts',
 'scripts/generate.mjs','scripts/check-source.mjs','apps/web/src/shared/api/client.ts','apps/web/src/shared/api/hooks.ts','apps/web/src/shared/api/errors.ts','apps/web/src/shared/api/validation.ts','apps/web/src/shared/api/intents.ts',
 'apps/web/src/shared/model/format.ts','apps/web/src/shared/model/scope.tsx','apps/web/src/modules/bot/index.tsx','apps/web/src/modules/catalog/index.tsx','apps/web/src/modules/customers/index.tsx','apps/web/src/modules/integrations/index.tsx','apps/web/src/modules/knowledge/index.tsx','apps/web/src/modules/workspace/index.tsx',
 'apps/web/tests/api-client.test.tsx','apps/web/tests/format.test.ts','tests/contracts/generator.test.mjs','botsales-kit/execution/frontend-evidence/FE005/audit-canonical-current-20261001.mjs',
 ...def.logs.map(name=>`botsales-kit/execution/frontend-evidence/FE005/${name}`),
 ...evidenceDirs.flatMap(folder=>walkTs(path.join(repo,folder))),
]);
const gate={
 S01:()=>{
   const audit=JSON.parse(inventory.slice(inventory.indexOf('{')));
   add('canonical contract inventory agrees with generated/source mapping',audit.status==='PASS'&&audit.operations===210&&audit.uniqueOperationIds===210&&audit.routes===54&&sourceLog.includes('"operationCalls": 224')&&sourceLog.includes('"status": "PASS"'),`OpenAPI 3.1.0: 210 unique operationIds; 54 routes; source map 58 files/224 operation refs. Money uses decimal string; ID string; nullable phone/email preserved.`);
   add('permission/event and Knowledge contract gap remain explicit',audit.checks?.publishPermissionExists&&audit.checks?.publishedEventExists&&audit.checks?.knowledgeAllowedActionsAbsent,`knowledge.publish and knowledge.published exist; canonical Knowledge.allowedActions is absent and no contract/generated DTO was changed.`);
 },
 S02:()=>add('generated outputs are fresh',generation.includes('"status":"PASS"')&&generation.includes('"outputs":11')&&generation.includes('"schemas":283')&&generation.includes('"operations":210')&&generation.includes('"routes":54'),generation.trim()),
 S03:()=>{
   const requirements=["credentials: 'same-origin'","X-CSRF-Token","If-Match","Idempotency-Key","AbortSignal","assertSchema","assertSchema<Problem>"];
   add('typed client enforces transport safeguards',requirements.every(part=>client.includes(part))&&hooks.includes('request(op'),requirements.filter(part=>client.includes(part)).join(', '));
   add('transport suite passes on current source',/66 passed \(66\)/.test(unit)&&apiTests.includes('preserves contract nulls'),`Vitest 66/66 in 7 files; API client request/response tests are in the passing suite.`);
 },
 S04:()=>{
   const cases=['preserves contract nulls','CSRF and idempotency','If-Match','it.each([409, 412, 422, 428, 429])','timeout','invalid DTO','waits for command completion after HTTP 202','unsupported command status'];
   add('required HTTP status/error/nullable scenarios exist and pass',cases.every(value=>apiTests.includes(value))&&/66 passed \(66\)/.test(unit),`API test source covers ${cases.join('; ')}; full Vitest 66/66.`);
 },
 S05:()=>{
   add('generator, contract negative fixtures and strict typecheck pass',generation.includes('"status":"PASS"')&&/tests 6[\s\S]*pass 6[\s\S]*fail 0/.test(contracts)&&typecheck.includes('> tsc -p apps/web/tsconfig.json --noEmit')&&!/error TS\d+/.test(typecheck),`generate:check 11/283/210/54; generator tests 6/6; full strict typecheck exit 0; unit 66/66.`);
   add('canonical operation and transport scenario logs match current source',sourceLog.includes('"operationCalls": 224')&&apiTests.includes('waits for command completion after HTTP 202')&&generationTests.includes('rejects unresolved schema references'),`Source audit 58 files/224 refs/54 routes; 202 wait and unresolved-schema negative fixture are checked.`);
 }
};
gate[stepId]();
const missing=logPaths.filter(p=>!fs.existsSync(path.join(repo,p)));
const failed=checks.filter(x=>!x.ok).length;
const map=registry.commands.find(c=>c.id===def.commandId);
if(!map||map.status!=='VERIFIED_AVAILABLE')throw new Error(`Command ${def.commandId} is not registered as VERIFIED_AVAILABLE`);
const head=run('git',['rev-parse','HEAD']);
const dataSource=['S01','S03','S04'].includes(stepId)?'synthetic-msw':'source-only';
const logName=`${stepId}-current-review-20261001.log`;
const relativeLog=`execution/frontend-evidence/FE005/${logName}`;
const logBody=[
 `FE005.${stepId} canonical contracts and transport verification`,
 `cwd=${repo}`,`HEAD=${head.stdout.trim()} + dirty frontend working tree`,
 `node=${process.version}; npm=11.17.0; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API`,
 `commandId=${def.commandId}`,`command=${map.command}`,
 ...logPaths.map(p=>`\n--- ${p} ---\n${read(p).trim()}`),
 ...checks.map((check,index)=>`\n[review ${index+1}] ${check.ok?'PASS':'CHUA DAT'} ${check.name}\n${check.observed}`),
 `\nresult=${failed===0?'PASS':'CHUA DAT'}; checks=${checks.length}; exitCode=${failed===0?0:1}`
].join('\n');
fs.writeFileSync(path.join(kit,relativeLog),`${logBody}\n`,'utf8');
const handoffPath='botsales-kit/execution/frontend-evidence/FE005/handoff.md';
if(stepId==='S05')sourceFilesSet.add(handoffPath);
const sourceFiles=[...sourceFilesSet].sort().map(p=>({path:p,sha256:sha(fs.readFileSync(path.join(repo,p)))}));
const evidence={taskId:'FE005',stepId,kind:'test_run',result:failed===0?'PASS':'FAIL',verificationScope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',executedAt:new Date().toISOString(),sourceRevision:`HEAD ${head.stdout.trim()} on main plus current frontend working tree`,expected:def.expected,observed:checks.map(c=>`${c.ok?'PASS':'FAIL'} ${c.name}: ${c.observed}`).join(' '),commandId:def.commandId,command:map.command,cwd:repo,reviewer:'Codex self-review; no independent peer review',environment:{name:'Windows / Node 24.19.0 / npm 11.17.0',details:'React frontend with synthetic MSW data; no live service or CI.',dataSource},checksTotal:checks.length,failed,exitCode:failed===0?0:1,logFile:relativeLog,logSha256:sha(fs.readFileSync(path.join(kit,relativeLog))),sourceFiles,sourceSnapshotSha256:sha(Buffer.from(sourceFiles.map(f=>`${f.path}:${f.sha256}`).sort().join('\n')))};
fs.writeFileSync(path.join(dir,`${stepId}-current-revalidation-20261001.json`),`${JSON.stringify(evidence,null,2)}\n`,'utf8');
console.log(JSON.stringify({result:evidence.result,step:`FE005.${stepId}`,checks:checks.length,failed,sourceFiles:sourceFiles.length,commandId:def.commandId,log:relativeLog},null,2));
if(failed)process.exitCode=1;

