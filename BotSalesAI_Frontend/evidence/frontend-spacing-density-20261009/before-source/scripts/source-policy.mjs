import path from 'node:path';

export function isModuleSourceFile(root, file) {
    const isWindowsPath = /^[a-z]:[\\/]/i.test(root) || /^[a-z]:[\\/]/i.test(file)
        || root.startsWith('\\\\') || file.startsWith('\\\\');
    const pathApi = isWindowsPath ? path.win32 : path.posix;
    const relativePath = pathApi.relative(pathApi.resolve(root), pathApi.resolve(file));
    return relativePath.replace(/\\/g, '/').startsWith('apps/web/src/modules/');
}

export function hasForbiddenLiteralColor(source) {
    return /#[0-9a-fA-F]{6}(?![0-9a-fA-F])/.test(source);
}
