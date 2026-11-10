import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(readFileSync('evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json','utf8'));
const changed=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(x=>x.startsWith('BotSalesAI_Frontend/apps/web/src/'));
console.log('Changed source absent from S17:',changed.filter(x=>!(x in manifest.sourceFingerprints)).join(', ')||'none');
