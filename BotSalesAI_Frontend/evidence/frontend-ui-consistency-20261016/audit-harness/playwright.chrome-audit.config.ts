import { defineConfig,devices } from '@playwright/test';
import path from 'node:path';
import audit from './playwright.ui-audit.config';
const output=process.env.UI_AUDIT_OUTPUT_DIR!;
export default defineConfig(audit,{
 testMatch:['**/ui-composition-layout.spec.ts','**/ui-density-layout.spec.ts','**/ui-component-layout.spec.ts','**/ui-query-state-layout.spec.ts','**/ui028-w29-reflow.spec.ts','**/accessibility/routes.spec.ts','**/ui-consistency-chrome-audit.spec.ts','**/ui-consistency-geometry-probe.spec.ts'],
 outputDir:path.join(output,'chrome-results'),use:{baseURL:'http://127.0.0.1:5198'},
 projects:[{name:'chrome',use:{...devices['Desktop Chrome'],channel:'chrome'}}],
 reporter:[['list'],['json',{outputFile:path.join(output,'chrome-playwright.json')}]]
});
