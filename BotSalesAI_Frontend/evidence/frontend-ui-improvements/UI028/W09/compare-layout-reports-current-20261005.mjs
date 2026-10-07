import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const directory = path.join(root, 'evidence/frontend-ui-improvements/UI028/W09');
const beforePath = path.join(directory, 'layout-report-before-source-edit-current-20261005.json');
const afterName = process.argv[2] || 'layout-report-after-source-edit-final-current-20261005.json';
const outputName = process.argv[3] || 'layout-report-delta-current-20261005.json';
const afterPath = path.join(directory, afterName);
const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
const after = JSON.parse(fs.readFileSync(afterPath, 'utf8'));
const normalize = value => String(value).trim().replace(/\s+/g, ' ');
const key = finding => JSON.stringify([finding.file, finding.property, normalize(finding.value), finding.code]);
const counts = findings => {
    const result = new Map();
    for (const finding of findings) result.set(key(finding), (result.get(key(finding)) || 0) + 1);
    return result;
};
const oldCounts = counts(before.findings);
const newCounts = counts(after.findings);
const regressions = [];
for (const [findingKey, count] of newCounts) {
    const previous = oldCounts.get(findingKey) || 0;
    if (count > previous) regressions.push({ finding: JSON.parse(findingKey), baseline: previous, after: count });
}
const touchedFiles = [
    'apps/web/src/app/Shell.tsx', 'apps/web/src/app/router.tsx', 'apps/web/src/app/ScopeEvents.tsx',
    'apps/web/src/app/CommandRecovery.tsx', 'apps/web/src/app/feedback.tsx',
];
const remainingTouched = after.findings.filter(finding => touchedFiles.includes(finding.file));
const result = {
    status: regressions.length === 0 && remainingTouched.length === 0 ? 'PASS_NO_NEW_FINDINGS_TOUCHED_FILES_CLEAN' : 'FAIL',
    comparison: 'multiset(file, property, normalizedValue, code); source line is deliberately excluded',
    before: { file: path.basename(beforePath), count: before.findings.length },
    after: { file: path.basename(afterPath), count: after.findings.length },
    resolved: before.findings.length - after.findings.length,
    newFindings: regressions,
    touchedFiles,
    touchedFileFindings: remainingTouched,
    globalDebtRemains: after.findings.length,
    unknownStyleSources: after.findings.filter(finding => finding.code === 'UNKNOWN_STYLE_SOURCE').length,
};
const outputPath = path.join(directory, outputName);
if (fs.existsSync(outputPath)) throw new Error('Refusing to overwrite layout report delta.');
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, before: result.before.count, after: result.after.count, resolved: result.resolved, newFindings: regressions.length, touchedFindings: remainingTouched.length, unknownStyleSources: result.unknownStyleSources }));
if (result.status !== 'PASS_NO_NEW_FINDINGS_TOUCHED_FILES_CLEAN') process.exitCode = 1;
