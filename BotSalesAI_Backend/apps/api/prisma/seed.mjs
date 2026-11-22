import { readDatabaseUrl } from '../dist/config.js';
import { createDatabaseClient } from '../dist/platform/database/client.js';
import { provisionFixtureShopAccounts } from '../dist/modules/finance/index.js';
import { fixtureCategory, fixtureIssuer, fixturePilotSubject, fixtureShops, fixtureUsers } from './p0-fixture.mjs';

const legacyFixtureIssuer = 'https://idp.botsales.test';

async function seed() {
    const connectionString = readDatabaseUrl(process.env);
    const target = new URL(connectionString);
    if (target.pathname !== '/botsales_be_dev') {
        throw new Error('P0 seed requires the botsales_be_dev fixture database');
    }
    const pilot = process.env.P0_LOCAL_PILOT === '1';
    if (pilot && (target.hostname !== '127.0.0.1' || target.username !== 'botsales_runtime' ||
        [...target.searchParams.keys()].length)) {
        throw new Error('The local pilot requires a direct loopback fixture database');
    }
    const memberships = pilot ? [...fixtureUsers, ...fixtureShops.map(shop => ({
        subject: fixturePilotSubject, shopId: shop.id, role: 'owner',
    }))] : fixtureUsers;
    const subjects = [...new Set(memberships.map(member => member.subject))];
    const db = createDatabaseClient(connectionString);
    try {
        await db.$transaction(async tx => {
            await tx.$executeRaw`SET CONSTRAINTS "shops_default_warehouse_fkey" DEFERRED`;
            await tx.shop.createMany({ data: fixtureShops, skipDuplicates: true });
            await tx.category.createMany({ data: [fixtureCategory], skipDuplicates: true });
            await tx.warehouse.createMany({
                data: fixtureShops.map(shop => ({
                    id: shop.defaultWarehouseId,
                    shopId: shop.id,
                    code: 'P0-DEFAULT',
                    name: 'Kho mặc định P0',
                    addressLine: 'Địa chỉ tổng hợp dùng để kiểm thử',
                })),
                skipDuplicates: true,
            });
            await provisionFixtureShopAccounts(tx, fixtureShops.map(shop => shop.id));
            // The BE-03 fixtures used a placeholder issuer before the local IdP was wired.
            for (const subject of subjects) {
                const identity = { oidcIssuer: fixtureIssuer, oidcSubject: subject };
                const existing = await tx.user.findUnique({ where: { oidcIssuer_oidcSubject: identity }, select: { id: true } });
                if (!existing) {
                    await tx.user.updateMany({
                        where: { oidcIssuer: legacyFixtureIssuer, oidcSubject: subject, email: `${subject}@botsales.test` },
                        data: { oidcIssuer: fixtureIssuer },
                    });
                }
            }
            await tx.user.createMany({
                data: subjects.map(subject => ({
                    oidcIssuer: fixtureIssuer,
                    oidcSubject: subject,
                    displayName: subject,
                    email: `${subject}@botsales.test`,
                })),
                skipDuplicates: true,
            });
            const users = await tx.user.findMany({
                where: { oidcIssuer: fixtureIssuer, oidcSubject: { in: subjects } },
                select: { oidcSubject: true, id: true },
            });
            const usersBySubject = new Map(users.map(user => [user.oidcSubject, user.id]));
            await tx.membership.createMany({
                data: memberships.map(({ subject, shopId, role }) => ({
                    shopId,
                    userId: usersBySubject.get(subject),
                    roles: [role],
                })),
                skipDuplicates: true,
            });
        });
    } finally {
        await db.$disconnect();
    }
    console.log('P0 fixtures applied for two shops.');
}

seed().catch(error => {
    const code = typeof error?.code === 'string' && /^P\d{4}$/.test(error.code) ? ` (${error.code})` : '';
    console.error(`P0 seed failed${code}. Check DATABASE_URL, fixture database name and applied migrations.`);
    process.exitCode = 1;
});
