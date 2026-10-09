"""One-time lookup migration; preserve the recorded pre-edit consumers."""
from pathlib import Path
R=Path(__file__).resolve().parents[2]
pending={}
def edit(name,old,new,count=1):
 p=R/name;s=pending.get(p,p.read_text(encoding='utf-8'));assert s.count(old)==count,(name,old[:100],s.count(old));pending[p]=s.replace(old,new)
p='apps/web/src/modules/orders/index.tsx'
edit(p,"import { getDemoAddressOptions } from './demo-address-preview';\n",'')
edit(p,"    const conv = usePagedApi", "    const warehouses = usePagedApi('listWarehouses', { query: { status: 'active', limit: 20 } }, useCan('inventory.read'));\n    const addresses = usePagedApi('listCustomerAddresses', { path: { customerId }, query: { status: 'active', limit: 20 } }, !!customerId && canReadCustomers);\n    const conv = usePagedApi")
edit(p,'const values = { customerId, conversationId, warehouse, notes,','const values = { customerId, conversationId, warehouse, addressId, notes,')
edit(p,'setWarehouse(value.warehouse); setNotes(value.notes);','setWarehouse(value.warehouse); setAddress(value.addressId); setNotes(value.notes);')
edit(p,'...(prepared.patch.warehouse !== undefined ? { warehouseId: body.warehouseId } : {}),','...(prepared.patch.warehouse !== undefined ? { warehouseId: body.warehouseId } : {}),\n                ...(prepared.patch.addressId !== undefined ? { shippingAddressId: addressId || null } : {}),')
edit(p,"setCustomer(e.target.value); setConversation('');","setCustomer(e.target.value); setConversation(''); setAddress('');")
start='                <TextField label="Mã kho xuất"'
s=pending[R/p];end='            {resource || create.pending ? <FieldGroup role="group" aria-label="Thanh toán">';i=s.index(start);j=s.index(end,i)
pending[R/p]=s[:i]+'''                <TextField select label="Kho xuất" value={warehouse} onChange={e => setWarehouse(e.target.value)} fullWidth disabled={create.pending || update.pending} sx={{ flex: 1, minWidth: 0 }}>
                    {warehouse && !warehouses.data?.data.some(w => w.id === warehouse) && <MenuItem value={warehouse}>Đang giữ kho {warehouse}</MenuItem>}
                    {warehouses.data?.data.map(w => <MenuItem key={w.id} value={w.id}>{w.code} · {w.name}</MenuItem>)}
                </TextField>
                <TextField select label="Địa chỉ giao hàng" value={addressId} onChange={e => setAddress(e.target.value)} fullWidth disabled={!customerId || create.pending || update.pending} sx={{ flex: 1, minWidth: 0 }} helperText="Chỉ dùng địa chỉ thuộc khách đã chọn do API trả về; trường bị che vẫn được bảo vệ.">
                    <MenuItem value="">Chưa chọn địa chỉ</MenuItem>
                    {addressId && !addresses.data?.data.some(a => a.id === addressId) && <MenuItem value={addressId}>Đang giữ địa chỉ {addressId}</MenuItem>}
                    {addresses.data?.data.map(a => <MenuItem key={a.id} value={a.id}>{a.label} · {a.recipient || 'Người nhận đã che'}</MenuItem>)}
                </TextField>
            </FormFields>
            <ErrorNotice error={warehouses.error || addresses.error}/>
            <LookupLoadMore label="kho xuất" loadedCount={warehouses.loadedCount} hasMore={warehouses.hasMore} busy={warehouses.isLoadingMore} onLoadMore={warehouses.loadMore}/>
            {customerId && <LookupLoadMore label="địa chỉ giao hàng" loadedCount={addresses.loadedCount} hasMore={addresses.hasMore} busy={addresses.isLoadingMore} onLoadMore={addresses.loadMore}/>}
            <Alert severity="info">Đơn xác nhận giữ snapshot địa chỉ của báo giá. Khi địa chỉ đổi trước xác nhận, cần lấy báo giá và khách đồng ý lại.</Alert>
'''+s[j:]
edit(p,'warehouse: order.warehouseId, notes:','warehouse: order.warehouseId, addressId: order.shippingAddressId || \'\', notes:')
edit(p,"{order.shippingAddressId || 'Chưa có địa chỉ được xác minh'}", "{order.shippingAddressSnapshot ? [order.shippingAddressSnapshot.label, order.shippingAddressSnapshot.recipient, order.shippingAddressSnapshot.line1, order.shippingAddressSnapshot.province].filter(Boolean).join(' · ') : order.shippingAddressId || 'Chưa có địa chỉ được xác minh'}")
p='apps/web/src/modules/finance/index.tsx'
edit(p,"import { demoJournalAccounts } from './demo-account-preview';\n",'')
edit(p,'import type { AccountingPeriod,','import type { Account, AccountingPeriod,')
s=pending[R/p];i=s.index('function JournalAccountField(');j=s.index('\nexport function JournalsPage()',i)
pending[R/p]=s[:i]+'''function JournalAccountField({ index, value, accounts, onChange }: { index: number; value: string; accounts: readonly Account[]; onChange: (accountId: string) => void }) {
    return <TextField select label={`Tài khoản dòng ${index}`} fullWidth value={value} helperText="Chọn tài khoản đang hoạt động từ danh mục kế toán." onChange={event => onChange(event.target.value)}>
        <MenuItem value="">Chọn tài khoản</MenuItem>
        {value && !accounts.some(account => account.id === value) && <MenuItem value={value} disabled>Đang giữ tài khoản {value}</MenuItem>}
        {accounts.map(account => <MenuItem key={account.id} value={account.id}>{account.code} · {account.name}</MenuItem>)}
    </TextField>;
}
'''+s[j:]
edit(p,"    const periods = useApi('listAccountingPeriods');\n    const create = useCommand('createJournal'", "    const periods = useApi('listAccountingPeriods');\n    const accounts = usePagedApi('listAccounts', { query: { status: 'active', limit: 20 } });\n    const create = useCommand('createJournal'")
edit(p,'<JournalAccountField index={index + 1} value={line.accountId} onChange=', '<JournalAccountField index={index + 1} value={line.accountId} accounts={accounts.data?.data || []} onChange=')
edit(p,"{__MOCK__ ? 'Danh mục dưới đây là dữ liệu tổng hợp để nghiệm thu giao diện, không phải sơ đồ kế toán đã xác minh.' : 'Contract hiện chưa có API danh mục tài khoản; chỉ dùng mã tài khoản do hệ thống cấp.'}", "Danh mục tài khoản lấy từ API của cửa hàng. Bút toán kiểm lại quyền, trạng thái tài khoản và đồng tiền khi ghi sổ.")
edit(p,'<ErrorNotice error={create.error}/><FormFields ><Alert severity="info">Danh mục tài khoản','<ErrorNotice error={create.error || accounts.error}/><LookupLoadMore label="tài khoản kế toán" loadedCount={accounts.loadedCount} hasMore={accounts.hasMore} busy={accounts.isLoadingMore} onLoadMore={accounts.loadMore}/><FormFields ><Alert severity="info">Danh mục tài khoản')
edit(p,'const balanced = lines.length >= 2 && lineErrors.every(error => !error) && debitTotal === creditTotal && debitTotal > 0n;','const balanced = lines.length >= 2 && lineErrors.every(error => !error) && lines.every(line => accounts.data?.data.some(account => account.id === line.accountId)) && debitTotal === creditTotal && debitTotal > 0n;')
p='apps/web/src/modules/inventory/index.tsx'
edit(p,'Alert, Button, Stack, TextField','Alert, Button, MenuItem, Stack, TextField')
edit(p,'import { useApi, useCommand }','import { useApi, useCommand, usePagedApi }')
edit(p,'ErrorNotice, RouteLink }','ErrorNotice, RouteLink, LookupLoadMore }')
edit(p,'    const [warehouseId, setWarehouseId]',"    const warehouses = usePagedApi('listWarehouses', { query: { limit: 20 } });\n    const [warehouseId, setWarehouseId]")
edit(p,'<TextField size="small" label="Mã kho" value={warehouseId} onChange={event => setWarehouseId(limitCodePoints(event.target.value, 120))}  sx={{ minWidth: { sm: 150 } }}/>','<TextField select size="small" label="Kho" value={warehouseId} onChange={event => setWarehouseId(event.target.value)} sx={{ minWidth: { sm: 150 } }}><MenuItem value="">Tất cả kho</MenuItem>{warehouseId && !warehouses.data?.data.some(w => w.id === warehouseId) && <MenuItem value={warehouseId}>Đang giữ bộ lọc {warehouseId}</MenuItem>}{warehouses.data?.data.map(w => <MenuItem key={w.id} value={w.id}>{w.code} · {w.name}</MenuItem>)}</TextField><LookupLoadMore label="kho" loadedCount={warehouses.loadedCount} hasMore={warehouses.hasMore} busy={warehouses.isLoadingMore} onLoadMore={warehouses.loadMore}/><ErrorNotice error={warehouses.error}/>')
for path,s in pending.items():path.write_text(s,encoding='utf-8')
print('Migrated orders, journal and inventory lookups; draft address is versioned and guarded.')
