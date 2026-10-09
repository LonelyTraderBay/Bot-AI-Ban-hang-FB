import fs from 'node:fs';
import ts from 'typescript';
const rows = JSON.parse(fs.readFileSync(new URL('./value-impact.json', import.meta.url)));
const files = [...new Set(rows.filter(row => row.name === 'Amount' && row.outsideTable).map(row => row.file))];
let changed = 0;
for (const file of files) {
    let source = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true), edits = [];
    const visit = node => {
        if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'Amount') {
            let inColumn = false;
            for (let parent = node.parent; parent; parent = parent.parent) if (ts.isPropertyAssignment(parent) && parent.name.getText(ast) === 'render') inColumn = true;
            if (!inColumn) {
                if (node.attributes.properties.some(prop => prop.name?.getText(ast) === 'wrap')) throw new Error('Consumer already migrated: ' + file);
                edits.push(node.tagName.end);
            }
        }
        ts.forEachChild(node, visit);
    }; visit(ast);
    for (const offset of edits.sort((a, b) => b - a)) source = source.slice(0, offset) + ' wrap' + source.slice(offset);
    fs.writeFileSync(file, source); changed += edits.length;
}
if (changed !== 21) throw new Error('Unexpected consumer count ' + changed);
console.log('Migrated 21 outside-table Amount consumers; 27 table consumers retain nowrap.');
