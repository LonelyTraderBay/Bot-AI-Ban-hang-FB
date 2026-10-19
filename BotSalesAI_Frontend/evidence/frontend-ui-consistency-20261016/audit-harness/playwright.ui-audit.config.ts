import { defineConfig } from '@playwright/test';
import path from 'node:path';
import base from './playwright.config';
const output=process.env.UI_AUDIT_OUTPUT_DIR!;
export default defineConfig(base,{
 testMatch:['**/ui-composition-layout.spec.ts','**/ui-density-layout.spec.ts','**/ui-component-layout.spec.ts','**/ui-query-state-layout.spec.ts','**/ui028-w29-reflow.spec.ts','**/accessibility/routes.spec.ts','**/ui-consistency-audit.spec.ts'],
 workers:2,outputDir:path.join(output,'playwright-results'),
 use:{baseURL:'http://127.0.0.1:5197',screenshot:'only-on-failure'},
 reporter:[['list'],['json',{outputFile:path.join(output,'playwright.json')}]]
});
