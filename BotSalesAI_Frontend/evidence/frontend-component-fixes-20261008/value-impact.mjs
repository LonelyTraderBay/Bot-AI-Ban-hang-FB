import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const directory = 'apps/web/src/modules';
const files = fs.readdirSync(directory, { recursive: true }).filter(file => file.endsWith('.tsx'));
const result = [];
for (const relative of files) {
    const file = path.join(directory, relative), source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = node => {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ['Amount', 'Status'].includes(node.tagName.getText(source))) {
            const ancestors = [];
            for (let parent = node.parent; parent; parent = parent.parent) {
                if (ts.isJsxElement(parent)) ancestors.push(parent.openingElement.tagName.getText(source));
                if (ts.isPropertyAssignment(parent)) ancestors.push('property:' + parent.name.getText(source));
                if (ts.isFunctionDeclaration(parent)) { ancestors.push('function:' + parent.name?.text); break; }
            }
            result.push({ name: node.tagName.getText(source), file: file.replaceAll('\\', '/'), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, text: node.getText(source), ancestors, outsideTable: !ancestors.includes('property:render') });
        }
        ts.forEachChild(node, visit);
    }; visit(source);
}
fs.writeFileSync(path.join(import.meta.dirname, 'value-impact.json'), JSON.stringify(result, null, 2) + '\n');
console.log(result.filter(row => row.name === 'Amount' && row.outsideTable));
