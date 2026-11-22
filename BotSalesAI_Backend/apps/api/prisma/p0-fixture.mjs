export const fixtureIssuer = 'https://127.0.0.1:9443';

export const fixtureShops = [
    {
        id: 'ab030000-0000-4000-8000-000000000001',
        name: 'BotSales P0 A',
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi-VN',
        defaultWarehouseId: 'ab030000-0000-4000-8000-000000000011',
    },
    {
        id: 'ab030000-0000-4000-8000-000000000002',
        name: 'BotSales P0 B',
        currency: 'LAK',
        timezone: 'Asia/Vientiane',
        locale: 'vi-VN',
        defaultWarehouseId: 'ab030000-0000-4000-8000-000000000012',
    },
];

export const fixtureUsers = [
    { subject: 'p0-editor', shopId: fixtureShops[0].id, role: 'owner' },
    { subject: 'p0-editor-b', shopId: fixtureShops[1].id, role: 'owner' },
    { subject: 'p0-reader', shopId: fixtureShops[0].id, role: 'viewer' },
];

export const fixturePilotSubject = 'p0-pilot';

export const fixtureCategory = {
    shopId: fixtureShops[0].id,
    id: 'ab030000-0000-4000-8000-000000000021',
    name: 'Danh mục P0',
};
