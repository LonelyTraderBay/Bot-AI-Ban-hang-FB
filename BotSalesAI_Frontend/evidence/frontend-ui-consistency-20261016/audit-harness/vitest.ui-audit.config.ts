import path from 'node:path';
import {defineConfig} from 'vitest/config';
import base from './apps/web/vitest.config';
const output=process.env.UI_AUDIT_OUTPUT_DIR!;
export default defineConfig({...base,cacheDir:path.join(output,'vitest-cache'),test:{...base.test,cache:false,fsModuleCache:false,fileParallelism:false,attachmentsDir:path.join(output,'vitest-attachments'),reporters:['default','json'],outputFile:{json:path.join(output,'vitest.json')}}});
