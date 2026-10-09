import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const output=import.meta.dirname, root=path.resolve(output,'../..');
const baseline=JSON.parse(fs.readFileSync(path.join(output,'baseline.json'),'utf8'));
for (const owner of ['apps/web/src/modules/catalog/index.tsx','tests/ui-component-layout.spec.ts']) {
    const original=path.join(root,owner), copy=path.join(output,'before',owner);
    const digest=crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex');
    if (digest!==baseline.sourceFingerprints['BotSalesAI_Frontend/'+owner]) throw Error('Owner drift: '+owner);
    if (fs.existsSync(copy)) throw Error('Snapshot already exists: '+owner);
    fs.mkdirSync(path.dirname(copy),{recursive:true});fs.copyFileSync(original,copy);
}
fs.appendFileSync(path.join(output,'CONTRACT.md'),'\n### Product variant collapse at native text-only200%\n\nThe complete108 route probes preserve106PASS/2FAIL: R10/R11 at1280 collapse the variant name field to width0. The unwrapped row reserves intrinsic SKU/price/checkbox/delete widths while flex:1 permits the name to shrink to zero. Snapshot catalog editor and owned component-layout suite before edit (19 copies). Use existing FieldGroup wrapping and bounded text-relative geometry at this owner; no global default, schema, business field, dependency or spacing-token change. Add regression on create/edit at320/390/1280/1440, double text, nonzero readable controls, no label overlap/overflow, editable draft and add/remove preservation. Keep native FAIL and rerun108 probes plus final gates.\n');
