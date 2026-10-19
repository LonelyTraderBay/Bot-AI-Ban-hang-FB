import {defineConfig} from '@playwright/test';
import path from 'node:path';
import base from './playwright.chrome-audit.config';
const output=process.env.UI_AUDIT_OUTPUT_DIR!;
export default defineConfig(base,{outputDir:path.join(output,'chrome-recheck-results'),use:{baseURL:'http://127.0.0.1:5199'},reporter:[['list'],['json',{outputFile:path.join(output,'chrome-recheck.json')}]]});
