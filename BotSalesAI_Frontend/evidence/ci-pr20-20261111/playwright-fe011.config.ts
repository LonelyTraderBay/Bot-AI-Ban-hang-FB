import path from 'node:path';
import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';
// Dedicated loopback port lets this targeted run coexist with the route matrix.
export default defineConfig(base, { testDir: path.resolve('tests'), globalSetup: path.resolve('tests/session/playwright-setup.ts'), use: { baseURL: 'http://127.0.0.1:5190' } });
