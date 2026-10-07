import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'apps/web/src/modules/bot/index.tsx');
const expectedBefore = 'eef8de0b707ebd5e556b17f9595e56b73a381a7cdb1986ab7c24a471ab66b0ec';
const hash = value => createHash('sha256').update(value).digest('hex');
const before = fs.readFileSync(sourcePath, 'utf8');
if (hash(before) !== expectedBefore) throw new Error(`W18 source changed since first migration pass: ${hash(before)}`);

let updated = before;
const remainingFieldStacks = '<Stack gap={2}>';
const remainingCount = updated.split(remainingFieldStacks).length - 1;
if (remainingCount !== 4) throw new Error(`Expected four remaining form gaps, found ${remainingCount}`);
updated = updated.replaceAll(remainingFieldStacks, '<Stack sx={layoutSx.form.fieldGap}>');

const conditionalStack = '<Stack sx={[layoutSx.form.fieldGap, ...(config.data ? [layoutSx.surface.sectionBefore] : [])]}>';
if (updated.split(conditionalStack).length - 1 !== 1) throw new Error('Expected one unresolved conditional semantic style array');
updated = updated.replace(conditionalStack, '<Stack sx={[layoutSx.form.fieldGap, layoutSx.surface.sectionBefore]}>');

fs.writeFileSync(sourcePath, updated, 'utf8');
console.log(JSON.stringify({
    task: 'UI028.W18',
    correctivePass: true,
    reason: 'The initial patch verified five identical stacks but String.replace changed only the first; report mode also rejected a conditional sx spread as unresolved.',
    sourcePath,
    beforeSha256: hash(before),
    afterSha256: hash(updated),
    repeatedFormStacksMigrated: remainingCount,
    conditionalSxResolvedToClosedRoles: true,
}));
