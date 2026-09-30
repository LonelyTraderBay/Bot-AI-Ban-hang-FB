import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export default defineConfig(({ mode }) => {
  const repoRoot=fileURLToPath(new URL('../../',import.meta.url));
  const env = loadEnv(mode, repoRoot, '');
  const mocks = mode === 'demo';
  if (mode === 'production' && env.VITE_ENABLE_MOCKS === 'true') {
    throw new Error('Production không được bật mô phỏng. Dùng build:demo cho bản review.');
  }
  return {
    envDir: repoRoot,
    plugins: [react(),{name:'exclude-mock-worker-from-live',writeBundle(options){if(mocks)return;const file=join(options.dir||'dist','mockServiceWorker.js');if(existsSync(file))unlinkSync(file);}}],
    resolve: { alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@botsales/contracts': fileURLToPath(new URL('../../packages/contracts/src/index.ts', import.meta.url)),
      '@botsales/tokens': fileURLToPath(new URL('../../packages/design-tokens/src/index.ts', import.meta.url)),
    } },
    define: { __MOCK__: JSON.stringify(mocks) },
    server: { port: 5173, strictPort: true,
      proxy: mocks ? undefined : { '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:3000', changeOrigin: false } } },
    preview: { port: 4173, strictPort: true },
    build: { sourcemap: false, rollupOptions: { output: {
      manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], mui: ['@mui/material', '@emotion/react', '@emotion/styled'] }
    } } },
  };
});
