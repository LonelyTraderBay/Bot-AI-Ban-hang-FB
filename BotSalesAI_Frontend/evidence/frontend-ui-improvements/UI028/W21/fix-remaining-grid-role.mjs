import fs from 'node:fs';
import { createHash } from 'node:crypto';

const file = 'apps/web/src/modules/operations/index.tsx';
const expected = '5565e02ed2e24a2813b64d6bcef71233c104294b80055dd3aa2ff872af78f5a3';
const bytes = fs.readFileSync(file);
const hash = value => createHash('sha256').update(value).digest('hex');
if (hash(bytes) !== expected) throw new Error('W21 follow-up baseline changed; refusing to apply the remaining grid role.');
const before = "<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: 3 }}>";
const after = "<Box sx={[layoutSx.grid.gutter, { display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' } }]}>";
let source = bytes.toString('utf8');
const count = source.split(before).length - 1;
if (count !== 1) throw new Error(`Expected one Operations digest grid, found ${count}.`);
source = source.replace(before, after);
fs.writeFileSync(file, source, 'utf8');
const evidence = { task: 'UI028.W21', reason: 'The first strict after-scan found one remaining Operations grid gap literal; this exact-hash follow-up replaces it with the existing shared grid gutter.', beforeSha256: expected, afterSha256: hash(fs.readFileSync(file)), replacementCount: 1 };
console.log(JSON.stringify(evidence));
