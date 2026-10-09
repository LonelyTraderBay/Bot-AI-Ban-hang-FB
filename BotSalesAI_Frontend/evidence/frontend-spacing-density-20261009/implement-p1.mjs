import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const edits=[];
function edit(file,replacements){let source=fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n');for(const [before,after]of replacements){if(!source.includes(before))throw Error('Missing exact baseline '+file+': '+before);source=source.replace(before,after);}edits.push([file,source]);}
edit('apps/web/src/shared/ui/layout.ts',[
 ['detail: { rowInsetBlock: LayoutSx;', 'detail: { dividedListGap: LayoutSx; rowInsetBlock: LayoutSx;'],
 ['detail: {\n        rowInsetBlock: { py: factor.md },\n        valueGap: { gap: factor.lg },','detail: {\n        dividedListGap: { gap: factor.zero },\n        rowInsetBlock: { py: factor.sm },\n        valueGap: { gap: factor.md },'],
 ['`${cssPixel(tokens.space.md)} ${cssPixel(tokens.space.lg)}`','`${cssPixel(tokens.space.sm)} ${cssPixel(tokens.space.md)}`'],
]);
edit('apps/web/src/shared/ui/composition.tsx',[
 ["export function SurfaceContent({ bodyMode = 'flush', beforeGap", "export function SurfaceContent({ bodyMode = 'flush', rhythm = 'content', beforeGap"],
 ["bodyMode?: 'flush' | 'inset' | 'insetDivider' | 'compactOutlined' | 'compactControlOutlined';", "bodyMode?: 'flush' | 'inset' | 'insetDivider' | 'compactOutlined' | 'compactControlOutlined';\n    rhythm?: 'content' | 'dividedRows';"],
 ['data-ui-composition="surface-content" sx={[layoutSx.surface.contentGap,', 'data-ui-composition="surface-content" data-ui-rhythm={rhythm} sx={[rhythm === \'dividedRows\' ? layoutSx.detail.dividedListGap : layoutSx.surface.contentGap,'],
]);
edit('apps/web/src/modules/integrations/index.tsx',[[ '<SurfaceContent beforeGap="surface" afterGap="notice">{Object.entries(c.capabilities)', '<SurfaceContent rhythm="dividedRows" beforeGap="surface" afterGap="notice">{Object.entries(c.capabilities)' ]]);
edit('scripts/check-ui-composition.mjs',[
 ["'surface.contentGap': 'SurfaceContent',", "'surface.contentGap': 'SurfaceContent',\n    'detail.dividedListGap': 'SurfaceContent',"],
 ["SurfaceContent: { beforeGap:", "SurfaceContent: { rhythm: new Set(['content', 'dividedRows']), beforeGap:"],
 ["SurfaceContent: new Set([...flowKeys, 'bodyMode', 'beforeGap'", "SurfaceContent: new Set([...flowKeys, 'bodyMode', 'rhythm', 'beforeGap'"],
]);
for(const [file,source]of edits)fs.writeFileSync(path.join(root,file),source);
console.log('P1 implemented table inset and atomic divided rows at shared owners.');
