import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root as projectRoot, typescript } from './tools.mjs';
import { hasForbiddenLiteralColor, isModuleSourceFile } from './source-policy.mjs';

function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true })
        .flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}

export function checkSource(targetRoot) {
    const { ts, source } = typescript();
    const issues = [];
    let files = 0;
    let calls = 0;
    const operations = JSON.parse(fs.readFileSync(path.join(targetRoot, 'packages/contracts/src/operations.json'), 'utf8'));
    const permissions = new Set(JSON.parse(fs.readFileSync(path.join(targetRoot, 'packages/contracts/src/permissions.json'), 'utf8')).permissions.map(item => item.id));

    for (const file of walk(path.join(targetRoot, 'apps/web/src')).filter(file => /\.(tsx?|jsx?)$/.test(file))) {
        const text = fs.readFileSync(file, 'utf8');
        const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        const relativeFile = path.relative(targetRoot, file);
        files++;

        for (const diagnostic of tree.parseDiagnostics) {
            issues.push(`${relativeFile}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
        }

        function visit(node) {
            if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
                && ['useApi', 'useCommand', 'request'].includes(node.expression.text)
                && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
                calls++;
                if (!operations[node.arguments[0].text]) issues.push(`Unknown operation ${node.arguments[0].text} in ${relativeFile}`);
            }
            if (ts.isJsxAttribute(node) && node.name.text === 'permission' && node.initializer
                && ts.isStringLiteral(node.initializer) && !permissions.has(node.initializer.text)) {
                issues.push(`Unknown permission ${node.initializer.text} in ${relativeFile}`);
            }
            if (ts.isAsExpression(node) && node.type.kind === ts.SyntaxKind.AnyKeyword) {
                issues.push(`Unsafe as any in ${relativeFile}`);
            }
            ts.forEachChild(node, visit);
        }

        visit(tree);
        if (/@ts-(ignore|nocheck)/.test(text)) issues.push(`Type suppression in ${relativeFile}`);
        if (isModuleSourceFile(targetRoot, file) && hasForbiddenLiteralColor(text)) {
            issues.push(`Literal color outside source tokens in ${relativeFile}`);
        }
    }

    const routes = JSON.parse(fs.readFileSync(path.join(targetRoot, 'packages/contracts/src/routes.json'), 'utf8')).routes;
    const matrix = JSON.parse(fs.readFileSync(path.join(targetRoot, 'docs/route-implementation.json'), 'utf8'));
    for (const route of routes) {
        const match = matrix.find(item => item.routeId === route.id);
        if (!match || match.route !== route.path || !fs.existsSync(path.join(targetRoot, match.source))) {
            issues.push(`Missing source ${route.id}`);
        } else if (!fs.readFileSync(path.join(targetRoot, match.source), 'utf8').includes(`function ${match.component}(`)) {
            issues.push(`Missing exported component ${match.component}`);
        }
    }

    const tokens = JSON.parse(fs.readFileSync(path.join(targetRoot, 'packages/design-tokens/src/tokens.json'), 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(targetRoot, 'apps/web/public/manifest.webmanifest'), 'utf8'));
    if (manifest.background_color !== tokens.colors.canvas || manifest.theme_color !== tokens.colors.canvas) {
        issues.push('Manifest palette drift');
    }

    const report = {
        checkedAt: new Date().toISOString(),
        scope: 'Syntax, operation identifiers, route-source mapping, permissions and token adoption. NOT React typecheck, build or browser test.',
        compiler: ts.version,
        compilerSource: source,
        files,
        operationCalls: calls,
        routes: routes.length,
        issues,
        status: issues.length ? 'FAIL' : 'PASS',
    };
    fs.mkdirSync(path.join(targetRoot, 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(targetRoot, 'evidence/source-check.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    return issues.length ? 1 : 0;
}

function main() {
    const args = process.argv.slice(2);
    const rootArgument = args.indexOf('--root');
    if (rootArgument >= 0 && !args[rootArgument + 1]) throw new Error('Expected a directory path after --root.');
    const targetRoot = rootArgument >= 0 ? path.resolve(args[rootArgument + 1]) : projectRoot;
    process.exitCode = checkSource(targetRoot);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
