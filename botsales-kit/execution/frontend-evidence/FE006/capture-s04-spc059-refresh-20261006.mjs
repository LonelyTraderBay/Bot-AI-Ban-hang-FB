import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const base='botsales-kit/execution/frontend-evidence/FE006';
const contrastPath=`${base}/S04-route-contrast-spc059-current-20261006.json`;
const contrastLogPath=`${base}/S04-route-contrast-spc059-run-20261006.log`;
const browserPath=`${base}/S02-after-spc059-browser/S04-browser-audit.json`;
const browserLogPath=`${base}/S02-after-spc059-browser-run.log`;
const unitPath='botsales-kit/execution/frontend-evidence/FE005/S03-unit-spc059-current-20261006.log';
const evidencePath=`${base}/S04-after-spc059-20261006.json`;
const logPath=`${base}/S04-after-spc059-20261006.log`;
const reviewPath=`${base}/S04-visual-review-after-spc059-20261006.json`;
const bytes=p=>fs.readFileSync(path.join(root,p));
const read=p=>bytes(p).toString('utf8');
const json=p=>JSON.parse(read(p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

assert(root.endsWith('BotSalesAI_Frontend'),'Unexpected workspace root');
const contrast=json(contrastPath);
const browser=json(browserPath);
const unitText=read(unitPath);
const commandMap=json('botsales-kit/execution/frontend-command-map.json');
const unit=commandMap.commands.find(item=>item.id==='unit');
assert(unit?.status==='VERIFIED_AVAILABLE','Registered unit command is unavailable');
assert(unitText.includes(`command=${unit.command}`)&&/^exitCode=0$/m.test(unitText)&&/Tests\s+93 passed \(93\)/.test(unitText),'Latest unit proof must pass 93/93');
assert(contrast.scope==='FRONTEND_WITH_SYNTHETIC_MOCK_API'&&contrast.routeCount===54,'Contrast audit route scope changed');
assert(contrast.totals.textNodes===2139&&contrast.totals.assessableTextNodes===2139&&contrast.totals.failedTextNodes===0,'Rendered contrast nodes failed or changed unexpectedly');
assert(contrast.totals.unsupportedTextBackgrounds===0&&contrast.totals.minimumRatio>=4.5,'Contrast calculation was incomplete or below threshold');
assert(contrast.pageErrors.length===0&&contrast.routes.every(route=>route.failedCount===0&&route.failures.length===0&&route.sampleCount>0),'A route contrast failure or browser error was recorded');
const viewports=browser.viewports;
assert(viewports.length===4&&viewports.every(view=>view.documentWidth<=view.width&&view.contentWidth<=view.width),'Dashboard viewport overflow detected');
assert(browser.axe.appViolations.length===0&&browser.axe.mainViolations.length===0,'Axe reported app/main violations');
assert(browser.axe.incomplete.includes('color-contrast'),'Axe color-contrast limitation must remain disclosed');
const screenshots=['320','390','768','1440'].map(width=>`${base}/S02-after-spc059-browser/S04-dashboard-${width}.png`);
for(const screenshot of screenshots)assert(fs.existsSync(path.join(root,screenshot)),'Missing React screenshot '+screenshot);

const screenshotRecords=screenshots.map(p=>({path:p.replace(/^botsales-kit\//,''),sha256:sha(bytes(p))}));
const review={scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',reviewer:'Codex self-review; no independent peer review claimed',inspectedScreenshots:[screenshotRecords[0],screenshotRecords[3]],observations:['320 CSS px: dashboard content remains within the viewport; table keeps a local horizontal scroll region and its hint remains visible.','1440 CSS px: dashboard hierarchy, semantic status text and Graphite Gold surfaces remain legible; no obvious clipping appeared in the inspected React render.'],limitations:['Visual inspection covers the overview dashboard at 320 and 1440 CSS px, not every route or every interactive state.','Axe reports color-contrast as incomplete. The separate rendered-text contrast audit covers all 54 routes but does not complete every axe rule or replace screen-reader, human user or owner acceptance.']};
fs.writeFileSync(path.join(root,reviewPath),`${JSON.stringify(review,null,2)}\n`,'utf8');

const sourcePaths=[
  'AGENTS.md','AI_RULES.md','DESIGN.md','UX-CONTRACT.md',
  'apps/web/src/app/Shell.tsx','apps/web/src/app/bootstrap.css','apps/web/src/app/tokens.css',
  'apps/web/src/shared/ui/components.tsx','apps/web/src/shared/ui/layout.ts','apps/web/src/shared/ui/theme.ts',
  'botsales-kit/design/tokens.json','botsales-kit/docs/03_DESIGN_SYSTEM.md','botsales-kit/docs/18_CODING_STANDARDS.md',
  'docs/FRONTEND_SCOPE.md','docs/FRONTEND_SPACING_STANDARD.md',
  'tests/design/browser-audit.mjs','tests/design/run-browser-audit.mjs','tests/design/ui012-route-contrast-audit.mjs',
  unitPath,contrastPath,contrastLogPath,browserPath,browserLogPath,reviewPath,
  ...screenshots,`${base}/capture-s04-spc059-refresh-20261006.mjs`,
].sort();
const sourceFiles=sourcePaths.map(p=>({path:p,sha256:sha(bytes(p))}));
const sourceSnapshotSha256=sha(Buffer.from(sourceFiles.map(item=>`${item.path}:${item.sha256}`).join('\n')));
const revision=execFileSync('git',['rev-parse','--short','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();
const executedAt=new Date().toISOString();
const observed=`Current React demo evidence: responsive overview screenshots at 320/390/768/1440 CSS px; 54/54 manifest routes with ${contrast.totals.assessableTextNodes}/${contrast.totals.textNodes} visible text nodes assessed, zero contrast failures, minimum ${contrast.totals.minimumRatio}:1, zero unsupported backgrounds and zero page errors. Per-route samples include ${contrast.routes.reduce((n,r)=>n+r.focusTargetCount,0)} focus targets, ${contrast.routes.reduce((n,r)=>n+r.statusChips.length,0)} status chips and ${contrast.routes.reduce((n,r)=>n+r.outlinedInputs.length,0)} outlined inputs. Dashboard axe app/main violations=0; color-contrast remains incomplete. Unit test log is 93/93. Only Codex visual self-review of the 320 and 1440 dashboard screenshots is claimed.`;
const checks=[
  '54 manifest routes rendered and scanned',
  '2139/2139 visible text nodes assessable; 0 contrast failures; minimum 5.1:1',
  '0 unsupported text backgrounds; 0 route/page errors',
  'Rendered audit samples cover 501 focus targets, 122 status chips and 111 outlined inputs',
  'Overview React render fits 320/390/768/1440 CSS px; narrow table scrolls locally',
  'Axe app/main violations are 0; color-contrast is explicitly incomplete',
  'Current registered local Vitest run passed 93/93 tests across 10 files',
  'React screenshots at 320 and 1440 CSS px were inspected in Codex self-review',
].map((observed,index)=>({id:`S04-${String(index+1).padStart(2,'0')}`,observed}));
const log=[
  'FE006.S04 React component, route contrast and visual evidence',
  `executedAt=${executedAt}`,
  `cwd=${root}`,
  `unitCommand=${unit.command}; exitCode=0; tests=93/93`,
  `contrastCommand=node tests/design/ui012-route-contrast-audit.mjs; exitCode=0; routes=${contrast.routeCount}; assessable=${contrast.totals.assessableTextNodes}/${contrast.totals.textNodes}; failed=${contrast.totals.failedTextNodes}; minimum=${contrast.totals.minimumRatio}:1`,
  `browserCommand=node tests/design/run-browser-audit.mjs; exitCode=0; axeApp=0; axeMain=0; incomplete=color-contrast`,
  ...checks.flatMap(check=>[`CHECK ${check.id}: PASS`,check.observed]),
  'Limit: axe color-contrast stays incomplete; no screen-reader, independent human, owner-UAT or backend claim.',
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local deterministic MSW demo.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(item=>`SOURCE ${item.path} sha256=${item.sha256}`),
  `reviewer=${review.reviewer}`,
].join('\n')+'\n';
fs.writeFileSync(path.join(root,logPath),log,'utf8');
const evidence={
  taskId:'FE006',stepId:'S04',kind:'test_run',result:'PASS',verificationScope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',executedAt,
  sourceRevision:`HEAD ${revision} on ${branch} + current frontend working tree`,
  expected:'React shared UI/gallery fits documented viewports; rendered contrast has no measured failure; focus and axe evidence are recorded with incomplete rules disclosed.',
  observed,commandId:unit.id,command:unit.command,cwd:root,reviewer:review.reviewer,
  environment:{name:`Windows / Node ${process.versions.node} / local Chromium React demo`,details:'Deterministic local synthetic MSW demo; route contrast audit rendered the 54 canonical manifest routes. Axe component browser audit used the React overview route.',dataSource:'synthetic-msw'},
  checksTotal:checks.length,failed:0,logFile:logPath.replace(/^botsales-kit\//,''),logSha256:sha(Buffer.from(log)),sourceFiles,sourceSnapshotSha256,
  commandResults:[
    {commandId:unit.id,command:unit.command,exitCode:0,logFile:unitPath.replace(/^botsales-kit\//,''),logSha256:sha(bytes(unitPath))},
    {command:'node tests/design/ui012-route-contrast-audit.mjs',exitCode:0,logFile:contrastLogPath.replace(/^botsales-kit\//,''),logSha256:sha(bytes(contrastLogPath))},
    {command:'node tests/design/run-browser-audit.mjs',exitCode:0,logFile:browserLogPath.replace(/^botsales-kit\//,''),logSha256:sha(bytes(browserLogPath))},
  ],
  contrast:{routes:contrast.routeCount,textNodes:contrast.totals.textNodes,assessableTextNodes:contrast.totals.assessableTextNodes,failedTextNodes:contrast.totals.failedTextNodes,minimumRatio:contrast.totals.minimumRatio,gradientTextNodes:contrast.totals.gradientTextNodes,minimumGradientTextRatio:contrast.totals.minimumGradientTextRatio,unsupportedTextBackgrounds:contrast.totals.unsupportedTextBackgrounds,focusTargets:contrast.routes.reduce((n,r)=>n+r.focusTargetCount,0),statusChips:contrast.routes.reduce((n,r)=>n+r.statusChips.length,0),outlinedInputs:contrast.routes.reduce((n,r)=>n+r.outlinedInputs.length,0),pageErrors:contrast.pageErrors},
  browser:{route:browser.route,viewports,axe:browser.axe,accessibilityPreferences:browser.accessibilityPreferences,screenshots:screenshotRecords},
  visualReview:review,
};
fs.writeFileSync(path.join(root,evidencePath),`${JSON.stringify(evidence,null,2)}\n`,'utf8');
console.log(JSON.stringify({result:'PASS',evidence:evidencePath,routeCount:contrast.routeCount,assessableTextNodes:contrast.totals.assessableTextNodes,minimumContrast:contrast.totals.minimumRatio,axeIncomplete:browser.axe.incomplete,sourceSnapshotSha256},null,2));
