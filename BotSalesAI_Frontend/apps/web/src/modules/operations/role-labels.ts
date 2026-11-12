import type { AgentRole } from '@botsales/contracts';

export const roleNames: Record<AgentRole['kind'], string> = {
    sales_admin: 'Admin bán hàng',
    accountant: 'Kế toán',
    warehouse_buyer: 'Kho & mua hàng',
    supervisor: 'Trưởng nhóm',
};

