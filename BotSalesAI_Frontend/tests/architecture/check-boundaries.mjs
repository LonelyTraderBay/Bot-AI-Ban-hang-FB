import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const checker = path.join(root, 'scripts/check-boundaries.mjs');
const tempRoot = fs.realpathSync(os.tmpdir());
const work = fs.mkdtempSync(path.join(tempRoot, 'botsales-boundaries-'));
const scenarios = [
    {
        name: 'allowed alias type-only import into shared',
        files: {
            'shared/types.ts': 'export interface SharedType { id: string }\n',
            'modules/catalog/index.ts': "import type { SharedType } from '@/shared/types';\nexport type CatalogType = SharedType;\n",
        },
        pass: true,
    },
    {
        name: 'alias cross-feature import',
        files: {
            'modules/catalog/index.ts': "import { order } from '@/modules/orders';\nexport const catalog = order;\n",
            'modules/orders/index.ts': 'export const order = 1;\n',
        },
        issue: /Cross-feature import/,
    },
    {
        name: 'relative cross-feature import',
        files: {
            'modules/catalog/index.ts': "import { order } from '../orders';\nexport const catalog = order;\n",
            'modules/orders/index.ts': 'export const order = 1;\n',
        },
        issue: /Cross-feature import/,
    },
    {
        name: 'type-only cross-feature import',
        files: {
            'modules/catalog/index.ts': "import type { Order } from '@/modules/orders';\nexport type CatalogOrder = Order;\n",
            'modules/orders/index.ts': 'export interface Order { id: string }\n',
        },
        issue: /Cross-feature import/,
    },
    {
        name: 'dynamic cross-feature import',
        files: {
            'modules/catalog/index.ts': "export const loadOrders = () => import('@/modules/orders');\n",
            'modules/orders/index.ts': 'export const order = 1;\n',
        },
        issue: /Cross-feature import/,
    },
    {
        name: 'unresolved local alias',
        files: { 'modules/catalog/index.ts': "import '@/modules/missing';\n" },
        issue: /Unresolved local import/,
    },
    {
        name: 'module cycle',
        files: {
            'modules/catalog/index.ts': "import { order } from '../orders';\nexport const catalog = order;\n",
            'modules/orders/index.ts': "import { catalog } from '../catalog';\nexport const order = catalog;\n",
        },
        issue: /Import cycle/,
    },
    {
        name: 'unparseable TypeScript file',
        files: { 'modules/catalog/index.ts': 'export const broken = ;\n' },
        issue: /Parse error/,
    },
];

try {
    for (const [index, scenario] of scenarios.entries()) {
        const sourceRoot = path.join(work, `scenario-${index}`, 'src');
        const reportPath = path.join(work, `scenario-${index}`, 'report.json');
        for (const [relative, contents] of Object.entries(scenario.files)) {
            const file = path.join(sourceRoot, relative);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, contents, 'utf8');
        }

        const result = spawnSync(process.execPath, [checker, sourceRoot, reportPath], { cwd: root, encoding: 'utf8' });
        assert.equal(result.error, undefined, `${scenario.name}: ${result.error?.message}`);
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        if (scenario.pass) {
            assert.equal(result.status, 0, `${scenario.name}: ${result.stdout}`);
            assert.equal(report.status, 'PASS', scenario.name);
        } else {
            assert.notEqual(result.status, 0, `${scenario.name} was not rejected`);
            assert.equal(report.status, 'FAIL', scenario.name);
            assert(report.issues.some(issue => scenario.issue.test(issue)), `${scenario.name}: ${report.issues.join('; ')}`);
        }
    }
    console.log(`Boundary fixtures: PASS ${scenarios.length}/${scenarios.length} scenarios (allowed import, alias, relative, type-only, dynamic, unresolved, cycle, parser error).`);
} finally {
    const resolvedWork = fs.realpathSync(work);
    assert(resolvedWork.startsWith(`${tempRoot}${path.sep}`), 'Refusing to remove fixture path outside OS temp directory');
    fs.rmSync(resolvedWork, { recursive: true, force: true });
}
