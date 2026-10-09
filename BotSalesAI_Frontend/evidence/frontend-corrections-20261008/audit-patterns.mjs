import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
const root = path.resolve(import.meta.dirname, '../..');
const directory = path.join(root, 'apps/web/src/modules');
const modules = fs.readdirSync(directory).filter(name => fs.statSync(path.join(directory, name)).isDirectory());
const records = [];
for (const module of modules) {
    for (const name of fs.readdirSync(path.join(directory, module)).filter(name => /\.(tsx?|mjs)$/.test(name))) {
        const relative = `apps/web/src/modules/${module}/${name}`, text = fs.readFileSync(path.join(root, relative), 'utf8');
        const source = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true, name.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        const matches = [];
        const visit = node => {
            if (ts.isCallExpression(node) && /(?:useEffect|useVersionedDraft|\.reset)$/.test(node.expression.getText(source)))
                matches.push({ line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, kind: node.expression.getText(source), text: node.getText(source) });
            ts.forEachChild(node, visit);
        };
        visit(source);
        records.push({ module, path: relative, sha256: crypto.createHash('sha256').update(text).digest('hex'), matches });
    }
}
fs.writeFileSync(path.join(import.meta.dirname, 'patterns-current.json'), JSON.stringify({ modules, records }, null, 2) + '\n');
for (const record of records) for (const item of record.matches) if (item.kind === 'useEffect') console.log(`${record.path}:${item.line}\n${item.text}\n`);
console.log(`Inventory: ${modules.length} modules, ${records.length} files`);
