import fs from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';
const records=[];
for(const file of ['apps/web/src/modules/notifications/index.tsx','apps/web/src/modules/operations/index.tsx']) {
    const source=fs.readFileSync(file,'utf8');
    const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const edits=[];
    const visit=node=>{
        if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(sf)==='Stack') {
            const sx=node.openingElement.attributes.properties.find(attr=>ts.isJsxAttribute(attr)&&attr.name.getText(sf)==='sx'&&attr.initializer?.getText(sf)==='{layoutSx.grid.gutter}');
            if(sx) {
                edits.push({start:node.openingElement.tagName.getStart(sf),end:node.openingElement.tagName.end,text:'PageSections'},{start:node.closingElement.tagName.getStart(sf),end:node.closingElement.tagName.end,text:'PageSections'},{start:sx.getStart(sf),end:sx.end,text:''});
            }
        }
        ts.forEachChild(node,visit);
    };visit(sf);
    if(edits.length!==3)throw new Error(`Expected one section flow in ${file}`);
    let after=source;
    for(const edit of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,edit.start)+edit.text+after.slice(edit.end);
    if(!/import\s*\{[^}]*\bPageSections\b[^}]*\}\s*from\s*['"][^'"]*\/composition['"]/.test(after)) after="import { PageSections } from '../../shared/ui/composition';\n"+after;
    fs.writeFileSync(file,after);
    const hash=text=>createHash('sha256').update(text).digest('hex');
    records.push({file,count:1,components:['PageSections'],beforeSha256:hash(source),afterSha256:hash(after),reason:'Two flex flows reused grid.gutter at24px. Move to section flow owner preserving direction and gap; no column grid behavior invented.'});
}
fs.writeFileSync('evidence/frontend-ui-improvements/shared-composition-20261006/supplemental-migration-manifest.json',JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify(records));
