import fs from 'node:fs';
import path from 'node:path';
const directory = import.meta.dirname;
for (const name of ['review-final-scope.mjs', 'finalize-current.mjs']) {
    const file = path.join(directory, name);
    let source = fs.readFileSync(file, 'utf8')
        .replaceAll('beforeCopies.length===20', 'beforeCopies.length===22')
        .replace('scope;20 before copies', 'scope;22 before copies');
    if (name === 'review-final-scope.mjs') source = source.replace("'tests/ui-toolbar-layout.spec.ts'", "'tests/ui-catalog-layout.spec.ts','tests/ui-shell-layout.spec.ts','tests/ui-toolbar-layout.spec.ts'");
    if (name === 'finalize-current.mjs') source = source
        .replace('const stages=[[', "const stages=[['imports-clearance-regression',/\\b2 passed \\(/,'2/2 strict 24px field/label boundary and 4px label-control spacing'],[")
        .replace("'composer-readable-before.json',", "'composer-readable-before.json','full-attempt-05-latest.json','imports-clearance-before.json',")
        .replace('Eleven additional owner snapshots', 'Thirteen additional owner snapshots');
    fs.writeFileSync(file, source);
}
const runner = path.join(directory, 'run-checks.mjs');
fs.writeFileSync(runner, fs.readFileSync(runner, 'utf8')
    .replace('const commands = {', "const commands = {\n    'ui-layout-regression': ['node_modules/@playwright/test/cli.js', 'test', ...fs.readdirSync(path.join(root, 'tests')).filter(f => /^ui.*\\.spec\\.ts$/.test(f)).sort().map(f => 'tests/' + f), '--reporter=line'],")
    .replace('const preserve = [', "const preserve = ['ui-layout-regression',"));
const checkpoint = path.join(directory, 'revalidate-checkpoints.mjs');
fs.writeFileSync(checkpoint, fs.readFileSync(checkpoint, 'utf8')
    .replace("record('e2e');", "record('imports-clearance-regression'); record('e2e');")
    .replace("assert(/\\b2 passed \\(/.test(logs['composer-regression'])", "assert(/\\b2 passed \\(/.test(logs['imports-clearance-regression']),'Strict 24px field/label boundary regression required');\nassert(/\\b2 passed \\(/.test(logs['composer-regression'])"));
const docs = path.join(directory, 'write-handoff-docs.mjs');
fs.writeFileSync(docs, fs.readFileSync(docs, 'utf8')
    .replace("['generate','verify'", "['imports-clearance-regression','generate','verify'")
    .replace('| Bổ sung — R10/R11 |', '| Bổ sung — Imports spacing test | Test cũ đo control24px/label12–18px theo floating label | Giữ boundary field và label24px, gap label→control4px, không transform; kiểm lại cả hai engine, không hạ ngưỡng. |\n| Bổ sung — R10/R11 |')
    .replace('## Lịch sử attempt và giới hạn', '## Lịch sử attempt và giới hạn\n\nFull attempt05 dừng có kiểm soát sau case186 FAIL vì test clearance theo nhãn floating cũ; trace ghi field/label24px, control45.25px. [Before2FAIL](imports-clearance-before.json) và [after2PASS](imports-clearance-regression-latest.json) giữ riêng; test mới kiểm boundary24px + label height + gap4px và normal-flow invariants, không tăng tolerance hoặc bỏ kiểm reflow. [Full raw record](full-attempt-05-latest.json).'));
fs.appendFileSync(path.join(directory, 'CONTRACT.md'), '\nImports legacy geometry contract correction: full attempt05 case186 measured label clearance24px and input clearance45.25px. Normal-flow labels now own their measured height plus4px internal gap. Preserve the strict24px field/label boundary, zero label offset,4px label/input gap, no transform, static position and806px reflow. Both-engine before2FAIL retained; final passing proof required. No runtime geometry changed for this test correction.\n');
fs.appendFileSync(path.join(directory, 'ANALOGOUS_PATTERNS.md'), '\n- EDIT_VERIFY: Imports regression still measured floating-label offsets. Actual label/field boundary remains24px; assert field24px, label24px, label→input4px, static/no-transform and no overflow. Keep the minimum clearance across every Shell route, remove obsolete floated wording. Raw before2FAIL and full attempt05 remain historical failures.\n');
