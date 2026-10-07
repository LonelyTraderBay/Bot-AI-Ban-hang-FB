import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const directory='evidence/frontend-ui-improvements/shared-composition-20261006';
const issues=[];
const hashes=JSON.parse(fs.readFileSync(`${directory}/final-source-hashes.json`,'utf8'));
for(const row of hashes) if(createHash('sha256').update(fs.readFileSync(row.file)).digest('hex')!==row.sha256)issues.push(`Hash drift: ${row.file}`);
const docs=['evidence/REPORT.md','AGENTS.md','README.md','DESIGN.md','UX-CONTRACT.md','docs/FRONTEND_SCOPE.md','docs/CONTINUE_FRONTEND.md','docs/PROJECT_CONTEXT.md','docs/FRONTEND_SPACING_STANDARD.md','docs/FRONTEND_UI_IMPROVEMENT_PLAN.md','botsales-kit/docs/18_CODING_STANDARDS.md','apps/web/src/shared/ui/README.md',`${directory}/REPORT.md`];
const links=[];
for(const file of docs) {
    const text=fs.readFileSync(file,'utf8');
    if(file!=='botsales-kit/docs/18_CODING_STANDARDS.md' && !text.includes('SPC-061'))issues.push(`Missing policy link: ${file}`);
    for(const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        let target=match[1].split('#')[0].replace(/^<|>$/g,'');
        if(!target || /^[a-z]+:\/\//i.test(target) || target.startsWith('app:'))continue;
        if(target.includes(' ') && !match[1].startsWith('<'))target=target.split(' ')[0];
        const resolved=path.resolve(path.dirname(file),decodeURIComponent(target));
        links.push({file,target,exists:fs.existsSync(resolved)});
    }
}
// Report only links introduced by this task; old unrelated links remain outside scope.
const newLinks=links.filter(row=>row.target.includes('shared-composition-20261006') || row.target.includes('shared/ui/README.md') || row.file===`${directory}/REPORT.md` || row.file==='apps/web/src/shared/ui/README.md');
for(const row of newLinks)if(!row.exists && !row.target.endsWith('delivery-check.json'))issues.push(`Broken task link: ${row.file} -> ${row.target}`);
const changed=JSON.parse(fs.readFileSync(`${directory}/migration-manifest.json`,'utf8')).map(row=>row.file.split(path.win32.sep).join('/'));
const check=spawnSync('git',['-c','core.safecrlf=false','diff','--check','--',...changed,'apps/web/src/shared/ui/components.tsx','apps/web/src/shared/ui/layout.ts','package.json',...docs],{encoding:'utf8',windowsHide:true});
if(check.status!==0)issues.push(`Tracked diff whitespace: ${check.stdout}${check.stderr}`);
const extra=['apps/web/src/shared/ui/composition.tsx','scripts/check-ui-composition.mjs','tests/ui-composition-checker.test.mjs','tests/ui-composition-layout.spec.ts','apps/web/tests/composition.test.tsx','apps/web/src/shared/ui/README.md'];
for(const file of extra) if(fs.readFileSync(file,'utf8').split(/\r?\n/).some(line=>/[\t ]+$/.test(line)))issues.push(`New-file trailing whitespace: ${file}`);
const comparison=JSON.parse(fs.readFileSync(`${directory}/layout-comparison.json`,'utf8'));
const report={checkedAt:new Date().toISOString(),scope:'Current Frontend source/policy/link/whitespace only; does not replace E2E/native zoom/screen-reader/owner evidence.',sourceHashFiles:hashes.length,sourceHashesStable:!issues.some(row=>row.startsWith('Hash drift')),policyDocs:docs.length,checkedTaskLinks:newLinks.length,pairedComparison:comparison.status,pairedComparable:comparison.pairedComparable,baselineNotComparable:comparison.baselineGaps.length,gitDiffWhitespaceExit:check.status,issues,status:issues.length?'FAIL':'PASS'};
fs.writeFileSync(`${directory}/delivery-check.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));if(issues.length)process.exitCode=1;
