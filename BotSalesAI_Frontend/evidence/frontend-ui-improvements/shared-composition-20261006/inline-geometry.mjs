import fs from 'node:fs';
const file = 'apps/web/src/shared/ui/composition.tsx';
let source = fs.readFileSync(file, 'utf8');
const geometry = "{ width: geometry?.width, minWidth: geometry?.minWidth, maxWidth: geometry?.maxWidth, height: geometry?.height, minHeight: geometry?.minHeight, flex: geometry?.flex, gridColumn: geometry?.gridColumn }";
source = source.replace(/\/\/ Geometry is deliberately closed:[\s\S]*?\n}\n\n/, '// Geometry forwarding is explicit for the static source gates; spacing stays at named owners.\n\n');
source = source.replaceAll('geometrySx(geometry)', geometry);
fs.writeFileSync(file, source);
console.log('Geometry mapping remains closed and statically inspectable, without checker suppression.');
