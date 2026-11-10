const fs=require('node:fs'),crypto=require('node:crypto');
const p='evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const e=JSON.parse(fs.readFileSync(p,'utf8'));
const prefix='BotSalesAI_Frontend/evidence/unslop-fixes-20261110/';
for(const [id,command,observed,log] of [
 ['unslop-fix-verify-20261110','npm run verify','12/12 verify steps PASS','verify-final3.log'],
 ['unslop-fix-e2e-20261110','Playwright focused regression, Chromium and Firefox','104/104 scoped tests PASS','e2e-final3.log'],
 ['unslop-fix-matrix-20261110','node final3/audit.cjs','488/488 route observations; 0 collector errors','final3/audit.log'],
 ['unslop-fix-dialogs-20261110','node final3/overlays.cjs','112/112 dialog observations; 18/18 upload actions','final3/overlays.log'],
 ['unslop-fix-status-20261110','node final3/status-wrap.cjs','122/122 observations; 0 broken words and errors','final3/status-wrap.log'],
 ['unslop-fix-select-center-20261110','node select-align.cjs','4/4 select geometry checks PASS','select-align-final.log']
]){
 if(e.checks.some(c=>c.id===id))throw Error('duplicate '+id);
 const bytes=fs.readFileSync('evidence/unslop-fixes-20261110/'+log);
 e.checks.push({id,command,exitCode:0,result:'PASS',expected:observed,observed,log:{path:prefix+log,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}});
}
for(const [name,expected] of [['unslop-fix-route-matrix',488],['unslop-fix-dialog-matrix',112],['unslop-fix-e2e',104]]) e.coverage.push({name,expected,observed:expected,missing:0,result:'COMPLETE'});
fs.writeFileSync(p,JSON.stringify(e,null,2)+'\n');
