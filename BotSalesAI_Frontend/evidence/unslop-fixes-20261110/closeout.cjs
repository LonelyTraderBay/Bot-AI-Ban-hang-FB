const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const matrix=read('final3/matrix.json'), overlays=read('final3/overlays.json'), words=read('final3/status-wrap.json'), fields=read('final3/fields-final.json');
const controls=fields.rows.flatMap(r=>r.fields);
const summary={
 routeMatrix:{expected:488,observed:matrix.observed,errors:matrix.errors.length,sourceDrift:matrix.sourceDrift.length,pageErrors:matrix.observations.filter(o=>o.pageErrors?.length).length,overflow:matrix.observations.filter(o=>o.metrics?.overflow>0).length,clipped:matrix.observations.filter(o=>o.metrics?.clipped?.length).length,smallCandidates:matrix.observations.filter(o=>o.metrics?.smallTargets?.length).length,axeScans:matrix.observations.filter(o=>Array.isArray(o.axe)).length,axeViolations:matrix.observations.reduce((n,o)=>n+(o.axe?.length||0),0)},
 dialogs:{expected:112,observed:overlays.observed,errors:overlays.observations.filter(o=>o.error).length,misaligned:overlays.observations.filter(o=>Math.abs(o.metrics?.titleCenterDelta)>0.5).length,notFit:overlays.observations.filter(o=>!o.metrics?.viewportFits||o.metrics?.dialogOverflow).length,focusOrEscapeFailed:overlays.observations.filter(o=>!o.focusRemainsInside||!o.escapeCloses||!o.focusRestored).length},
 uploads:{observed:overlays.uploads.length,failed:overlays.uploads.filter(o=>!o.opened||o.error).length},
 statuses:{expected:122,observed:words.observed,broken:words.observations.filter(o=>o.words?.length).length,errors:words.observations.filter(o=>o.error).length},
 selects:{expected:20,observed:fields.observed,fields:controls.length,minimumControl:Math.min(...controls.map(f=>f.height)),minimumRoot:Math.min(...controls.map(f=>f.rootHeight))},
};
const ok=summary.routeMatrix.observed===488&&!summary.routeMatrix.errors&&!summary.routeMatrix.sourceDrift&&!summary.routeMatrix.pageErrors&&!summary.routeMatrix.overflow&&!summary.routeMatrix.clipped&&!summary.routeMatrix.axeViolations&&summary.dialogs.observed===112&&!summary.dialogs.errors&&!summary.dialogs.misaligned&&!summary.dialogs.notFit&&!summary.dialogs.focusOrEscapeFailed&&!summary.uploads.failed&&summary.statuses.observed===122&&!summary.statuses.broken&&!summary.statuses.errors&&summary.selects.observed===20&&summary.selects.minimumControl>=44&&summary.selects.minimumRoot>=44;
fs.writeFileSync(path.join(root,'closeout.json'),JSON.stringify({recordedAt:new Date().toISOString(),summary,ok},null,2)+'\n');
console.log(JSON.stringify({ok,summary},null,2));
if(!ok)process.exitCode=1;
