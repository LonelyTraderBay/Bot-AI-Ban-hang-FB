import fs from 'node:fs';
import path from 'node:path';
const directory = import.meta.dirname;
const file = name => path.join(directory, name);
let source = fs.readFileSync(file('finalize-current.mjs'), 'utf8');
source = source.replace('const stages=[[', "const stages=[['ui-layout-regression',/\\b240 passed \\(/,'240/240 complete UI preflight Chromium/Firefox, independently retained from full E2E'],[")
    .replace("['label-before.json','variant-before.json','label-focus-before.json']", "['label-before.json','variant-before.json','label-focus-before.json','imports-clearance-before.json']")
    .replace("capture(prefix+'full-attempt-01-composition-trace/original-trace.zip');", "capture(prefix+'full-attempt-01-composition-trace/original-trace.zip');\ncapture(prefix+'imports-clearance-before-trace/original-trace.zip');");
fs.writeFileSync(file('finalize-current.mjs'), source);
source = fs.readFileSync(file('revalidate-checkpoints.mjs'), 'utf8')
    .replace("record('imports-clearance-regression');", "record('ui-layout-regression'); assert(/\\b240 passed \\(/.test(logs['ui-layout-regression']),'Complete 240-case UI preflight required'); record('imports-clearance-regression');");
fs.writeFileSync(file('revalidate-checkpoints.mjs'), source);
source = fs.readFileSync(file('write-handoff-docs.mjs'), 'utf8')
    .replace("['imports-clearance-regression','generate'", "['ui-layout-regression','imports-clearance-regression','generate'")
    .replace('| UI contracts/layout |', '| UI preflight | 240/240 Chromium/Firefox trước full, gồm Imports strict24px/4px; count riêng, không cộng để đóng full. |\n| UI contracts/layout |');
fs.writeFileSync(file('write-handoff-docs.mjs'), source);
