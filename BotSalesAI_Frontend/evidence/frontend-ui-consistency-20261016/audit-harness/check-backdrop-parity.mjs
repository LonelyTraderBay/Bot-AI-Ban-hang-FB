import fs from 'node:fs';import path from 'node:path';
const dir=process.argv[2],repo=process.argv[3];const tokens=JSON.parse(fs.readFileSync(path.join(repo,'botsales-kit/design/tokens.json'),'utf8'));
const hex=tokens.colors.overlay.slice(1),channels=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)),alpha=parseInt(hex.slice(6,8),16)/255;
const expected='rgba('+[...channels,alpha].join(', ')+')';
const observations=[];
for(const name of ['chromium','firefox','chrome']){
 const r=JSON.parse(fs.readFileSync(path.join(dir,'runtime-tokens-'+name+'.json'),'utf8'));
 for(const cell of r.observations.filter(x=>x.profile==='portal-dialog'))observations.push({project:name,version:r.browserVersion,width:cell.width,expected,actual:cell.overlay.backdrop,pass:cell.overlay.backdrop===expected});
}
const result={status:observations.every(x=>x.pass)?'PASS':'FAIL',contract:'BotSalesAI_Frontend/DESIGN.md:48',token:'botsales-kit/design/tokens.json:35',expectedToken:tokens.colors.overlay,observations};
fs.writeFileSync(path.join(dir,'backdrop-parity.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='PASS'?0:1;
