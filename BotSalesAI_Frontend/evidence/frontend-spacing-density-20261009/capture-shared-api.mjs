import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root = path.resolve(import.meta.dirname, '../..'), directory = 'apps/web/src/shared/ui';
const config = ts.readConfigFile(path.join(root, 'apps/web/tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.join(root, 'apps/web'));
const program = ts.createProgram(parsed.fileNames, parsed.options), checker = program.getTypeChecker();
const owners = new Map();
for (const file of fs.readdirSync(path.join(root, directory)).filter(name => name.endsWith('.tsx'))) {
    const source = program.getSourceFile(path.join(root, directory, file));
    for (const symbol of checker.getExportsOfModule(source.symbol)) {
        const declaration = symbol.valueDeclaration;
        if (declaration && ts.isFunctionDeclaration(declaration)) owners.set(symbol, { name: symbol.name, path: `${directory}/${file}`, line: source.getLineAndCharacterOfPosition(declaration.getStart()).line + 1, uses: 0, consumers: new Set() });
    }
}
for (const source of program.getSourceFiles().filter(source => source.fileName.replaceAll('\\', '/').includes('/apps/web/src/'))) {
    const visit = node => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            const local = checker.getSymbolAtLocation(node.tagName), symbol = local && (local.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(local) : local), owner = owners.get(symbol);
            const relative = path.relative(root, source.fileName).replaceAll('\\', '/');
            if (owner && relative !== owner.path) { owner.uses++; owner.consumers.add(relative); }
        }
        ts.forEachChild(node, visit);
    }; visit(source);
}
const catalogPath = path.join(root, directory, 'README.md');
let catalog = fs.readFileSync(catalogPath, 'utf8');
for (const owner of owners.values()) {
    const row = new RegExp(`^\\| ${owner.name} /[^\\n]+$`, 'm');
    if (!row.test(catalog)) throw new Error(`Undocumented API: ${owner.name}`);
    catalog = catalog.replace(row, text => text.replace(/\/\d+ \|/, `/${owner.line} |`).replace(/\b\d+ uses\b/g, `${owner.uses} uses`));
}
fs.writeFileSync(catalogPath, catalog.trimEnd() + '\n');
fs.writeFileSync(path.join(import.meta.dirname, 'shared-api-current.json'), JSON.stringify({ apis: [...owners.values()].map(row => ({ ...row, consumers: [...row.consumers] })) }, null, 2) + '\n');
console.log(`Catalog lines/counts reconciled: ${owners.size} APIs`);
