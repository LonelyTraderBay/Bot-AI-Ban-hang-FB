import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
const frontend = path.resolve(import.meta.dirname, '../..');
const repository = path.dirname(frontend);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const prior = JSON.parse(fs.readFileSync(path.join(frontend, 'evidence/frontend-component-fixes-20261008/S19-current-evidence.json'), 'utf8'));
const build = JSON.parse(fs.readFileSync(path.join(frontend, 'evidence/frontend-component-fixes-20261008/clean-artifacts-components-20261008.json'), 'utf8'));
const proofRuntime = Object.entries(prior.sourceFingerprints).filter(([name]) => name.startsWith('BotSalesAI_Frontend/apps/web/src/') || name.startsWith('BotSalesAI_Frontend/packages/contracts/src/'));
const runtimeDrift = proofRuntime.filter(([name, expected]) => sha(path.join(repository, name)) !== expected).map(([name]) => name);
const buildDrift = build.artifacts.demoRepeat.files.filter(file => sha(path.join(frontend, 'apps/web/dist-demo', file.path)) !== file.sha256).map(file => file.path);
const extraGrids = [];
for (const [name] of proofRuntime.filter(([name]) => name.includes('/modules/') && name.endsWith('.tsx'))) {
    const file = path.join(repository, name), source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
            const opening = ts.isJsxElement(node) ? node.openingElement : node;
            const tag = opening.tagName.getText(source);
            if (tag === 'Stats' || (tag === 'Box' && opening.attributes.getText(source).includes('gridTemplateColumns'))) {
                let parent = node.parent;
                while (parent && !ts.isFunctionDeclaration(parent)) parent = parent.parent;
                extraGrids.push({ path: name, owner: parent?.name?.getText(source), line: source.getLineAndCharacterOfPosition(opening.getStart(source)).line + 1, component: tag, opening: opening.getText(source), directChildren: ts.isJsxElement(node) ? node.children.filter(child => !ts.isJsxText(child) || child.text.trim()).map(child => child.getText(source).slice(0, 130)) : [] });
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
}
const record = { status: runtimeDrift.length || buildDrift.length ? 'DRIFT' : 'MATCH_PREVIOUS_FINAL_SOURCE_AND_DEMO', recordedAt: new Date().toISOString(), priorRuntimeFingerprintsCompared: proofRuntime.length, priorBuildFilesCompared: build.artifacts.demoRepeat.files.length, runtimeDrift, buildDrift, extraGrids, references: [ 'BotSalesAI_Frontend/evidence/frontend-component-fixes-20261008/S19-current-evidence.json', 'BotSalesAI_Frontend/evidence/frontend-component-fixes-20261008/clean-artifacts-components-20261008.json' ], diagnosticScriptSha256: sha(import.meta.filename) };
fs.writeFileSync(path.join(import.meta.dirname, 'provenance.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ status: record.status, runtimeFiles: proofRuntime.length, demoFiles: build.artifacts.demoRepeat.files.length, extraGrids: extraGrids.length, runtimeDrift, buildDrift }));
if (runtimeDrift.length || buildDrift.length) process.exitCode = 1;
