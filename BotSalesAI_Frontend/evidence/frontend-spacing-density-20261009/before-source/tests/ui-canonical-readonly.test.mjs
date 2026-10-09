import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { typescript } from '../scripts/tools.mjs';

const { ts } = typescript();
const root = process.cwd();
const configPath = path.join(root, 'apps/web/tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(config.error, undefined);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
assert.deepEqual(parsed.errors, []);

function diagnostics(source) {
    const file = path.join(root, 'apps/web/src/__readonly_type_probe__.ts');
    const host = ts.createCompilerHost(parsed.options);
    const original = host.getSourceFile;
    host.getSourceFile = (name, languageVersion, ...args) => path.resolve(name) === file ? ts.createSourceFile(name, source, languageVersion, true) : original(name, languageVersion, ...args);
    const program = ts.createProgram([file], parsed.options, host);
    return ts.getPreEmitDiagnostics(program).filter(item => item.file && path.resolve(item.file.fileName) === file);
}
test('public layout mapping cannot be written through a direct consumer reference', () => {
    const errors = diagnostics('import { layoutSx } from "@/shared/ui/layout"; layoutSx.form.fieldGap.gap = 99;');
    assert.ok(errors.some(error => error.code === 2540), errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
});
test('public layout nested aliases remain readonly', () => {
    const errors = diagnostics('import { layoutSx } from "@/shared/ui/layout"; const fields = layoutSx.form.fieldGap; fields.gap = 99;');
    assert.ok(errors.some(error => error.code === 2540));
});
test('public visual mapping already rejects consumer writes', () => {
    const errors = diagnostics('import { visualSx } from "@/shared/ui/visual"; visualSx.radius.control = 99;');
    assert.ok(errors.some(error => error.code === 2540));
});
test('canonical readonly style maps remain readable by consumers', () => {
    assert.deepEqual(diagnostics('import { layoutSx } from "@/shared/ui/layout"; import { visualSx } from "@/shared/ui/visual"; const styles = [layoutSx.form.fieldGap, { borderRadius: visualSx.radius.control }]; void styles;'), []);
});
test('canonical token space cannot be overwritten through an alias', () => {
    const errors = diagnostics('import { tokens } from "@botsales/tokens"; const space = tokens.space; space.sm = 99;');
    assert.ok(errors.some(error => error.code === 2540));
});
test('public color export cannot be overwritten', () => {
    const errors = diagnostics('import { colors } from "@botsales/tokens"; colors.accent = "red";');
    assert.ok(errors.some(error => error.code === 2540));
});
test('readonly token and color reads retain their public types', () => {
    assert.deepEqual(diagnostics('import { tokens, colors } from "@botsales/tokens"; const space: number = tokens.space.sm; const palette: typeof tokens.colors = colors; void space; void palette;'), []);
});
