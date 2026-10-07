import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
const root=process.cwd(), audit=path.join(root,'evidence/frontend-architecture-audit-20261002');
const read=f=>JSON.parse(fs.readFileSync(path.join(audit,f),'utf8'));
const snapshot=read('snapshot.json'), cold=read('snapshot-cold.json');
const artifacts={
  'evidence/source-check.json':'source-check.json',
  'evidence/boundaries.json':'boundaries.json',
  'evidence/domain-tests.json':'domain-tests.json',
  'evidence/mock-schema-check.json':'mock-schema-check.json',
  'botsales-kit/execution/frontend-evidence/FE025/demo-preview-metrics.json':'demo-preview-metrics.json',
  'botsales-kit/execution/frontend-evidence/FE025/large-dataset-metrics.json':'large-dataset-metrics.json',
  'test-results/states-route-empty-composi-70c7d-es-on-canonical-list-routes-chromium/error-context.md':'empty-test-error-context.md',
  'test-results/states-route-empty-composi-70c7d-es-on-canonical-list-routes-chromium/trace.zip':'empty-test-trace.zip',
};
for(const [source,target] of Object.entries(artifacts)) fs.copyFileSync(path.join(snapshot.copy,source),path.join(audit,target));
const checkIDs=['setup','verify','verify-after-setup','e2e','audit','schema','schema-direct','schema-dependencies','schema-with-dependencies','cold-install','cold-build','cold-empty-regression'];
const checks=Object.fromEntries(checkIDs.map(id=>[id,read(id+'.json')]));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const changed=snapshot.relevantFiles.filter(f=>digest(fs.readFileSync(path.join(root,f.path)))!==f.sha256).map(f=>f.path);
const metrics=read('demo-preview-metrics.json'), large=read('large-dataset-metrics.json');
const probes=read('browser-probes.json');
const e2eLog=fs.readFileSync(path.join(audit,'e2e.log'),'utf8');
const gates=[
  {id:'FE-G01',status:'PASS',basis:['cold-install.json','cold-build.json','freshness-and-artifacts.json']},
  {id:'FE-G02',status:'PASS',basis:['verify-after-setup.json','source-check.json','boundaries.json','structure.json']},
  {id:'FE-G03',status:'PASS',basis:['verify-after-setup.json','schema-with-dependencies.json','mock-schema-check.json','domain-tests.json']},
  {id:'FE-G04',status:'FAIL',basis:['browser-probes.json','e2e.json','coverage-counts.json'],reason:'Five reproducible P1 frontend behaviors and one P2 empty-state gap remain; current suite omits these triggers.'},
  {id:'FE-G05',status:'PARTIAL_UNVERIFIED',basis:['e2e.json','verify-after-setup.json','../../docs/KNOWN_GAPS.md'],reason:'Manual browser zoom, screen-reader and complete contrast verification remain open.'},
  {id:'FE-G06',status:'PASS',basis:['e2e.log','audit.json'],scope:'Only executed frontend XSS/upload/scope/command cases and dependency audit; not backend authorization or an exhaustive security assessment.'},
  {id:'FE-G07',status:'PASS',basis:['demo-preview-metrics.json','large-dataset-metrics.json'],scope:'Existing local Chromium demo budgets only; not a mobile, multi-browser or backend SLO.'},
  {id:'FE-G08',status:'PASS',basis:['cold-build.json','e2e.log','freshness-and-artifacts.json'],scope:'Production/demo builds and executed isolation/live-mode tests; remote CI not executed.'},
  {id:'FE-G09',status:'PARTIAL_UNVERIFIED',basis:['e2e.log','../../docs/KNOWN_GAPS.md'],reason:'Owner UAT acceptance is not recorded; known mandatory frontend issues remain open.'},
];
for(const id of ['verify-after-setup','schema-with-dependencies','cold-install','cold-build','cold-empty-regression','audit']) if(checks[id].exitCode!==0)throw Error('Required evidence not passing: '+id);
for(const title of ['untrusted product text renders as text without activating markup','switching shops cancels a delayed request','the production artifact contains neither','live mode reports an unavailable session API']) if(!e2eLog.includes(title)) throw Error('Missing executed case '+title);
if(probes.probes.length!==6||probes.probes.some(p=>!p.reproduced)||probes.error||changed.length) throw Error('Source/probe mismatch');
const passed=gates.filter(g=>g.status==='PASS').length;
const report={
  checkedAt:new Date().toISOString(),head:snapshot.head,sourceFingerprint:snapshot.sourceFingerprint,
  scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  metric:{name:'Mandatory frontend gate closure rate',formula:'PASS gates / 9 applicable gates * 100',passed,total:gates.length,percent:passed/gates.length*100,equalWeight:true,note:'Evidence-backed gate count, not a universal React certification score or percentage of all possible application correctness. No partial credit for open manual/owner criteria.'},
  readyForClaim:false,gates,checks,
  suite:{full:{passed:146,failed:1,total:147,exitCode:checks.e2e.exitCode},focusedEmptyRerun:{passed:1,failed:0,exitCode:checks['cold-empty-regression'].exitCode},note:'Full run remains FAIL. The isolated rerun does not retroactively make the full run 147/147 PASS.'},
  measured:{initialDemoGzipBytes:metrics.bundles.initialRouteGzipBytes,largestDemoChunkGzipBytes:metrics.bundles.largest[0].gzipBytes,firstCustomerPageMs:large.firstPageReadyMs,customerTotal:large.api.total,customerRenderedRows:large.domRowsIncludingHeader},
  reproducedIssues:probes.probes.map(({id,reproduced})=>({id,reproduced})),sourceChangesDuringAudit:changed,
};
fs.writeFileSync(path.join(audit,'readiness.json'),JSON.stringify(report,null,2)+'\n');
const progress=execFileSync(process.execPath,['botsales-kit/scripts/progress.mjs','status'],{cwd:root,encoding:'utf8'});fs.writeFileSync(path.join(audit,'canonical-progress-status.json'),progress);
console.log(JSON.stringify({metric:report.metric,measured:report.measured,suite:report.suite,sourceChangesDuringAudit:changed},null,2));
