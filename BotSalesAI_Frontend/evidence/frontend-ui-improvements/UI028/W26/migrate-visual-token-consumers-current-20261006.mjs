import fs from 'node:fs';
import path from 'node:path';

const replacements = {
    'apps/web/src/app/CommandRecovery.tsx': [['fontWeight={700}', 'fontWeight={visualSx.typography.fontWeight.bold}', 1]],
    'apps/web/src/modules/catalog/index.tsx': [['fontWeight={650}', 'fontWeight={visualSx.typography.fontWeight.strong}', 1]],
    'apps/web/src/modules/customers/index.tsx': [['fontWeight={650}', 'fontWeight={visualSx.typography.fontWeight.strong}', 3], ['borderRadius: 1', 'borderRadius: visualSx.radius.control', 1]],
    'apps/web/src/modules/dashboard/index.tsx': [
        ['borderRadius: 4', 'borderRadius: visualSx.radius.hero', 1],
        ['letterSpacing: 1.8', 'letterSpacing: visualSx.typography.letterSpacing.dashboardOverline', 1],
        ['fontSize: { xs: 27, md: 36 }', 'fontSize: visualSx.typography.dashboardTitle.fontSize', 1],
        ['fontWeight: 400', 'fontWeight: visualSx.typography.fontWeight.regular', 1],
        ['borderRadius: 2', 'borderRadius: visualSx.radius.dialog', 3],
        ['fontWeight: 650', 'fontWeight: visualSx.typography.fontWeight.strong', 3],
        ['fontWeight={650}', 'fontWeight={visualSx.typography.fontWeight.strong}', 1],
        ["outline: '2px solid'", 'outline: `${tokens.focusRing.width}px solid`', 3],
        ['outlineOffset: 2', 'outlineOffset: tokens.focusRing.controlOffset', 3],
        ['borderRadius: 3', 'borderRadius: visualSx.radius.large', 1],
    ],
    'apps/web/src/modules/finance/index.tsx': [['borderRadius: 1', 'borderRadius: visualSx.radius.control', 1], ['borderRadius: 2', 'borderRadius: visualSx.radius.dialog', 1]],
    'apps/web/src/modules/fulfillment/index.tsx': [['borderRadius: 2', 'borderRadius: visualSx.radius.dialog', 1], ['fontWeight={650}', 'fontWeight={visualSx.typography.fontWeight.strong}', 2]],
    'apps/web/src/modules/inbox/conversation-components.tsx': [['borderRadius: 2.5', 'borderRadius: visualSx.radius.bubble', 1]],
    'apps/web/src/modules/inbox/index.tsx': [['fontWeight={650}', 'fontWeight={visualSx.typography.fontWeight.strong}', 2], ['borderRadius: 3', 'borderRadius: visualSx.radius.large', 1], ['fontSize: 12', 'fontSize: tokens.fontSizes.meta', 1], ['borderRadius: 1', 'borderRadius: visualSx.radius.control', 3]],
    'apps/web/src/modules/inventory/index.tsx': [['fontWeight={650}', 'fontWeight={visualSx.typography.fontWeight.strong}', 1], ['fontWeight={750}', 'fontWeight={visualSx.typography.fontWeight.display}', 1]],
    'apps/web/src/modules/knowledge/index.tsx': [['borderRadius: 2', 'borderRadius: visualSx.radius.dialog', 1], ['fontWeight={700}', 'fontWeight={visualSx.typography.fontWeight.bold}', 1]],
    'apps/web/src/modules/notifications/index.tsx': [['borderRadius: 3', 'borderRadius: visualSx.radius.large', 1], ['fontSize: 44', 'fontSize: tokens.iconSizes.devicePreview', 1]],
    'apps/web/src/modules/operations/index.tsx': [['fontWeight={650}', 'fontWeight={visualSx.typography.fontWeight.strong}', 3], ['borderRadius: 2', 'borderRadius: visualSx.radius.dialog', 1], ['fontWeight={600}', 'fontWeight={visualSx.typography.fontWeight.semibold}', 1]],
    'apps/web/src/modules/orders/index.tsx': [['fontWeight={650}', 'fontWeight={visualSx.typography.fontWeight.strong}', 2]],
    'apps/web/src/modules/procurement/index.tsx': [['fontWeight={650}', 'fontWeight={visualSx.typography.fontWeight.strong}', 4], ['fontWeight={700}', 'fontWeight={visualSx.typography.fontWeight.bold}', 1], ['borderRadius: 2', 'borderRadius: visualSx.radius.dialog', 2]],
    'apps/web/src/modules/reports/index.tsx': [['fontSize={14}', 'fontSize={tokens.fontSizes.body}', 1], ['borderRadius: 1', 'borderRadius: visualSx.radius.control', 1], ['fontWeight: 600', 'fontWeight: visualSx.typography.fontWeight.semibold', 1], ["outline: '2px solid'", 'outline: `${tokens.focusRing.width}px solid`', 1], ['outlineOffset: 2', 'outlineOffset: tokens.focusRing.controlOffset', 1]],
    'apps/web/src/modules/workspace/index.tsx': [['borderRadius: 4', 'borderRadius: visualSx.radius.hero', 1], ['fontWeight={800}', 'fontWeight={visualSx.typography.fontWeight.extraBold}', 1], ['borderRadius: 3', 'borderRadius: visualSx.radius.large', 1], ['borderRadius: 1', 'borderRadius: visualSx.radius.control', 1], ['fontWeight={650}', 'fontWeight={visualSx.typography.fontWeight.strong}', 1]],
    'apps/web/src/shared/ui/components.tsx': [['letterSpacing: 1.3', 'letterSpacing: visualSx.typography.letterSpacing.overline', 1]],
};

const visualImport = "import { visualSx } from '@/shared/ui/visual';";
const root = process.cwd();
const changed = [];
for (const [relative, edits] of Object.entries(replacements)) {
    const full = path.join(root, relative);
    let source = fs.readFileSync(full, 'utf8');
    for (const [before, after, expected] of edits) {
        const actual = source.split(before).length - 1;
        const alreadyApplied = source.split(after).length - 1;
        if (actual === expected) source = source.replaceAll(before, after);
        else if (actual !== 0 || alreadyApplied !== expected) throw new Error(`${relative}: expected ${expected} occurrence(s) of ${JSON.stringify(before)} or its replacement, found ${actual}/${alreadyApplied}`);
    }
    const importLine = relative === 'apps/web/src/shared/ui/components.tsx' ? "import { visualSx } from './visual';" : visualImport;
    if (!source.includes(importLine)) {
        const newline = source.indexOf('\n');
        source = `${source.slice(0, newline + 1)}${importLine}\n${source.slice(newline + 1)}`;
    }
    if (relative === 'apps/web/src/modules/dashboard/index.tsx' || relative === 'apps/web/src/modules/reports/index.tsx' || relative === 'apps/web/src/modules/inbox/index.tsx' || relative === 'apps/web/src/modules/notifications/index.tsx') {
        const importFrom = "import { colors } from '@botsales/tokens';";
        const targetImport = "import { colors, tokens } from '@botsales/tokens';";
        if (source.includes(importFrom)) source = source.replace(importFrom, targetImport);
        else if (!source.includes(targetImport)) throw new Error(`${relative}: expected token import for tokens replacement`);
    }
    fs.writeFileSync(full, source, 'utf8');
    changed.push(relative);
}
process.stdout.write(`Updated ${changed.length} visual-token consumer files:\n${changed.join('\n')}\n`);
