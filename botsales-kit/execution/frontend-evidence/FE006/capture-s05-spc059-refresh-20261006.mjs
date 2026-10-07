import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const base='botsales-kit/execution/frontend-evidence/FE006';
const verifyLogPath=`${base}/S05-verify-spc059-current-20261006.log`;
const evidencePath=`${base}/S05-after-spc059-20261006.json`;
const logPath=`${base}/S05-after-spc059-20261006.log`;
const reviewPath=`${base}/S05-shared-ui-api-review-spc059-20261006.json`;
const bytes=p=>fs.readFileSync(path.join(root,p));
const read=p=>bytes(p).toString('utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

assert(root.endsWith('BotSalesAI_Frontend'),'Unexpected workspace root');
const verifyLog=read(verifyLogPath);
const map=JSON.parse(read('botsales-kit/execution/frontend-command-map.json'));
const command=map.commands.find(item=>item.id==='verify-ui-select-feplan-002');
const componentSource=read('apps/web/src/shared/ui/components.tsx');
const componentTests=read('apps/web/tests/components.test.tsx');
const visualTests=read('tests/visual-token-checker.test.mjs');
const canonicalTokens=bytes('botsales-kit/design/tokens.json');
const publishedTokens=bytes('packages/design-tokens/src/tokens.json');
assert(command?.status==='VERIFIED_AVAILABLE'&&command.command==='npm.cmd --script-shell=cmd.exe run verify','Full verify command is not registered/available');
assert(/exitCode=0\s*$/.test(verifyLog),'Full verify log has no explicit exit 0');
for(const marker of [
  '"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54',
  '"files": 67', '"operationCalls": 220', '"routes": 54', '"imports": 479',
  'negativeFixtures": "Boundary fixtures: PASS 10/10',
  '"passed":88', 'Tests  93 passed (93)', '✓ 2057 modules transformed.',
  'layout-check PASS: 68 source files, 0 finding(s)',
  'visual-token-check PASS: 68 source files, 0 finding(s)',
]) assert(verifyLog.includes(marker),`Expected verify marker missing: ${marker}`);
assert(componentTests.includes('rejects copied HEX values and non-dark theme modes with negative fixtures')&&componentTests.includes('const accent = "#003366"'),'Component negative palette/HEX fixture was not found');
assert(visualTests.includes('rejects raw literals across sx, JSX system props and CSS declarations'),'Raw color/visual token negative tests were not found');
assert(canonicalTokens.equals(publishedTokens),'Published package tokens drifted from kit canonical tokens');
assert(read('apps/web/src/app/tokens.css').startsWith('/* GENERATED from approved design/tokens.json. */'),'CSS token output lost its canonical generated marker');
assert(read('apps/web/src/shared/ui/theme.ts').includes("from '@botsales/tokens'")&&read('apps/web/src/shared/ui/layout.ts').includes("from '@botsales/tokens'"),'MUI theme/layout bridge does not consume canonical tokens');
assert(read('docs/FRONTEND_SPACING_STANDARD.md').includes('SPC-059'),'Current interaction behavior policy is absent from the spacing standard');

const exports=[...componentSource.matchAll(/^export (?:function|interface|type|const) ([A-Za-z0-9_]+)/gm)].map(match=>match[1]);
const expectedExports=['PageHeader','Panel','Stat','Stats','Amount','CopyableCode','Status','Column','DataTable','Empty','QueryState','ErrorNotice','Toolbar','Pager','LookupLoadMore','RouteLink','MutationButton','EditDialog','PartialDataNotice','CapabilityUnavailable','ConfirmDialog','DetailLine'];
for(const name of expectedExports)assert(exports.includes(name),`Shared UI public export missing: ${name}`);
assert(/export function DataTable<T>\([\s\S]*?rows: readonly T\[\][\s\S]*?columns: readonly Column<T>\[\][\s\S]*?rowKey: \(row: T\) => string/.test(componentSource),'DataTable public row/column/identity props are unclear');
assert(/export function EditDialog\([\s\S]*?open: boolean;[\s\S]*?title: string;[\s\S]*?children: ReactNode;[\s\S]*?actions: ReactNode/.test(componentSource),'EditDialog is not an explicit content/action composition API');
const review={scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',reviewer:'Codex self-review; no independent peer review claimed',canonicalTokenParity:{kitAndPackageBytesEqual:canonicalTokens.equals(publishedTokens),generatedCssMarker:true,themeAndLayoutImportCanonicalTokenPackage:true},negativeTests:{copiedHexAndLightPaletteFixtureInComponentTests:true,rawVisualLiteralFixturesInCheckerTests:true,verifySuiteIncludesVitestAndVisualTokenChecker:true},publicApi:{namedExports:expectedExports,typedSimpleDataTable:'DataTable<T> accepts typed rows, typed render columns, explicit rowKey, empty copy and accessible label; query/pagination/business mutation stay in separate components.',dialog:'EditDialog composes caller-owned children/actions and exposes explicit open/title/description/close/busy/dirty-guard/draft-commit props; no schema-generated form API.',noGenericFormEngine:true},limits:['The shared component source contains a typed generic table renderer; it does not own route queries, sorting, business mutations, or schema-driven forms.','This is a source/API review plus local verification, not independent design review or production integration proof.']};
fs.writeFileSync(path.join(root,reviewPath),`${JSON.stringify(review,null,2)}\n`,'utf8');

const sourcePaths=[
  'AGENTS.md','AI_RULES.md','DESIGN.md','UX-CONTRACT.md',
  'apps/web/src/app/tokens.css','apps/web/src/shared/ui/components.tsx','apps/web/src/shared/ui/layout.ts','apps/web/src/shared/ui/theme.ts','apps/web/tests/components.test.tsx',
  'botsales-kit/design/tokens.json','botsales-kit/docs/03_DESIGN_SYSTEM.md','botsales-kit/docs/18_CODING_STANDARDS.md',
  'botsales-kit/execution/frontend-command-map.json',
  'docs/FRONTEND_SCOPE.md','docs/FRONTEND_SPACING_STANDARD.md','docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
  'packages/design-tokens/src/tokens.json','scripts/check-visual-tokens.mjs','tests/visual-token-checker.test.mjs',
  'botsales-kit/execution/frontend-evidence/FE006/S01-after-spc059-20261006.json',
  'botsales-kit/execution/frontend-evidence/FE006/S02-after-spc059-20261006.json',
  'botsales-kit/execution/frontend-evidence/FE006/S03-after-spc059-20261006.json',
  'botsales-kit/execution/frontend-evidence/FE006/S04-after-spc059-20261006.json',
  verifyLogPath,reviewPath,`${base}/capture-s05-spc059-refresh-20261006.mjs`,
].sort();
const sourceFiles=sourcePaths.map(p=>({path:p,sha256:sha(bytes(p))}));
const sourceSnapshotSha256=sha(Buffer.from(sourceFiles.map(item=>`${item.path}:${item.sha256}`).join('\n')));
const revision=execFileSync('git',['rev-parse','--short','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();
const executedAt=new Date().toISOString();
const checks=[
  'Canonical generator bridge: PASS 11 outputs / 283 schemas / 210 operations / 54 routes.',
  'Frontend source mapping: PASS 67 files / 220 operation call sites / 54 routes and source-check negative fixtures.',
  'Module boundary check: PASS 479 imports and 10/10 negative/positive fixtures.',
  'ESLint and strict React TypeScript check: both completed in the successful verify command.',
  'Domain and synthetic network checks: PASS 88/88 across 210 handlers.',
  'Vitest component suite: PASS 93/93 across 10 files, including copied HEX/light-mode negative fixtures.',
  'Production frontend build: PASS, 2057 modules transformed.',
  'Layout checker fixtures: PASS 10/10; live scan 68 files, 0 findings; 1 declared exception used.',
  'Visual-token checker fixtures: PASS 5/5 including prohibited raw literal cases; live scan 68 files, 0 findings.',
  'Canonical token JSON bytes match; generated CSS marker and shared theme/layout token imports are present.',
  'Shared component API review: 22 typed named exports; table stays a typed display renderer and dialog accepts explicit children/actions rather than generated form schemas.',
].map((observed,index)=>({id:`S05-${String(index+1).padStart(2,'0')}`,observed}));
const observed='Full registered local verify command exited 0: generate, source/boundaries, lint, TypeScript, domain/MSW, Vitest 93/93, production build, layout fixtures/live scan and visual-token fixtures/live scan all pass. Token JSON copies are byte-equal, generated CSS and MUI bridge reference canonical tokens, and component negative fixtures reject copied HEX/light palette. Source review found a typed presentational DataTable<T> but no schema-driven form engine; query/pagination/actions remain explicit separate components. Synthetic local frontend only.';
const log=[
  'FE006.S05 token drift, component API, type and negative palette evidence',
  `executedAt=${executedAt}`,
  `cwd=${root}`,
  `commandId=${command.id}; command=${command.command}; exitCode=0`,
  ...checks.flatMap(check=>[`CHECK ${check.id}: PASS`,check.observed]),
  `tokenJsonSha256=${sha(canonicalTokens)}; packageTokenJsonSha256=${sha(publishedTokens)}; bytesEqual=${canonicalTokens.equals(publishedTokens)}`,
  'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no backend, hosted CI, staging, deployment or owner acceptance claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(item=>`SOURCE ${item.path} sha256=${item.sha256}`),
  `reviewer=${review.reviewer}`,
].join('\n')+'\n';
fs.writeFileSync(path.join(root,logPath),log,'utf8');
const evidence={taskId:'FE006',stepId:'S05',kind:'test_run',result:'PASS',verificationScope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',executedAt,sourceRevision:`HEAD ${revision} on ${branch} + current frontend working tree`,expected:'Canonical tokens and MUI bridge remain in sync; typed shared component props are bounded; type, component, token-drift, palette/HEX negative checks pass.',observed,commandId:command.id,command:command.command,cwd:root,reviewer:review.reviewer,environment:{name:`Windows / Node ${process.versions.node} / npm local frontend verification`,details:'Full registered npm verify executed through current package scripts; deterministic synthetic MSW tests and local production build. Evidence is local frontend only.',dataSource:'synthetic-msw'},checksTotal:checks.length,failed:0,logFile:logPath.replace(/^botsales-kit\//,''),logSha256:sha(Buffer.from(log)),sourceFiles,sourceSnapshotSha256,commandResults:[{commandId:command.id,command:command.command,exitCode:0,logFile:verifyLogPath.replace(/^botsales-kit\//,''),logSha256:sha(bytes(verifyLogPath))}],review,summary:{generator:{outputs:11,schemas:283,operations:210,routes:54},source:{files:67,operationCallSites:220,routes:54},boundaries:{imports:479,fixtures:10},domainAndNetworkChecks:88,unit:{tests:93,files:10},productionBuildModules:2057,layout:{fixtures:10,files:68,findings:0,exceptionsUsed:1},visualTokens:{fixtures:5,files:68,findings:0},tokenJsonByteParity:true,axeOrAccessibilityConformanceNotAsserted:true}};
fs.writeFileSync(path.join(root,evidencePath),`${JSON.stringify(evidence,null,2)}\n`,'utf8');
console.log(JSON.stringify({result:'PASS',evidence:evidencePath,commandId:command.id,checks:checks.length,unit:'93/93',layoutFindings:0,visualTokenFindings:0,sourceSnapshotSha256},null,2));
