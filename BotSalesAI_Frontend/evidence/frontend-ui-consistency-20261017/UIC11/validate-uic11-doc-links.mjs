import fs from 'node:fs';
import path from 'node:path';

const frontendRoot = process.cwd();
const repoRoot = path.resolve(frontendRoot, '..');
const evidenceRoot = path.resolve(frontendRoot, 'evidence/frontend-ui-consistency-20261017/UIC11');
const reportPath = path.join(evidenceRoot, 'doc-link-validation.json');
const documents = [
    'README.md',
    'botsales-kit/IMPLEMENTATION_PLAN.md',
    'botsales-kit/execution/FRONTEND_PROGRESS.md',
    'BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md',
    'BotSalesAI_Frontend/docs/FRONTEND_SPACING_STANDARD.md',
    'BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
    'BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md',
    'BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md',
    'BotSalesAI_Frontend/evidence/REPORT.md',
    'BotSalesAI_Frontend/apps/web/src/shared/ui/README.md',
    ...Array.from({ length: 11 }, (_, index) => `BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC${String(index + 1).padStart(2, '0')}/REPORT.md`),
];

function anchorSet(markdown) {
    const anchors = new Set();
    const duplicateCounts = new Map();
    for (const match of markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
        const heading = match[1].replace(/<[^>]*>/g, '').replace(/`([^`]*)`/g, '$1').toLowerCase();
        const base = heading.normalize('NFC').replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');
        if (!base) continue;
        const duplicate = duplicateCounts.get(base) ?? 0;
        duplicateCounts.set(base, duplicate + 1);
        anchors.add(duplicate === 0 ? base : `${base}-${duplicate}`);
    }
    for (const match of markdown.matchAll(/\bid\s*=\s*["']([^"']+)["']|<a\s+[^>]*name\s*=\s*["']([^"']+)["']/gi)) {
        anchors.add((match[1] ?? match[2]).toLowerCase());
    }
    return anchors;
}

const checked = [];
const missing = [];
for (const relativeDoc of documents) {
    const fullDoc = path.resolve(repoRoot, relativeDoc);
    if (!fs.existsSync(fullDoc) || !fs.statSync(fullDoc).isFile()) {
        missing.push({ source: relativeDoc, target: relativeDoc, kind: 'DOCUMENT_MISSING' });
        continue;
    }
    const markdown = fs.readFileSync(fullDoc, 'utf8');
    const anchorsByPath = new Map([[fullDoc, anchorSet(markdown)]]);
    let localLinks = 0;
    let checkedAnchors = 0;
    for (const link of markdown.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
        let destination = link[1].trim();
        if (destination.startsWith('<') && destination.includes('>')) destination = destination.slice(1, destination.indexOf('>'));
        else destination = destination.split(/\s+/, 1)[0];
        destination = destination.replace(/\\([()])/g, '$1');
        if (!destination || /^[a-z][a-z0-9+.-]*:/i.test(destination) || destination.startsWith('//')) continue;
        let decoded;
        try { decoded = decodeURIComponent(destination); }
        catch { missing.push({ source: relativeDoc, target: destination, kind: 'INVALID_URL_ENCODING' }); continue; }
        const hashIndex = decoded.indexOf('#');
        const queryIndex = decoded.indexOf('?');
        const cutIndex = [hashIndex, queryIndex].filter((index) => index >= 0).reduce((a, b) => Math.min(a, b), decoded.length);
        const filePart = decoded.slice(0, cutIndex);
        const fragment = hashIndex >= 0 ? decoded.slice(hashIndex + 1, queryIndex > hashIndex ? queryIndex : decoded.length).toLowerCase() : '';
        const targetPath = !filePart ? fullDoc : filePart.startsWith('/') ? path.resolve(repoRoot, `.${filePart}`) : path.resolve(path.dirname(fullDoc), filePart);
        localLinks++;
        if (!fs.existsSync(targetPath)) {
            missing.push({ source: relativeDoc, target: destination, kind: 'FILE_MISSING' });
            continue;
        }
        if (fragment) {
            if (!fs.statSync(targetPath).isFile()) {
                missing.push({ source: relativeDoc, target: destination, kind: 'ANCHOR_TARGET_NOT_FILE' });
                continue;
            }
            if (!anchorsByPath.has(targetPath)) anchorsByPath.set(targetPath, anchorSet(fs.readFileSync(targetPath, 'utf8')));
            checkedAnchors++;
            if (!anchorsByPath.get(targetPath).has(fragment)) missing.push({ source: relativeDoc, target: destination, kind: 'ANCHOR_MISSING' });
        }
    }
    checked.push({ document: relativeDoc, localLinks, anchorsChecked: checkedAnchors });
}

const report = {
    schemaVersion: '1.0',
    task: 'UIC11',
    capturedAt: new Date().toISOString(),
    documents: checked,
    summary: {
        documentsExpected: documents.length,
        documentsChecked: checked.length,
        localLinksChecked: checked.reduce((sum, item) => sum + item.localLinks, 0),
        anchorsChecked: checked.reduce((sum, item) => sum + item.anchorsChecked, 0),
        brokenLinks: missing.length,
    },
    missing,
};
fs.mkdirSync(evidenceRoot, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report.summary, null, 2));
if (missing.length || checked.length !== documents.length) process.exitCode = 1;
