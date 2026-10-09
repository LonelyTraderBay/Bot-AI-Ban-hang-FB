import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { auditAppDesignSource } from '../scripts/check-visual-tokens.mjs';
import { prepareUiSourceProject } from './fixtures/ui-source-project.mjs';

function temporaryRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-visual-token-'));
    prepareUiSourceProject(root);
    fs.mkdirSync(path.join(root, 'apps/web/src/app'), { recursive: true });
    fs.writeFileSync(path.join(root, 'apps/web/src/app/fixture.tsx'), 'export {};');
    return root;
}

test('visual checker accepts canonical theme roles, token references, geometry and semantic responsive props', () => {
    const root = temporaryRoot();
    const source = `
import { tokens, colors } from '@botsales/tokens';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
const styles = { color: colors.accent, fontSize: tokens.fontSizes.body, borderRadius: tokens.radius.card / tokens.radius.control, boxShadow: 'none', outline: \`\${tokens.focusRing.width}px solid \${colors.accent}\` };
const Styled = styled('div')({ color: colors.accent, borderRadius: tokens.radius.card / tokens.radius.control });
export function Fixture() { return <><Box sx={[styles, { color: 'text.secondary', width: { xs: 320, md: 400 }, height: 'auto', backgroundColor: 'primary.main' }]} /><TextField slotProps={{ input: { sx: { color: colors.accent } }, inputLabel: { shrink: true } }} /><Styled /></>; }
`;
    fs.writeFileSync(path.join(root, 'apps/web/src/app/fixture.tsx'), source);
    const report = auditAppDesignSource({ root, fixtures: [{ path: 'apps/web/src/app/variables.css', content: '.x{outline:var(--focus-ring-width) solid var(--color-accent);font-family:var(--font-family);border-radius:var(--radius-control);}' }] });
    assert.equal(report.files, 4); // Fixture, HTML entry, Vite config and token source.
    assert.equal(report.status, 'PASS');
    assert.equal(report.findings.length, 0);
    fs.rmSync(root, { recursive: true, force: true });
});

test('visual checker rejects raw literals across sx, JSX system props and CSS declarations', () => {
    const root = temporaryRoot();
    const report = auditAppDesignSource({
        root,
        fixtures: [
            { path: 'apps/web/src/app/raw.tsx', content: `<> <Box sx={{ color: '#abc', fontSize: 14, borderRadius: 2, boxShadow: '0 2px 3px #000', outline: '2px solid #fff', '@media (max-width: 768px)': { color: '#fff' } }} /><Typography fontWeight={700} />{styled('div')({ fontSize: 13 })}</>` },
            { path: 'apps/web/src/app/raw.css', content: `.x { color: #fff; font-size: 14px; border-radius: 8px; box-shadow: 0 2px 4px #000; outline: 2px solid #fff; } @media (max-width: 768px) { .x { color: red; } }` },
        ],
    });
    assert.equal(report.status, 'FAIL');
    assert.equal(report.counts.byCategory.palette, 4);
    assert.equal(report.counts.byCategory.typography, 4);
    assert.equal(report.counts.byCategory.radius, 2);
    assert.equal(report.counts.byCategory.elevation, 2);
    assert.equal(report.counts.byCategory.focus, 2);
    assert.equal(report.counts.byCategory.breakpoint, 2);
    fs.rmSync(root, { recursive: true, force: true });
});

test('visual checker follows local style aliases and callback themes, but fails raw nested values', () => {
    const root = temporaryRoot();
    const report = auditAppDesignSource({
        root,
        fixtures: [{
            path: 'apps/web/src/app/alias.tsx',
            content: `import { tokens } from '@botsales/tokens'; const local = { fontSize: 15 }; const themeStyles = (theme) => ({ color: theme.palette.primary.main, fontSize: 12 }); export function Fixture(){ return <><Box sx={local} /><Box sx={themeStyles} /></>; }`,
        }],
    });
    assert.equal(report.counts.byCategory.typography, 2);
    assert.ok(report.findings.every(item => item.code === 'RAW_VISUAL_LITERAL'));
    fs.rmSync(root, { recursive: true, force: true });
});

test('visual checker reports unresolved spreads and malformed style sources as UNKNOWN or parse errors', () => {
    const root = temporaryRoot();
    const report = auditAppDesignSource({
        root,
        fixtures: [
            { path: 'apps/web/src/app/unknown.tsx', content: `<Box sx={{ ...runtimeStyle }} />` },
            { path: 'apps/web/src/app/broken.tsx', content: `<Box sx={{ color: 'primary.main' }}` },
            { path: 'apps/web/src/app/broken.css', content: `.x { color: ;` },
        ],
    });
    assert.equal(report.counts.byCode.UNKNOWN_VISUAL_SOURCE, 1);
    assert.equal(report.counts.byCode.PARSE_ERROR, 2);
    fs.rmSync(root, { recursive: true, force: true });
});

test('visual checker includes newly added TSX files under the source root', () => {
    const root = temporaryRoot();
    fs.mkdirSync(path.join(root, 'apps/web/src/modules/new-feature'), { recursive: true });
    fs.writeFileSync(path.join(root, 'apps/web/src/modules/new-feature/index.tsx'), `<Box sx={{ borderRadius: 3 }} />`);
    fs.writeFileSync(path.join(root, 'apps/web/src/app/tokens.css'), ':root { --color-accent: #fff; }');
    fs.writeFileSync(path.join(root, 'README.md'), 'color: #fff');
    const report = auditAppDesignSource({ root });
    assert.equal(report.files, 5); // Fixture, HTML entry, feature, Vite config and token source.
    assert.ok(report.scannedFiles.includes('apps/web/src/modules/new-feature/index.tsx'));
    assert.equal(report.counts.byCategory.radius, 1);
    assert.deepEqual(report.generatedExcluded, ['apps/web/src/app/tokens.css']);
    fs.rmSync(root, { recursive: true, force: true });
});
