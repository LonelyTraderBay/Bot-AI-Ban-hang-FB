import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import ts from 'typescript';
const out=import.meta.dirname,root=path.resolve(out,'../..'),repo=path.dirname(root),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const source=read(path.join(out,'source-review.json')),live=read(path.join(out,'live-route-review.json'));
const routes=source.routes, routeRegex=routes.map(r=>({id:r.id,re:new RegExp('^'+r.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/:[A-Za-z]+/g,'[^/]+')+'$')}));
const links=live.observations.flatMap(r=>r.links.map(link=>{const url=new URL(link.href,'http://127.0.0.1:4173');const matches=routeRegex.filter(v=>v.re.test(url.pathname));return {from:r.route,...link,path:url.pathname,internal:url.origin==='http://127.0.0.1:4173',matches:matches.map(m=>m.id)};}));
const missing=links.filter(r=>r.internal&&!r.matches.length&&!r.path.startsWith('/samples/')&&!r.path.startsWith('/api/')&&r.path!=='/');
const allConfirmations=[];
for(const file of [...new Set(routes.flatMap(r=>r.source.map(f=>f.file)))]){
 const sf=ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n){if((ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))&&n.tagName.getText()==='ConfirmDialog'){
  const props={};for(const p of n.attributes.properties)if(ts.isJsxAttribute(p)&&p.initializer)props[p.name.getText()]=p.initializer.getText();
  allConfirmations.push({file,line:sf.getLineAndCharacterOfPosition(n.getStart()).line+1,props});}ts.forEachChild(n,visit);}visit(sf);
}
const viewport=read(path.join(out,'viewport-review.json'));
const screenshots=viewport.map(r=>{const file=path.join(out,r.screenshot);return {route:r.route,path:path.relative(repo,file).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')};});
const result={recordedAt:new Date().toISOString(),routeCount:live.observations.length,uniqueRoutes:new Set(live.observations.map(r=>r.route)).size,uniqueDocumentTitles:[...new Set(live.observations.map(r=>r.title))],documentOverflow:viewport.filter(r=>r.documentWidth>r.width).map(r=>r.route),intentionalMissingJobStates:['R14','R36'],links,missingInternalRoutes:missing,semanticLinkMismatch:{from:'R33',label:'Duyệt góp ý',actualPath:'/s/shop-demo/knowledge/feedback',actualRoute:'R24',intendedRoute:'R25',intendedPath:'/s/shop-demo/knowledge/review',proof:'interaction-review.json:wrong-link-viewport'},confirmations:allConfirmations,screenshots,excludedVisualArtifacts:['live-*.png','stable-*.png','mobile-*.png','probe images without screenshotMode=viewport'],limits:'Known-path matching cannot prove a link reaches the intended task. Actual click confirmed one semantic mismatch hidden by a dynamic route. Initial full-page capture changed rendering and is excluded from visual defect proof. Viewport override requested390x844 returned1280x720 and is not fresh mobile evidence. Source confirmation inventory does not prove every dialog opened. Only three destructive confirmation dialogs were opened; none were confirmed. Missing-job fixtures do not certify successful job workflows.'};
fs.writeFileSync(path.join(out,'review-summary.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({routes:result.routeCount,uniqueTitles:result.uniqueDocumentTitles,overflow:result.documentOverflow,missing:result.missingInternalRoutes,confirmationSites:result.confirmations.length}));
