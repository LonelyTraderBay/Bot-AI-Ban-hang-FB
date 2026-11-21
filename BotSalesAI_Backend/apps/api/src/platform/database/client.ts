import type { OnApplicationShutdown } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

export function createDatabaseClient(connectionString: string): PrismaClient {
    const adapter = new PrismaPg({
        connectionString,
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
        await this.client.shop.findFirst({ select: { id: true } });
        return true;
    }

    async onApplicationShutdown(): Promise<void> {
        await this.client.$disconnect();
    }
}
