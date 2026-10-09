import fs from 'node:fs';
import path from 'node:path';
const dir=import.meta.dirname;
function edit(name,changes){const file=path.join(dir,name);let source=fs.readFileSync(file,'utf8');for(const [from,to]of changes){if(!source.includes(from))throw Error(name+': missing '+from);source=source.replaceAll(from,to);}fs.writeFileSync(file,source);}
for(const runner of ['capture-shared-text-zoom.mjs','capture-shared-browser-zoom.mjs'])edit(runner,[[ '"apps/web/src/modules/inbox/index.tsx"','"apps/web/src/modules/catalog/index.tsx","tests/ui-component-layout.spec.ts","apps/web/src/modules/inbox/index.tsx"' ]]);
edit('review-final-scope.mjs',[
 ["'apps/web/vite.config.ts','tests/session/demo-worker-startup.spec.ts',","'apps/web/vite.config.ts','tests/session/demo-worker-startup.spec.ts',\n 'scripts/check-layout.mjs','tests/layout-checker.test.mjs','apps/web/src/modules/catalog/index.tsx','tests/ui-component-layout.spec.ts',"],
 ['beforeCopies.length===15','beforeCopies.length===19'],
 ["newSourceFiles:['tests/design/shared-consolidation-fixture.ts']","newSourceFiles:['tests/design/shared-consolidation-fixture.ts','tests/design/owned-label-geometry.mjs']"]
]);
edit('revalidate-checkpoints.mjs',[
 ["record('label-regression');","record('label-regression'); record('variant-regression');\nassert(/\\b2 passed \\(/.test(logs['variant-regression']),'Both-engine variant width regression required');"],
 ["const sourceFiles = sources.map", "sources.push('scripts/check-layout.mjs','tests/layout-checker.test.mjs','tests/design/owned-label-geometry.mjs');\nconst sourceFiles = [...new Set(sources)].map"]
]);
edit('write-handoff-docs.mjs',[
 ["'startup-cache-regression','label-regression'","'startup-cache-regression','label-regression','variant-regression'"],
 ['82/82 layout','86/86 layout'],['238 source inputs','239 source inputs'],
 ['[sau](label-regression-latest.json).','[sau](label-regression-latest.json). Native108 route probes còn phát hiện R10/R11 width0: đã sửa wrap/minimum theo chữ tại editor; [regression trước](variant-before.json) và [sau](variant-regression-latest.json) trên cả hai engine.']
]);
edit('finalize-current.mjs',[
 ["const stages=[[", "const stages=[['variant-regression',/\\b2 passed \\(/,'2/2 create/edit variant readable-width and draft-preservation regression'],["],
 ['82/82 fixtures','86/86 fixtures'],['238 final source inputs','239 final source inputs'],
 ['15 before copies','19 before copies'],['beforeCopies.length===15','beforeCopies.length===19'],
 ["'label-before.json',","'label-before.json','variant-before.json','native-text-only-200-current-20261009-023844-91164.json',"]
]);
