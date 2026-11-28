import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { DomainConflict } from '../../http/contracts.js';

export async function lockShopClosure(tx: Prisma.TransactionClient, shopId: string): Promise<Date | null> {
    const [shop] = await tx.$queryRaw<{ closed_at: Date | null }[]>`
        SELECT closed_at FROM shops WHERE id = ${shopId}::uuid FOR NO KEY UPDATE
    `;
    if (!shop) throw new NotFoundException();
    return shop.closed_at;
}

export async function requireOpenShop(tx: Prisma.TransactionClient, shopId: string) {
    if (await lockShopClosure(tx, shopId)) throw new DomainConflict('SHOP_CLOSED', 'Cửa hàng đã đóng. Chủ cửa hàng có thể mở lại trong phần thiết lập.');
}
