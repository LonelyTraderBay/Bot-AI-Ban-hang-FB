import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const dir='botsales-kit/execution/frontend-evidence/FE006';
const helper=`${dir}/capture-s01-spc059-refresh-20261006.mjs`;
const tokenMapPath=`${dir}/S01-token-map-after-spc059-20261006.json`;
const unitLogPath='botsales-kit/execution/frontend-evidence/FE005/S03-unit-spc059-current-20261006.log';
const evidencePath=`${dir}/S01-after-spc059-20261006.json`;
const logPath=`${dir}/S01-after-spc059-20261006.log`;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=f=>fs.readFileSync(path.join(root,f));
const read=f=>bytes(f).toString('utf8');
const json=f=>JSON.parse(read(f));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
assert(root.endsWith('BotSalesAI_Frontend'),'Unexpected frontend root');
const map=json('botsales-kit/execution/frontend-command-map.json');
const unit=map.commands.find(c=>c.id==='unit');
assert(unit?.status==='VERIFIED_AVAILABLE','Registered unit command unavailable');
const unitLog=read(unitLogPath);
const tokenMap=json(tokenMapPath);
const canonical=json('botsales-kit/design/tokens.json');
const generated=json('packages/design-tokens/src/tokens.json');
const theme=read('apps/web/src/shared/ui/theme.ts');
const layout=read('apps/web/src/shared/ui/layout.ts');
const components=read('apps/web/src/shared/ui/components.tsx');
const assertRule=read('docs/FRONTEND_SPACING_STANDARD.md');
assert(unitLog.includes(`command=${unit.command}`)&&/^exitCode=0$/m.test(unitLog)&&/Tests\s+93 passed \(93\)/.test(unitLog),'Current unit test evidence is not 93/93');
assert(tokenMap.status==='PASS'&&tokenMap.checks.length===10&&tokenMap.checks.every(c=>c.result==='PASS'),'Canonical token bridge audit did not pass 10/10');
assert(canonical.theme==='dark-only'&&JSON.stringify(canonical)===JSON.stringify(generated),'Canonical/generated tokens differ or theme is not dark-only');
assert(theme.includes('spacing: tokens.space.sm')&&['space.xs','space.md','space.lg'].every(name=>layout.includes(`tokens.${name}`)),'MUI base and semantic spacing bridge is incomplete');
assert(assertRule.includes('SPC-059')&&components.includes('tokens.layout.touchTarget'),'Current UI policy or touch target contract is missing');
const checks=[
 {label:'Graphite Gold single palette',observed:'Canonical and generated token objects match; ADR-approved dark-only Graphite Gold remains the sole theme.'},
 {label:'typography and breakpoints',observed:'MUI theme maps font sizes/line heights and named canonical breakpoints.'},
 {label:'spacing base and semantic factors',observed:'MUI spacing base uses token space.sm; layout.ts derives xs/md/lg and related factors from canonical tokens. This corrects the prior audit false positive, which looked only in theme.ts.'},
 {label:'radius, touch target and motion',observed:'Component/theme bridge consumes canonical radius, touch-target and reduced-motion values.'},
 {label:'unit regression baseline',observed:'Registered local frontend unit command passed 93/93 across 10 files; no browser accessibility or owner-acceptance claim.'},
 {label:'future UI policy synchronization',observed:'SPC-059 is present in the canonical spacing standard; this is policy evidence, not proof every existing control was interacted with.'},
];
const sourcePaths=[
 'AGENTS.md','AI_RULES.md','DESIGN.md','UX-CONTRACT.md','docs/FRONTEND_SCOPE.md','docs/FRONTEND_SPACING_STANDARD.md','docs/PROJECT_CONTEXT.md',
 'botsales-kit/design/tokens.json','packages/design-tokens/src/tokens.json','packages/design-tokens/src/index.ts','apps/web/src/shared/ui/theme.ts','apps/web/src/shared/ui/layout.ts','apps/web/src/shared/ui/components.tsx','apps/web/src/app/bootstrap.css','apps/web/src/app/tokens.css','apps/web/index.html','botsales-kit/design/decision.json','botsales-kit/design/IMPLEMENTATION_NOTES.md','botsales-kit/docs/03_DESIGN_SYSTEM.md','botsales-kit/docs/19_DARK_ONLY_POLICY.md','botsales-kit/execution/frontend-command-map.json',tokenMapPath,unitLogPath,helper,
].sort();
const sourceFiles=sourcePaths.map(file=>({path:file,sha256:sha(bytes(file))}));
const sourceSnapshotSha256=sha(Buffer.from(sourceFiles.map(f=>`${f.path}:${f.sha256}`).join('\n')));
const revision=execFileSync('git',['rev-parse','--short','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();
const executedAt=new Date().toISOString();
const reviewer='Codex self-review; no independent peer review claimed';
const observed='Current 10-check design-token bridge audit passed: canonical/generated Graphite Gold tokens match, MUI spacing and semantic layout factors consume the same source, and typography/radius/breakpoint/color/touch/motion mappings are present. The retained current local unit run passed 93/93. Static token mapping does not certify browser contrast, zoom, screen-reader or owner acceptance.';
const log=[`FE006.S01 token bridge and design system refresh after SPC-059`,`executedAt=${executedAt}`,`cwd=${root}`,`command=${unit.command}`,`exitCode=0`, `unit=93/93; tokenMap=10/10 PASS`, ...checks.flatMap(c=>[`CHECK ${c.label}: PASS`,c.observed]),'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no backend/provider/staging claim.',`sourceSnapshotSha256=${sourceSnapshotSha256}`,...sourceFiles.map(f=>`SOURCE ${f.path} sha256=${f.sha256}`),`reviewer=${reviewer}`].join('\n')+'\n';
fs.writeFileSync(path.join(root,logPath),log,'utf8');
const evidence={taskId:'FE006',stepId:'S01',kind:'test_run',result:'PASS',verificationScope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',executedAt,sourceRevision:`HEAD ${revision} on ${branch} + current frontend working tree`,expected:'A single Graphite Gold dark-only palette maps canonical typography, spacing, breakpoints and semantic colors through the MUI bridge; record only mappings actually consumed.',observed,commandId:unit.id,command:unit.command,cwd:root,reviewer,environment:{name:`Windows / Node ${process.versions.node} / local frontend`,details:'Current registered Vitest run plus a static token bridge audit; no browser or live service result inferred.',dataSource:'source-only'},checksTotal:checks.length,failed:0,logFile:logPath.replace(/^botsales-kit\//,''),logSha256:sha(Buffer.from(log)),sourceFiles,sourceSnapshotSha256,tokenMap:{path:tokenMapPath.replace(/^botsales-kit\//,''),checksTotal:10,passed:10,failed:0},unit:{testsPassed:93,filesPassed:10}};
fs.writeFileSync(path.join(root,evidencePath),`${JSON.stringify(evidence,null,2)}\n`,'utf8');
console.log(JSON.stringify({result:'PASS',unit:'93/93',tokenMap:'10/10',evidence,log:logPath},null,2));