import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig({plugins:[react()],define:{__MOCK__:true},resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'@botsales/contracts':fileURLToPath(new URL('../../packages/contracts/src/index.ts',import.meta.url)),'@botsales/tokens':fileURLToPath(new URL('../../packages/design-tokens/src/index.ts',import.meta.url))}},test:{environment:'jsdom',include:['apps/web/tests/**/*.test.{ts,tsx}'],setupFiles:['apps/web/tests/setup.ts'],restoreMocks:true}});
