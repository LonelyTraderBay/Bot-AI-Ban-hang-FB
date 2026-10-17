import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(evidenceDir, '../../..');
assert.equal(process.cwd(), frontendRoot, 'Run from BotSalesAI_Frontend.');
const label = process.argv[2] || 'before';
assert.match(label, /^[a-z0-9-]+$/, 'Evidence label must be a lowercase identifier.');
const read = relative => readFile(path.join(frontendRoot, relative), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const [canonicalRaw, generatedCss, themeSource, shellSource, bootstrapSource] = await Promise.all([
    readFile(path.resolve(frontendRoot, '../botsales-kit/design/tokens.json'), 'utf8'),
    read('apps/web/src/app/tokens.css'),
    read('apps/web/src/shared/ui/theme.ts'),
    read('apps/web/src/app/Shell.tsx'),
    read('apps/web/src/app/bootstrap.css'),
]);
const canonical = JSON.parse(canonicalRaw);
const server = await createServer({
    configFile: path.join(frontendRoot, 'apps/web/vite.config.ts'),
    mode: 'test',
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
});

try {
    const { theme } = await server.ssrLoadModule('/apps/web/src/shared/ui/theme.ts');
    const auditModule = await import(pathToFileURL(path.join(frontendRoot, 'scripts/check-visual-tokens.mjs')));
    const checker = auditModule.auditAppDesignSource({ root: frontendRoot, fixtures: [
        { path: 'apps/web/src/app/__uic05_raw_zindex_probe.tsx', content: '<Box sx={{ zIndex: 9999 }} />' },
        { path: 'apps/web/src/app/__uic05_raw_zindex_probe.css', content: '.probe { z-index: 9999; }' },
    ] });
    const probeFindings = checker.findings.filter(finding => finding.file.includes('__uic05_raw_zindex_probe'));
    const observed = {
        muiZIndex: Object.fromEntries(['mobileStepper', 'fab', 'speedDial', 'appBar', 'drawer', 'modal', 'snackbar', 'tooltip'].map(key => [key, theme.zIndex[key]])),
        generatedZIndexVariables: [...generatedCss.matchAll(/--z-index-[\w-]+:[^;]+;/g)].map(match => match[0]),
        sourceLiterals: {
            shellStickyHeader: /zIndex\s*:\s*1100\b/.test(shellSource),
            skipLink9999: /\.skip-link\{[^}]*z-index:9999\b/.test(bootstrapSource),
            explicitThemeZIndexMap: /\bzIndex\s*:\s*\{/.test(themeSource),
        },
        rawZIndexCheckerProbe: { status: checker.status, findings: probeFindings },
    };
    const hashes = {
        canonicalTokens: sha256(canonicalRaw),
        generatedCss: sha256(generatedCss),
        theme: sha256(themeSource),
        shell: sha256(shellSource),
        bootstrap: sha256(bootstrapSource),
    };
    const result = {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        revision: process.env.GITHUB_SHA || null,
        canonicalTokenVersion: canonical.version,
        expected: { zIndex: canonical.zIndex, muiZIndex: {
            mobileStepper: canonical.zIndex.dropdown,
            fab: canonical.zIndex.dropdown,
            speedDial: canonical.zIndex.dropdown,
            appBar: canonical.zIndex.sticky,
            drawer: canonical.zIndex.drawer,
            modal: canonical.zIndex.modal,
            snackbar: canonical.zIndex.toast,
            tooltip: canonical.zIndex.tooltip,
        } },
        observed,
        hashes,
        interpretation: observed.rawZIndexCheckerProbe.findings.length === 0
            ? 'Raw TSX/CSS z-index values are not enforced by the current visual-token checker.'
            : 'The visual-token checker reports raw TSX/CSS z-index values.'
            + (!observed.sourceLiterals.explicitThemeZIndexMap ? ' Theme z-index currently relies on MUI defaults.' : ''),
    };
    const output = path.join(evidenceDir, `theme-layers-${label}.json`);
    await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ output, expected: result.expected, observed, hashes }, null, 2));
}
finally {
    await server.close();
}
