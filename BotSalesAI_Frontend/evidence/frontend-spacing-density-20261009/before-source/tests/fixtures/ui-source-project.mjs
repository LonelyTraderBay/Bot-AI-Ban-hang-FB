import fs from 'node:fs';
import path from 'node:path';

// Finite project shape for source-gate fixtures; not a production config or API.
export function prepareUiSourceProject(root) {
    fs.mkdirSync(path.join(root, 'apps/web'), { recursive: true });
    fs.mkdirSync(path.join(root, 'apps/web/src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'apps/web/src/scope-entry.ts'), 'export {};');
    fs.writeFileSync(path.join(root, 'apps/web/index.html'), '<!doctype html><html><head></head><body><script type="module" src="/src/scope-entry.ts"></script></body></html>');
    fs.writeFileSync(path.join(root, 'apps/web/vite.config.ts'), `import { fileURLToPath, URL } from 'node:url'; export default { resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), '@botsales/tokens': fileURLToPath(new URL('../../packages/design-tokens/src/index.ts', import.meta.url)) } } };`);
    fs.mkdirSync(path.join(root, 'packages/design-tokens/src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'packages/design-tokens/src/index.ts'), 'export const tokens = {}; export const colors = {};');
    fs.writeFileSync(path.join(root, 'apps/web/tsconfig.json'), JSON.stringify({
        compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', allowJs: true, baseUrl: '.', paths: { '@/*': ['src/*'], '@botsales/tokens': ['../../packages/design-tokens/src/index.ts'] } },
        include: ['src', '../../packages/design-tokens/src'],
    }));
}
