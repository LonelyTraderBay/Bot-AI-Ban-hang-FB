import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-ui-source-scope-'));
let sequence = 0;
after(() => {
    assert.ok(path.resolve(temporary).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`));
    fs.rmSync(temporary, { recursive: true, force: true });
});
function fixture(kind) {
    const root = path.join(temporary, String(++sequence));
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.copyFileSync('scripts/layout-exceptions.schema.json', path.join(root, 'scripts/layout-exceptions.schema.json'));
    fs.writeFileSync(path.join(root, 'scripts/layout-exceptions.json'), JSON.stringify({ version: 1, exceptions: [] }));
    if (kind !== 'missing') {
        fs.mkdirSync(path.join(root, 'apps/web/src/modules'), { recursive: true });
        fs.mkdirSync(path.join(root, 'apps/web/src/app'), { recursive: true });
    }
    if (kind === 'generated-only') fs.writeFileSync(path.join(root, 'apps/web/src/app/tokens.css'), ':root { --space-md: 12px; }');
    if (kind === 'jsx-parse') fs.writeFileSync(path.join(root, 'apps/web/src/app/new.jsx'), 'export function Screen() { return <div>');
    return root;
}
for (const gate of ['check-layout', 'check-visual-tokens', 'check-ui-composition']) {
    for (const kind of ['missing', 'empty', 'generated-only', 'jsx-parse']) {
        test(`${gate} rejects ${kind} source instead of returning an empty PASS`, () => {
            const root = fixture(kind);
            const script = path.resolve(`scripts/${gate}.mjs`);
            const result = spawnSync(process.execPath, [script, '--json'], { cwd: root, encoding: 'utf8', windowsHide: true });
            assert.equal(result.error, undefined);
            assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
            if (kind === 'jsx-parse') {
                const report = JSON.parse(result.stdout);
                assert.equal(report.files, 1);
                assert.equal(report.status, 'FAIL');
                assert.match(result.stdout, /parse/i);
            } else assert.match(`${result.stdout}\n${result.stderr}`, /source|ENOENT|scope/i);
        });
    }
}
