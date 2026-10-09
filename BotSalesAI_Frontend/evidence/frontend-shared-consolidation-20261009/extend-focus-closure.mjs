import fs from 'node:fs';
import path from 'node:path';
const dir=import.meta.dirname;
function edit(name,changes){const file=path.join(dir,name);let source=fs.readFileSync(file,'utf8');for(const [from,to]of changes){if(!source.includes(from))throw Error(name+': missing '+from);source=source.replaceAll(from,to);}fs.writeFileSync(file,source);}
edit('run-checks.mjs',[
 ["const commands = {","const commands = {\n    'label-focus-regression': ['node_modules/@playwright/test/cli.js', 'test', 'tests/ui-component-layout.spec.ts', '--grep', 'outlined labels focus', '--reporter=line'],"],
 ["'label-regression','variant-regression'","'label-regression','variant-regression','label-focus-regression'"]
]);
edit('revalidate-checkpoints.mjs',[["record('variant-regression');","record('variant-regression'); record('label-focus-regression');\nassert(/\\b2 passed \\(/.test(logs['label-focus-regression']),'Both-engine empty/populated label focus regression required');"]]);
edit('write-handoff-docs.mjs',[
 ["'label-regression','variant-regression'","'label-regression','variant-regression','label-focus-regression'"],
 ['năm test mới cũng đạt','các test mới cũng đạt'],
 ['không transform/notch. Toolbar','không transform/notch; pointer-events:auto giữ click-label focus khi ô rỗng hoặc có giá trị. Toolbar'],
 ['sửa wrap/minimum theo chữ tại editor;', 'sửa wrap/minimum theo chữ tại editor; click nhãn rỗng còn được kiểm và sửa tại Shared theme;'],
 ['7 affected native scenarios;','7 deep native scenarios/108 all-route label probes;'],
 ['native scenarios cho R04/R05/R06,13','native scenarios cho R04/R05/R06 và108 all-route label probes (54 routes×390/1280),13']
]);
edit('finalize-current.mjs',[
 ["const stages=[[","const stages=[['label-focus-regression',/\\b2 passed \\(/,'2/2 empty/populated input and textarea label-focus regression'],["],
 ['Six additional owner snapshots','Ten additional owner snapshots'],
 ['and shared outlined label flow;','and shared outlined label flow/label focus and product variant row collapse;'],
 ["'variant-before.json',","'variant-before.json','label-focus-before.json',"]
]);
fs.appendFileSync(path.join(dir,'CONTRACT.md'),'\n### Empty outlined label click focus\n\nActual Chromium mouse probe on products/new confirms pointerEvents:none on unshrunk normal-flow label, and label click fails to focus associated input. MUI retains its old overlay assumption. Correct outlined pointer events at theme owner and verify both empty/populated input and textarea clicks, real focus and retained values. Existing baseline snapshots theme/test are retained; add red/green owner case in component-layout. Pre-focus full verify/cold/native runs remain historical and all final gates must rerun.\n');
