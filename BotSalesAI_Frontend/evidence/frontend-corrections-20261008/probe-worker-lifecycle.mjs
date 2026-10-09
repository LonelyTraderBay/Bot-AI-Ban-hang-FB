import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { firefox } from '@playwright/test';
import { startDemoServer } from '../../tests/session/demo-server.mjs';
const phase=process.argv[2];if(!['before','after'].includes(phase))throw new Error('Pass before or after');
const source=path.resolve(import.meta.dirname,'../../apps/web/src/mocks/browser.ts');
const server=await startDemoServer(),browser=await firefox.launch(),page=await browser.newPage();
const messages=[],errors=[],observations=[];
page.on('console',event=>{if(event.text().startsWith('WORKER_LIFECYCLE '))messages.push(JSON.parse(event.text().slice(17)));if(event.type()==='error')errors.push(event.text());});
await page.addInitScript(()=>{
    const original=ServiceWorker.prototype.postMessage;
    ServiceWorker.prototype.postMessage=function(message,...args){const type=typeof message==='string'?message:message?.type;if(type)console.log('WORKER_LIFECYCLE '+JSON.stringify({type,path:location.pathname}));return original.call(this,message,...args);};
    const update=ServiceWorkerRegistration.prototype.update;
    ServiceWorkerRegistration.prototype.update=function(){console.log('WORKER_LIFECYCLE '+JSON.stringify({type:'registration.update',path:location.pathname,active:this.active?.state,controller:navigator.serviceWorker.controller?.state}));try{return update.call(this);}catch(error){console.error('UPDATE_STACK '+String(error)+' '+error.stack);throw error;}};
});
try {
    for(const route of ['overview','bot/config','bot/evaluations','customers','products','orders/new','bot/evaluations','reports']) {
        await page.goto(server.url+'/s/shop-demo/'+route);
        await page.locator('main#main-content').waitFor({state:'visible',timeout:15000});
        const status=await page.evaluate(async()=> (await fetch('/api/v2/session')).status);
        observations.push({route,status});
        if(status!==200)throw new Error('MSW session unavailable: '+route);
    }
} catch(error){ errors.push(String(error)); }
finally {await browser.close();await server.close();}
const value={phase,observedAt:new Date().toISOString(),browser:'Firefox actual page.goto navigations',sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),observations,messages,errors,normalDepartureDeactivations:messages.filter(message=>message.type==='MOCK_DEACTIVATE').length};
fs.writeFileSync(path.join(import.meta.dirname,'worker-lifecycle-'+phase+'.json'),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({phase,requests:observations.length,normalDepartureDeactivations:value.normalDepartureDeactivations,errors}));
if(phase==='after' && (errors.length || observations.length!==8 || messages.some(message=>message.type==='CLIENT_CLOSED')))process.exitCode=1;
