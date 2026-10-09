import fs from 'node:fs';
import path from 'node:path';

export const isScriptSource = file => /\.(?:[cm]?[jt]s|[jt]sx)$/i.test(file);

// Shared discovery invariant for the three source gates. Import/asset closure is
// a separate check; this list must never turn a missing or empty app into PASS.
export function uiSourceFiles(root) {
    const directory = path.join(root, 'apps/web/src');
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) throw new Error(`UI_SOURCE_SCOPE: missing source directory ${directory}`);
    const walk = current => fs.readdirSync(current, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(current, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`UI_SOURCE_SCOPE: source symlink requires explicit ownership resolution: ${file}`);
        return entry.isDirectory() ? walk(file) : [file];
    });
    const files = walk(directory).filter(file => isScriptSource(file) || /\.css$/i.test(file)).sort();
    if (!files.some(file => isScriptSource(file) && !/\.d\.[cm]?ts$/i.test(file))) throw new Error(`UI_SOURCE_SCOPE: no application script source in ${directory}`);
    return files;
}
