import fs from 'node:fs';
import path from 'node:path';
const directory = import.meta.dirname, file = name => path.join(directory, name);
let source = fs.readFileSync(file('finalize-current.mjs'), 'utf8')
    .replace('const stages=[[', "const stages=[['composer-stability',/\\b6 passed \\(/,'6/6 composer keyboard/body/footer stability cases, three repeats in each engine'],[");
fs.writeFileSync(file('finalize-current.mjs'), source);
source = fs.readFileSync(file('revalidate-checkpoints.mjs'), 'utf8')
    .replace("record('imports-clearance-regression');", "record('composer-stability'); assert(/\\b6 passed \\(/.test(logs['composer-stability']),'Three composer repeats in each engine required'); record('imports-clearance-regression');");
fs.writeFileSync(file('revalidate-checkpoints.mjs'), source);
source = fs.readFileSync(file('write-handoff-docs.mjs'), 'utf8')
    .replace("['imports-clearance-regression','generate'", "['composer-stability','imports-clearance-regression','generate'")
    .replace('| Regression sở hữu |', '| Composer stability | 6/6, ba lần mỗi engine; body cuộn riêng/action giữ vùng riêng, bounds trước Tab/hit-testing/Shift+Tab giữ nháp. |\n| Regression sở hữu |');
fs.writeFileSync(file('write-handoff-docs.mjs'), source);
