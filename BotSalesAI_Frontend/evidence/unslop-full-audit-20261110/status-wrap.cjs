const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium,firefox,expect}=require('@playwright/test');
const routes=JSON.parse(fs.readFileSync('../botsales-kit/contracts/route-manifest.json')).routes;
const ids={shopId:'shop-demo',conversationId:'cv1',customerId:'c1',productId:'p1',orderId:'DH-1001',knowledgeId:'k1',jobId:'missing-job'};
(async()=>{
 const {startDemoPreview}=await import(pathToFileURL(path.resolve('tests/session/demo-server.mjs')));
 const server=await startDemoPreview(),observations=[];
 try{
  await Promise.all([['chromium',chromium],['firefox',firefox]].map(async([engine,type])=>{
   const b=await type.launch(engine==='chromium'?{channel:'chrome'}:{}),p=await b.newPage({viewport:{width:390,height:844}});
   try{for(const route of routes){
    const record={route:route.id,engine,width:390};
    try{
     await p.goto(server.url+route.path.replace(/:([A-Za-z]+)/g,(_,key)=>ids[key]||'missing'),{waitUntil:'domcontentloaded'});
     await expect(p.locator('main h1,main h2,main h3').first()).toBeVisible();
     await expect(p.locator('main [role="progressbar"]')).toHaveCount(0,{timeout:15000});
     record.words=await p.locator('main .MuiChip-label').evaluateAll(labels=>{
      const result=[];
      for(const label of labels){
       if(!label.getBoundingClientRect().width)continue;
       const walker=document.createTreeWalker(label,NodeFilter.SHOW_TEXT);
       let node;
       while(node=walker.nextNode()){
        const text=node.textContent;
        for(const match of text.matchAll(/\p{L}+/gu)){
         const lines=new Set();let start=match.index;
         for(const char of match[0]){const range=document.createRange();range.setStart(node,start);range.setEnd(node,start+char.length);lines.add(Math.round(range.getBoundingClientRect().top));start+=char.length;}
         if(lines.size>1)result.push({label:label.textContent,word:match[0],lines:lines.size,width:label.getBoundingClientRect().width});
        }
       }
      }
      return result;
     });
    }catch(e){record.error=e.message;}
    observations.push(record);
   }}finally{await b.close();}
  }));
 }finally{await server.close();}
 const result={expected:122,observed:observations.length,observations};
 fs.writeFileSync(path.join(__dirname,'status-wrap.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({expected:122,observed:observations.length,broken:observations.filter(x=>x.words?.length),errors:observations.filter(x=>x.error)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
