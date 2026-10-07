import fs from 'node:fs';

const file = 'apps/web/src/app/Shell.tsx';
let source = fs.readFileSync(file, 'utf8');
const replacements = [
    ["<Box sx={{ width: 38, height: 38, bgcolor: 'primary.main', color: colors.onAccent, borderRadius: 2, display: 'grid', placeItems: 'center' }}>", "<Box sx={[layoutSx.navigation.brandMarkShape, { width: 38, height: 38, bgcolor: 'primary.main', color: colors.onAccent, display: 'grid', placeItems: 'center' }]}>"] ,
    ["<Typography variant=\"h6\" sx={{ fontWeight: 800 }}>BotSales", "<Typography variant=\"h6\">BotSales"],
    ["sx={[layoutSx.navigation.itemInsetBlock, layoutSx.navigation.itemGap, {\n        borderRadius: 1.5,", "sx={[layoutSx.navigation.itemInsetBlock, layoutSx.navigation.itemGap, layoutSx.navigation.itemShape, {"] ,
];
for (const [before, after] of replacements) {
    const occurrences = source.split(before).length - 1;
    if (occurrences !== 1) throw new Error(`Expected one occurrence, got ${occurrences}: ${before}`);
    source = source.replace(before, after);
}
fs.writeFileSync(file, source);
console.log('Replaced shell-local radius/font styling with canonical theme roles.');
