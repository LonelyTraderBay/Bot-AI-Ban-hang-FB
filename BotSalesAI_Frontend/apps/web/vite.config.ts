import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { isolatedViteCacheDir } from '../../scripts/vite-cache.mjs';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const completeDemoAssets: Plugin = {
  name: 'complete-demo-assets',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      const destination = request.headers['sec-fetch-dest'];
      if (request.method === 'GET' && (destination === 'script' || destination === 'style')) {
        // MSW passthrough can expose a bodyless 304 to module loading in Firefox.
        delete request.headers['if-none-match'];
        delete request.headers['if-modified-since'];
      }
      next();
    });
  },
};

export default defineConfig(({ mode }) => {
  const repoRoot=fileURLToPath(new URL('../../',import.meta.url));
  const env = loadEnv(mode, repoRoot, '');
  const cacheDir = process.env.BOTSALES_VITE_CACHE_DIR
    || isolatedViteCacheDir(repoRoot, 'direct-vite', String(process.pid));
  const mocks = mode === 'demo';
  if (mode === 'production' && env.VITE_ENABLE_MOCKS === 'true') {
    throw new Error('Production không được bật mô phỏng. Dùng build:demo cho bản review.');
  }
  return {
    envDir: repoRoot,
    cacheDir,
    plugins: [react(),...(mocks ? [completeDemoAssets] : []),{name:'exclude-mock-worker-from-live',writeBundle(options){if(mocks)return;const file=join(options.dir||'dist','mockServiceWorker.js');if(existsSync(file))unlinkSync(file);}}],
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
      manualChunks(id) {
        const modulePath = id.replace(/\\/g, '/');
        if (modulePath.includes('/packages/contracts/src/')) return 'contract-data';
        if ([
          '/node_modules/react/',
          '/node_modules/react-dom/',
          '/node_modules/react-router/',
          '/node_modules/react-router-dom/',
          '/node_modules/scheduler/',
          '/node_modules/@remix-run/router/',
        ].some(packagePath => modulePath.includes(packagePath))) return 'react-runtime';
        if (modulePath.includes('/node_modules/@mui/') || modulePath.includes('/node_modules/@emotion/')) return 'mui';
        if (modulePath.includes('/node_modules/@tanstack/')) return 'query';
        if (modulePath.includes('/node_modules/i18next/') || modulePath.includes('/node_modules/react-i18next/')) return 'i18n';
        if ([
          '/node_modules/ajv/',
          '/node_modules/ajv-formats/',
          '/node_modules/fast-uri/',
        ].some(packagePath => modulePath.includes(packagePath))) return 'schema-validation';
        if ([
          '/node_modules/recharts/',
          '/node_modules/d3-',
          '/node_modules/@reduxjs/toolkit/',
          '/node_modules/immer/',
          '/node_modules/eventemitter3/',
        ].some(packagePath => modulePath.includes(packagePath))) return 'charts';
      },
    } } },
  };
});
