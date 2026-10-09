from pathlib import Path
p=Path(__file__).resolve().parents[2]/'apps/web/src/modules/procurement/index.tsx'
s=p.read_text(encoding='utf-8');a=s.index('export function ReplenishmentPage()');b=s.index('\nfunction canRetryLookup',a);rule=s[a:b]
rule=rule.replace("    const suppliers = usePagedApi('listSuppliers');","    const suppliers = usePagedApi('listSuppliers');\n    const warehouses = usePagedApi('listWarehouses', { query: { status: 'active', limit: 20 } });\n    const [warehouseId, setWarehouseId] = useState(shop.defaultWarehouseId);")
rule=rule.replace('const ruleFormValid = selectedOfferEligible &&','const ruleFormValid = selectedOfferEligible && warehouses.data?.data.some(warehouse => warehouse.id === warehouseId) &&')
rule=rule.replace('setEdit(r); setOffer(',"setEdit(r); setWarehouseId(r?.warehouseId || shop.defaultWarehouseId); setOffer(")
rule=rule.replace('warehouseId: edit?.warehouseId || shop.defaultWarehouseId','warehouseId')
needle='<FormFields ><TextField label="Báo giá / SKU"'
assert rule.count(needle)==1
rule=rule.replace(needle,'''<FormFields ><TextField select label="Kho nhập lại" value={warehouseId} onChange={event => setWarehouseId(event.target.value)} disabled={create.pending || update.pending}>{warehouseId && !warehouses.data?.data.some(warehouse => warehouse.id === warehouseId) && <MenuItem value={warehouseId}>Đang giữ kho {warehouseId}; tải danh mục để kiểm tra</MenuItem>}{warehouses.data?.data.map(warehouse => <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</MenuItem>)}</TextField><LookupLoadMore label="kho nhập lại" loadedCount={warehouses.loadedCount} hasMore={warehouses.hasMore} busy={warehouses.isLoadingMore} onLoadMore={warehouses.loadMore}/><ErrorNotice error={warehouses.error}/><TextField label="Báo giá / SKU"''')
s=s[:a]+rule+s[b:]
a=s.index('export function PurchasesPage()');b=s.index('\nfunction PurchaseDialog',a);purchase=s[a:b]
purchase=purchase.replace("    const offers = usePagedApi('listSupplierOffers');","    const offers = usePagedApi('listSupplierOffers');\n    const warehouses = usePagedApi('listWarehouses', { query: { status: 'active', limit: 20 } });\n    const [warehouseId, setWarehouseId] = useState(shop.defaultWarehouseId);")
purchase=purchase.replace("const canCreate = !!selectedSupplier &&", "const canCreate = warehouses.data?.data.some(warehouse => warehouse.id === warehouseId) && !!selectedSupplier &&")
purchase=purchase.replace("        setSupplierId('');","        setSupplierId('');\n        setWarehouseId(shop.defaultWarehouseId);")
purchase=purchase.replace('warehouseId: shop.defaultWarehouseId, suggestionId: null','warehouseId, suggestionId: null')
needle='<ErrorNotice error={create.error}/><FormFields >'
assert purchase.count(needle)==1
purchase=purchase.replace(needle,'''<ErrorNotice error={create.error || warehouses.error}/><FormFields ><TextField select label="Kho nhận hàng" value={warehouseId} onChange={event => setWarehouseId(event.target.value)} disabled={create.pending}>{warehouseId && !warehouses.data?.data.some(warehouse => warehouse.id === warehouseId) && <MenuItem value={warehouseId}>Đang giữ kho {warehouseId}; tải danh mục để kiểm tra</MenuItem>}{warehouses.data?.data.map(warehouse => <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</MenuItem>)}</TextField><LookupLoadMore label="kho nhận hàng" loadedCount={warehouses.loadedCount} hasMore={warehouses.hasMore} busy={warehouses.isLoadingMore} onLoadMore={warehouses.loadMore}/>''')
s=s[:a]+purchase+s[b:];p.write_text(s,encoding='utf-8');print('Procurement warehouse fields use canonical paginated lookups; selected stock locations remain HTTP-validated.')
