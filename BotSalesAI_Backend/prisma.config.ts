import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';

if (existsSync('.env')) loadEnvFile('.env');

export default defineConfig({
    schema: 'apps/api/prisma/schema.prisma',
    migrations: { path: 'apps/api/prisma/migrations' },
    datasource: { url: process.env.MIGRATION_DATABASE_URL ?? '' },
});
