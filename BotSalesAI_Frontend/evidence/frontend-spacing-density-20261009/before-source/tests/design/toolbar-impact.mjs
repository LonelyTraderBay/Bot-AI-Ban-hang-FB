import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/** Discover real Toolbar calls and route bindings; fail if a consumer loses its mapping. */
export function toolbarImpact(root) {
    const calls = [];
    const modules = path.join(root, 'apps/web/src/modules');
    const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(file) : /\.tsx$/.test(file) ? [file] : [];
    });
    for (const file of walk(modules)) {
        const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        function visit(node, owner) {
            if (ts.isFunctionDeclaration(node)) owner = node.name?.text;
            if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(source) === 'Toolbar') {
                const operation = node.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(source) === 'operation')?.initializer;
                if (!owner || !operation || !ts.isStringLiteral(operation)) throw new Error(`Unmapped Toolbar: ${file}`);
                calls.push({ file: path.relative(root, file).replaceAll('\\', '/'), owner, operation: operation.text });
            }
            ts.forEachChild(node, child => visit(child, owner));
        }
        visit(source);
    }
    const router = fs.readFileSync(path.join(root, 'apps/web/src/app/router.tsx'), 'utf8');
    const bindings = new Map([...router.matchAll(/^\s+(R\d+): (\w+),$/gm)].map(match => [match[1], match[2]]));
    const manifest = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/route-manifest.json'), 'utf8'));
    const operations = JSON.parse(fs.readFileSync(path.join(root, 'packages/contracts/src/operations.json'), 'utf8'));
    const rows = manifest.routes.flatMap(route => calls.filter(call => bindings.get(route.id) === call.owner).map(call => ({
        ...call, id: route.id, path: route.path.replace(':shopId', 'shop-demo').replace(':conversationId', 'cv1'), title: route.title,
        supportsSearch: operations[call.operation].queryParameters.some(parameter => parameter.name === 'q'),
    })));
    for (const call of calls) if (!rows.some(row => row.owner === call.owner)) throw new Error(`Missing route: ${call.owner}`);
    if (!calls.length || !rows.length) throw new Error('Empty Toolbar impact');
    return { calls, routes: rows };
}
