import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const frontend = path.resolve(import.meta.dirname, '../..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const proofCounts = {}, proofs = [];
for (const [prefix, count] of [['actual-browser-zoom-200-current-', 7], ['native-text-only-200-current-', 9]]) {
    const candidates = fs.readdirSync(import.meta.dirname).filter(file => file.startsWith(prefix) && file.endsWith('.json'))
        .map(file => ({ file, value: JSON.parse(fs.readFileSync(path.join(import.meta.dirname, file), 'utf8')) })).sort((a, b) => Date.parse(b.value.recordedAt) - Date.parse(a.value.recordedAt));
    const current = candidates.find(({ value }) => value.result === 'PASS' && (prefix.startsWith('native-text') ? value.routeLabelProbes?.length === 108 && value.routeLabelProbes.every(row=>row.result==='PASS') : true) && value.scenarios.length === count && value.scenarios.every(row => row.result === 'PASS')
        && Object.entries(value.sourceSha256).every(([file, digest]) => hash(path.resolve(frontend, file)) === digest));
    if (!current) throw new Error('No complete fresh native proof: ' + prefix);
    const relative = path.relative(frontend, path.join(import.meta.dirname, current.file)).replaceAll('\\', '/');
    proofCounts[relative] = count;
    const recovered = current.value.scenarios.flatMap(row => row.textOnly200?.recoverableEllipsis || []);
    if (prefix.startsWith('native-text') && !recovered.length) throw new Error('Missing actual SPC-051 recovery verification');
    for (const row of recovered) {
        const list = row.method === 'Native Enter on list link; exact full value rendered in conversation detail' && row.recoveryHref;
        const select = row.method === 'Native Enter on MUI select; exact selected full value in listbox; Escape preserves value and focus'
            && row.selectId && row.fullValue.selected === 'true' && row.retained?.text === row.text.trim() && row.retained.focused && row.retained.expanded === 'false';
        if (row.fullValue.clipped || row.text.trim() !== row.fullValue.text || (!list && !select)) throw new Error('Invalid ellipsis recovery');
    }
    proofs.push({ routeLabelProbes: current.value.routeLabelProbes?.length || 0, path: relative, sha256: hash(path.join(frontend, relative)), scenarios: count, recoverableEllipsis: recovered.length, method: current.value.method });
}
fs.writeFileSync(path.join(import.meta.dirname, 'native-current.json'), JSON.stringify({ capturedAt: new Date().toISOString(), status: 'PASS', routeLabelProbeCount: proofs.reduce((sum,row)=>sum+row.routeLabelProbes,0), proofCounts, proofs, limits: 'Sixteen deep Inbox/dashboard/products/AI/category-dialog/reading profiles plus108 default route label/reflow probes on54 routes at390/1280. Zero-label states do not prove unrendered input fields; dialogs and other business states are covered only by their separately executed owner suites. Separate native browser/text methods; no CSS substitution, screen-reader speech or broad human conformance claim.' }, null, 2) + '\n');
console.log(JSON.stringify({ native: proofs.map(row => row.scenarios), recoveredEllipsis: proofs.map(row => row.recoverableEllipsis) }));
