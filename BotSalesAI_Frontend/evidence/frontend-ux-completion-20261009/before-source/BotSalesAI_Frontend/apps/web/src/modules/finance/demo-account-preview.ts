export type DemoJournalAccountOption = {
    id: string;
    label: string;
};

// Synthetic choices for UI acceptance only; the API contract has no chart-of-accounts lookup.
export const demoJournalAccounts: DemoJournalAccountOption[] = [
    { id: 'cash', label: 'Tiền mặt · cash (mẫu demo)' },
    { id: 'sales', label: 'Doanh thu · sales (mẫu demo)' },
    { id: 'income', label: 'Thu khác · income (mẫu demo)' },
    { id: 'inventory', label: 'Hàng tồn kho · inventory (mẫu demo)' },
    { id: 'accounts_payable', label: 'Phải trả · accounts_payable (mẫu demo)' },
    { id: 'operating_expense', label: 'Chi phí vận hành · operating_expense (mẫu demo)' },
];
