import type { OnApplicationShutdown } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

export function createDatabaseClient(connectionString: string): PrismaClient {
    const url = new URL(connectionString);
    const startupOptions = url.searchParams.getAll('options').at(-1) || process.env.PGOPTIONS;
    // Prisma and PostgreSQL must interpret timestamp parameters in the same session zone.
    url.searchParams.set('options', [startupOptions, '-c timezone=UTC'].filter(Boolean).join(' '));
    const adapter = new PrismaPg({
        connectionString: url.href,
        connectionTimeoutMillis: 2000,
        statement_timeout: 2000,
        query_timeout: 3000,
    });
    return new PrismaClient({ adapter });
}

export class Database implements OnApplicationShutdown {
    readonly client: PrismaClient;

    constructor(connectionString: string) {
        this.client = createDatabaseClient(connectionString);
    }

    async ready(): Promise<boolean> {
        const [{ writable }] = await this.client.$queryRaw<{ writable: boolean }[]>`
            SELECT NOT pg_is_in_recovery() AND current_setting('transaction_read_only') = 'off' AS writable
        `;
        if (!writable) return false;
        await this.client.shop.findFirst({ select: { id: true } });
        return true;
    }

    async onApplicationShutdown(): Promise<void> {
        await this.client.$disconnect();
    }
}
