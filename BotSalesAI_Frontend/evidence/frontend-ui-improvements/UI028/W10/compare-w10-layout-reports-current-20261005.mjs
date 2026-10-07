import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const directory = path.join(root, 'evidence/frontend-ui-improvements/UI028/W10');
const before = JSON.parse(fs.readFileSync(path.join(directory, 'layout-report-before-source-edit-current-20261005.json'), 'utf8'));
const afterName = process.argv[2] || 'layout-report-after-source-edit-current-20261005.json';
const outputName = process.argv[3] || 'layout-report-delta-current-20261005.json';
const after = JSON.parse(fs.readFileSync(path.join(directory, afterName), 'utf8'));
const normalize = value => String(value).trim().replace(/\s+/g, ' ');
const key = finding => JSON.stringify([finding.file, finding.property, normalize(finding.value), finding.code]);
const tally = findings => {
    const result = new Map();
    for (const finding of findings) result.set(key(finding), (result.get(key(finding)) || 0) + 1);
    return result;
};
const oldCounts = tally(before.findings);
const newCounts = tally(after.findings);
const newFindings = [];
for (const [findingKey, count] of newCounts) {
    const baselineCount = oldCounts.get(findingKey) || 0;
    if (count > baselineCount) newFindings.push({ finding: JSON.parse(findingKey), baseline: baselineCount, after: count });
}
const touchedFiles = ['apps/web/src/modules/catalog/index.tsx', 'apps/web/src/modules/catalog/imports.tsx'];
const touchedFileFindings = after.findings.filter(finding => touchedFiles.includes(finding.file));
const status = newFindings.length === 0 && touchedFileFindings.length === 0 ? 'PASS_NO_NEW_FINDINGS_TOUCHED_FILES_CLEAN' : 'FAIL';
const result = {
    status,
    comparison: 'multiset(file, property, normalized value, code); source line is not part of finding identity',
    before: { file: 'layout-report-before-source-edit-current-20261005.json', total: before.findings.length },
    after: { file: afterName, total: after.findings.length },
    resolved: before.findings.length - after.findings.length,
    newFindings,
    touchedFiles,
    touchedFileFindings,
    unknownStyleSources: after.findings.filter(finding => finding.code === 'UNKNOWN_STYLE_SOURCE').length,
    remainingByCode: after.counts,
};
const outputPath = path.join(directory, outputName);
if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite comparison evidence: ${outputName}`);
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status, before: result.before.total, after: result.after.total, resolved: result.resolved, newFindings: newFindings.length, touchedFileFindings: touchedFileFindings.length, unknownStyleSources: result.unknownStyleSources }));
if (status !== 'PASS_NO_NEW_FINDINGS_TOUCHED_FILES_CLEAN') process.exitCode = 1;
