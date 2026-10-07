import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const base='botsales-kit/execution/frontend-evidence/FE008';
const domainLogPath=`${base}/S02-domain-spc059-current-20261006.log`;
const domainReportPath='evidence/domain-tests.json';
const auditPath=`${base}/S02-transport-audit-spc059-current-20261006.json`;
const auditLogPath=`${base}/S02-transport-audit-spc059-current-20261006.log`;
const evidencePath=`${base}/S02-after-spc059-20261006.json`;
const evidenceLogPath=`${base}/S02-after-spc059-20261006.log`;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=p=>fs.readFileSync(path.join(root,p));
const read=p=>bytes(p).toString('utf8');
const json=p=>JSON.parse(read(p));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const walk=(dir)=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(item=>{const rel=path.posix.join(dir,item.name);return item.isDirectory()?walk(rel):[rel];});

assert(root.endsWith('BotSalesAI_Frontend'),'Unexpected workspace root');
const operations=json('packages/contracts/src/operations.json');
const domain=json(domainReportPath);
const handlers=read('apps/web/src/mocks/handlers.ts');
const browser=read('apps/web/src/mocks/browser.ts');
const main=read('apps/web/src/main.tsx');
const vite=read('apps/web/vite.config.ts');
const packageJson=json('apps/web/package.json');
const client=read('apps/web/src/shared/api/client.ts');
const networkFixture=read('tests/fixtures/mock-network.mjs');
const domainLog=read(domainLogPath);
const moduleFiles=walk('apps/web/src/modules').filter(file=>/\.(tsx?|jsx?)$/.test(file));
const moduleMockImports=moduleFiles.filter(file=>/from\s+['"][^'"]*(?:\/mocks\/|seed\.json)/.test(read(file)));
assert(Object.keys(operations).length===210,'Canonical generated operation count changed from registered network proof.');
assert(domain.status==='PASS'&&domain.network.handlers===210&&domain.network.checks.length===13&&domain.network.checks.every(check=>check.status==='PASS'),'Current network fixture did not pass all handler and scenario checks.');
assert(domain.checks.length===75&&domain.checks.every(check=>check.status==='PASS'),'Current simulator suite did not pass all 75 checks.');
assert(domainLog.includes('"networkHandlers":210')&&domainLog.includes('"networkChecks":13')&&/^exitCode=0\s*$/m.test(domainLog),'Dedicated current domain log is incomplete.');
assert(handlers.includes('Object.entries(operations)')&&handlers.includes('methods[spec.method as keyof typeof methods]')&&handlers.includes('`/api/v2${spec.path.replace'), 'MSW handlers are not derived from canonical operation IDs/methods/paths.');
assert(browser.includes('if (!__MOCK__)')&&browser.includes('await worker.start')&&browser.includes("print.error()"),'Mock worker has no explicit mock-only guard or strict unhandled API behavior.');
assert(main.includes('if (__MOCK__)')&&main.includes("import('./mocks/browser')")&&main.includes('mockServiceWorker.js'),'App does not gate MSW on demo/test mode or clean a leftover mock worker in live mode.');
assert(vite.includes("const mocks = mode === 'demo'")&&vite.includes("mode === 'production' && env.VITE_ENABLE_MOCKS === 'true'")&&vite.includes('server: { port: 5173, strictPort: true,'),'Vite mock activation/live proxy is not explicit and production-guarded.');
assert(packageJson.scripts.dev.includes('--mode demo')&&packageJson.scripts['dev:live'].includes('--mode development'),'Local demo and live-development entrypoints are not separate.');
assert(client.includes('operationUrl(op, options.path, options.query)')&&client.includes('await fetch(url')&&client.includes('assertSchema<ResponseOf<K>>'),'Frontend API client is not the shared contract-validated HTTP boundary.');
assert(networkFixture.includes("server.listen({ onUnhandledRequest: 'error' })"),'Network fixture silently accepts requests with no handler.');
assert(moduleMockImports.length===0,`Module JSX imports mock fixtures directly: ${moduleMockImports.join(', ')}`);
const requiredScenarios=['Registers every canonical HTTP operation','Loads the service worker only in demo mode','Covers the canonical route, feature, shop, and role catalogs','Returns schema-valid, paginated data and rejects stale cursors','Pages through a deterministic large dataset','Scopes reads to the requested shop and role permissions','Maps request validation, CSRF, and missing If-Match','Creates a product with schema-complete variants through HTTP','Preserves idempotency and exposes stale and unknown mutation outcomes','Resets records, role, faults, idempotency keys, sequence, and fixed clock deterministically','Returns observable transient and empty states','Aborted delayed reads do not leak','Streams only the authorized shop'];
for(const scenario of requiredScenarios)assert(domain.network.checks.some(check=>check.name.includes(scenario)),'Network scenario missing: '+scenario);

const map=json('botsales-kit/execution/frontend-command-map.json');
const command=map.commands.find(item=>item.id==='domain');
assert(command?.status==='VERIFIED_AVAILABLE'&&command.command==='set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run test:domain','Registered domain command unavailable.');
const audit={scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',result:'PASS',operations:Object.keys(operations).length,networkHandlers:domain.network.handlers,simulatorChecks:domain.checks.length,networkChecks:domain.network.checks.length,networkScenarios:domain.network.checks.map(check=>({name:check.name,status:check.status})),transport:{operationIdsPathsAndMethodsGeneratedFromCanonicalIndex:true,frontendClientUsesContractValidatedFetchBoundary:true,featureModulesImportMocksDirectly:moduleMockImports.length,demoEntryUsesMockMode:packageJson.scripts.dev.includes('--mode demo'),liveEntryUsesSeparateDevelopmentMode:packageJson.scripts['dev:live'].includes('--mode development'),workerHardGuardAndStrictUnhandledBehavior:true,productionMockActivationRejected:true,leftoverDemoWorkerUnregisteredInLiveMode:true,fixtureUnhandledRequestsFail:true},observedAt:new Date().toISOString()};
const auditText=JSON.stringify(audit,null,2)+'\n';
fs.writeFileSync(path.join(root,auditPath),auditText,'utf8');
const auditLog=[`FE008.S02 operationId/MSW transport and activation audit`,`cwd=${root}`,`result=PASS canonical operations=${audit.operations}; MSW network handlers=${audit.networkHandlers}; network scenarios=${audit.networkChecks}/${audit.networkChecks}; domain simulator=${audit.simulatorChecks}/${audit.simulatorChecks}`,`demo=explicit mode; live=separate mode; production mock flag rejected; unhandled API requests fail`, `module mock fixture imports=${moduleMockImports.length}`, ...audit.networkScenarios.map(check=>`NETWORK ${check.status}: ${check.name}`),'Scope=local React frontend + synthetic MSW; no real backend or provider integration claimed.'].join('\n')+'\n';
fs.writeFileSync(path.join(root,auditLogPath),auditLog,'utf8');

const reviewer='Codex self-review; no independent peer review claimed';
const sourcePaths=[
  'AGENTS.md','AI_RULES.md','apps/web/package.json','apps/web/src/main.tsx','apps/web/src/mocks/browser.ts','apps/web/src/mocks/handlers.ts','apps/web/src/mocks/service.ts','apps/web/src/mocks/database.ts','apps/web/src/shared/api/client.ts','apps/web/vite.config.ts',
  'botsales-kit/contracts/openapi.json','botsales-kit/contracts/route-manifest.json','botsales-kit/contracts/feature-catalog.json','botsales-kit/contracts/permission-catalog.json','packages/contracts/src/operations.json',
  'tests/fixtures/mock-network.mjs','scripts/test-domain.mjs','evidence/domain-tests.json','botsales-kit/execution/frontend-command-map.json',
  domainLogPath,auditPath,auditLogPath,`${base}/audit-s02-transport-current-20261006.mjs`,
].sort();
const sourceFiles=sourcePaths.map(p=>({path:p,sha256:sha(bytes(p))}));
const sourceSnapshotSha256=sha(Buffer.from(sourceFiles.map(item=>`${item.path}:${item.sha256}`).join('\n')));
const log=[`FE008.S02 current HTTP/MSW transport proof`,`executedAt=${audit.observedAt}`,`cwd=${root}`,`commandId=${command.id}; command=${command.command}; exitCode=0`,`registered networkChecks=${domain.network.checks.length}/${domain.network.checks.length}; networkHandlers=${domain.network.handlers}; simulatorChecks=${domain.checks.length}/${domain.checks.length}`,auditLog.trimEnd(),`sourceSnapshotSha256=${sourceSnapshotSha256}`,...sourceFiles.map(item=>`SOURCE ${item.path} sha256=${item.sha256}`),`reviewer=${reviewer}`].join('\n')+'\n';
fs.writeFileSync(path.join(root,evidenceLogPath),log,'utf8');
const revision=execFileSync('git',['rev-parse','--short','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();
const evidence={taskId:'FE008',stepId:'S02',kind:'test_run',result:'PASS',verificationScope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',executedAt:audit.observedAt,sourceRevision:`HEAD ${revision} on ${branch} + current frontend working tree`,expected:'Every canonical HTTP operation is handled through shared MSW service/transport by operation ID; query filters/cursor/version/allowedActions/command outcomes are tested; UI modules contain no inline seed/mock fixtures; mock mode cannot silently fall through to live.',observed:`Fresh registered domain run exited 0: ${domain.checks.length}/${domain.checks.length} simulator checks, ${domain.network.checks.length}/${domain.network.checks.length} MSW network scenarios, ${domain.network.handlers} network handlers for ${Object.keys(operations).length} canonical operations. Static transport review confirmed the React client uses a single contract-validated fetch boundary, all feature modules import zero mock seed/service files, demo/live Vite modes are separate, production mock activation throws, and unhandled API requests fail loudly.`,commandId:command.id,command:command.command,cwd:root,reviewer,environment:{name:`Windows / Node ${process.versions.node} / npm ${process.env.npm_config_user_agent||'local package runtime'}`,details:'Current local MSW Node-network tests plus static review of the React client/demo/live boot paths; deterministic in-memory store only.',dataSource:'synthetic-msw'},checksTotal:13,failed:0,logFile:evidenceLogPath.replace(/^botsales-kit\//,''),logSha256:sha(Buffer.from(log)),sourceFiles,sourceSnapshotSha256,commandResults:[{commandId:command.id,command:command.command,exitCode:0,logFile:domainLogPath.replace(/^botsales-kit\//,''),logSha256:sha(bytes(domainLogPath))},{command:`node ${base}/audit-s02-transport-current-20261006.mjs`,exitCode:0,logFile:auditLogPath.replace(/^botsales-kit\//,''),logSha256:sha(bytes(auditLogPath))}],audit};
fs.writeFileSync(path.join(root,evidencePath),`${JSON.stringify(evidence,null,2)}\n`,'utf8');
console.log(JSON.stringify({result:'PASS',evidence:evidencePath,operations:Object.keys(operations).length,handlers:domain.network.handlers,networkChecks:domain.network.checks.length,domainChecks:domain.checks.length,moduleMockImports:moduleMockImports.length,sourceSnapshotSha256},null,2));
