import type { AccountGroup } from '../../generated/prisma/client.js';

type Account = { code: string; name: string; group: AccountGroup; systemKey: string };
export const fixtureAccounts: readonly Account[] = [
    { code: '111', name: 'Tiền mặt', group: 'asset', systemKey: 'cash' },
    { code: '112', name: 'Tiền ngân hàng', group: 'asset', systemKey: 'bank' },
    { code: '131', name: 'Phải thu khách', group: 'asset', systemKey: 'customer_receivable' },
    { code: '138', name: 'COD phải thu', group: 'asset', systemKey: 'carrier_receivable' },
    { code: '151', name: 'Hàng đang giao', group: 'asset', systemKey: 'inventory_transit' },
    { code: '156', name: 'Hàng tồn kho', group: 'asset', systemKey: 'inventory' },
    { code: '158', name: 'Ứng trước nhà cung cấp', group: 'asset', systemKey: 'supplier_prepayment' },
    { code: '331', name: 'Phải trả nhà cung cấp', group: 'liability', systemKey: 'supplier_payable' },
    { code: '3386', name: 'Tiền khách trả trước', group: 'liability', systemKey: 'customer_deposit' },
    { code: '3388', name: 'Nghĩa vụ hoàn tiền', group: 'liability', systemKey: 'refund_payable' },
    { code: '341', name: 'Vốn vay', group: 'liability', systemKey: 'loan' },
    { code: '411', name: 'Vốn chủ', group: 'equity', systemKey: 'owner_capital' },
    { code: '511', name: 'Doanh thu bán hàng', group: 'income', systemKey: 'sales' },
    { code: '521', name: 'Hàng bán bị trả', group: 'income', systemKey: 'sales_returns' },
    { code: '632', name: 'Giá vốn bán hàng', group: 'expense', systemKey: 'cost_of_goods' },
    { code: '641', name: 'Phí vận chuyển', group: 'expense', systemKey: 'carrier_fees' },
    { code: '642', name: 'Chi phí vận hành', group: 'expense', systemKey: 'operating_expense' },
    { code: '711', name: 'Tăng giá trị kho', group: 'income', systemKey: 'inventory_gain' },
    { code: '811', name: 'Giảm giá trị kho', group: 'expense', systemKey: 'inventory_loss' },
];
