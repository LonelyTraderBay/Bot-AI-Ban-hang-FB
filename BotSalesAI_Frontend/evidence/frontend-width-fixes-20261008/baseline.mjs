import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const frontend = path.resolve(import.meta.dirname, '../..'), repository = path.dirname(frontend);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative = file => path.relative(repository, file).replaceAll('\\', '/');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(directory, item.name)) : [path.join(directory, item.name)]);
const files = ['apps/web/src', 'apps/web/tests', 'tests', 'scripts', 'packages', 'docs'].flatMap(name => walk(path.join(frontend, name)));
const inputs = files.filter(file => !/[/\\](node_modules|dist|dist-demo|\.vite)[/\\]/.test(file)).concat(['package.json', 'package-lock.json', 'playwright.config.ts', 'playwright.built-demo.config.ts', 'apps/web/vite.config.ts'].map(name => path.join(frontend, name)));
const originalPaths = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: repository, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split('\0').filter(Boolean);
const protectedFiles = ['botsales-kit/execution/plan.json', 'botsales-kit/execution/progress.json', 'BotSalesAI_Frontend/AI_RULES.md', 'botsales-kit/AI_RULES.md', 'AGENTS.md', 'BotSalesAI_Frontend/AGENTS.md', '.github/workflows/frontend.yml'].map(name => path.join(repository, name));
const sources = files.filter(file => file.includes(`${path.sep}apps${path.sep}web${path.sep}src${path.sep}`) && file.endsWith('.tsx'));
const routes = JSON.parse(fs.readFileSync(path.join(frontend, 'packages/contracts/src/routes.json'), 'utf8')).routes;
const detailCalls = [];
for (const file of sources) {
    const text = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (!/import[\s\S]*?\bDetailLine\b[\s\S]*?from ['"].*shared\/ui\/components['"]/.test(text)) continue;
    const module = relative(file).match(/\/modules\/([^/]+)\//)?.[1];
    function visit(node) {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === 'DetailLine') {
            let owner = node.parent;
            while (owner && !(ts.isFunctionDeclaration(owner) && owner.name)) owner = owner.parent;
            detailCalls.push({ path: relative(file), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, owner: owner?.name?.getText(source), module, conservativeRoutes: routes.filter(route => route.module === module).map(route => route.id), expression: node.getText(source).slice(0, 180) });
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
}
const snapshot = ['apps/web/src/modules/integrations/index.tsx', 'apps/web/src/modules/workspace/index.tsx', 'apps/web/src/modules/catalog/imports.tsx', 'apps/web/src/modules/fulfillment/index.tsx', 'apps/web/src/modules/notifications/index.tsx', 'apps/web/src/shared/ui/components.tsx', 'apps/web/src/shared/ui/README.md', 'docs/FRONTEND_SPACING_STANDARD.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'apps/web/tests/shared-ui-render-contract.test.tsx'];
for (const name of snapshot) { const destination = path.join(import.meta.dirname, 'before', name); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(path.join(frontend, name), destination); }
const record = { capturedAt: new Date().toISOString(), HEAD: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(), gitStatus: execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: repository, encoding: 'utf8' }), originalPaths, sourceFingerprints: Object.fromEntries(inputs.map(file => [relative(file), hash(file)])), protectedFingerprints: Object.fromEntries(protectedFiles.filter(fs.existsSync).map(file => [relative(file), hash(file)])), detailCalls, impactScope: 'All DetailLine consumer modules and all 54 routes for final small/large smoke; conditional DetailLine cases additionally covered by unit and full browser suite.', baselineGeometry: '../frontend-width-root-cause-20261008/measurements.json' };
fs.writeFileSync(path.join(import.meta.dirname, 'baseline.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ HEAD: record.HEAD, inputs: inputs.length, existingPaths: originalPaths.length, detailCalls: detailCalls.length, affectedModules: [...new Set(detailCalls.map(row => row.module))] }));
