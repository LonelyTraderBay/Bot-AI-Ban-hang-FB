import fs from 'node:fs';
import path from 'node:path';
const frontend = path.resolve(import.meta.dirname, '../..');
const namespace = 'evidence/frontend-shared-consolidation-20261009';
for (const filename of ['revalidate-checkpoints.mjs', 'revalidate-canonical.mjs', 'register-current-commands.mjs']) {
    const target = path.join(import.meta.dirname, filename);
    if (fs.existsSync(target)) throw new Error('Inspect existing helper before replacing: ' + filename);
    let code = fs.readFileSync(path.join(frontend, 'evidence/frontend-width-fixes-20261008', filename), 'utf8');
    code = code.replaceAll('evidence/frontend-width-fixes-20261008', namespace).replaceAll('20261008', '20261009');
    code = code.replaceAll("'width-'", "'shared-'").replaceAll("'width-dependencies'", "'shared-dependencies'").replaceAll("'width-setup'", "'shared-setup'").replaceAll("'width-clean-install'", "'shared-clean-install'");
    code = code.replaceAll('W01–W04', 'Shared Inbox/Dashboard').replaceAll('WIDTH', 'SHARED');
    code = code.replaceAll('600-case', 'discovered full-case').replaceAll('full600', 'full-discovered');
    code = code.replaceAll('/\\b600 passed \\(/', '/\\b\\d+ passed \\(/').replaceAll('browser: 600', 'browser: fullBrowserCount');
    code = code.replaceAll('built-width-review.json', 'built-shared-review.json').replaceAll('review-built-width.mjs', 'review-built-shared.mjs');
    code = code.replaceAll('builtWidth.details.length === 50', 'builtWidth.details.length === 30').replaceAll('50 focused', '30 focused');
    if (filename === 'revalidate-checkpoints.mjs') {
        code = code.replace("record('e2e'); record('verify'); record('unit'); record('source-maps'); record('built-demo');", "record('e2e'); record('verify'); record('unit'); record('source-maps'); record('built-demo');\nconst fullBrowserCount = Number(logs.e2e.match(/\\b(\\d+) passed \\(/)?.[1]);\nassert(fullBrowserCount > 0 && logs.e2e.split('\\n').filter(line => /^\\s*ok\\s+\\d+/.test(line)).length === fullBrowserCount, 'Full browser discovery/executions mismatch');");
        code = code.replace("const ownerProof = [...new Set(ownerFiles)].map(browserCases);", "if (['FE006','FE008','FE025','FE028'].includes(taskId)) ownerFiles.push('tests/ui-dashboard-layout.spec.ts');\nif (['FE006','FE016','FE025','FE028'].includes(taskId)) ownerFiles.push('tests/ui-toolbar-layout.spec.ts');\nconst ownerProof = [...new Set(ownerFiles)].map(browserCases);");
        code = code.replace(/const nativeProofCounts = \{[\s\S]*?\n\};\nconst nativeProofFiles/, "const nativeProofCounts = read(path.join(import.meta.dirname, 'native-current.json')).proofCounts;\nconst nativeProofFiles");
        code = code.replace("Current shared and artifact dependencies also pass.", "Current shared and artifact dependencies also pass; native review is scoped to the affected R04/R05/R06 profiles.");
    }
    fs.writeFileSync(target, code);
}
let built = fs.readFileSync(path.join(frontend, 'evidence/frontend-width-fixes-20261008/review-built-width.mjs'), 'utf8');
built = built.replaceAll('built-width-review.json', 'built-shared-review.json');
built = built.replace("['R13','R30','R33','R40','R42']", "['R04','R05','R06']").replace('[320,768,1279,1280,1920]', '[320,390,768,1280,1440]');
const start = built.indexOf("    if(id==='R30')"), end = built.indexOf('    const violations=', start);
if (start < 0 || end < 0) throw new Error('Compiled reviewer structure changed');
built = built.slice(0, start) + `    if(id==='R04'){const primary=page.getByRole('link',{name:'Xem việc cần làm',exact:true});expect(await primary.count()).toBe(1);expect(await primary.getAttribute('href')).toBe('/s/shop-demo/operations');expect((await primary.boundingBox()).height).toBeGreaterThanOrEqual(44);}
    if(id==='R05'||id==='R06'){const filters=page.getByRole('group',{name:'Bộ lọc hội thoại',exact:true});expect(await filters.getAttribute('data-ui-composition')).toBe('field-group');if(id==='R06'&&width<1280)await expect(filters).toBeHidden();else{await expect(filters).toBeVisible();const group=await filters.evaluate(element=>{const form=element.parentElement.querySelector('form'),r=element.getBoundingClientRect(),f=form.getBoundingClientRect();return {outside:!element.closest('form'),left:r.left,right:r.right,formLeft:f.left,formRight:f.right,padding:getComputedStyle(element).paddingLeft};});expect(group.outside).toBe(true);expect(group.padding).toBe('0px');expect(group.left).toBeCloseTo(group.formLeft,0);expect(group.right).toBeCloseTo(group.formRight,0);}}
` + built.slice(end);
built = built.replaceAll('expect(details).toHaveLength(50)', 'expect(details).toHaveLength(30)').replaceAll('five routes x five widths', 'R04/R05/R06 x five widths');
fs.writeFileSync(path.join(import.meta.dirname, 'review-built-shared.mjs'), built);
console.log('Prepared criterion evaluator and compiled all-route reviewer from existing owners.');
