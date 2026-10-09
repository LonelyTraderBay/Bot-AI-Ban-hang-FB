from pathlib import Path
root=Path(__file__).resolve().parents[2]
def edit(name,changes):
    p=root/'tests'/name;s=p.read_text(encoding='utf-8')
    for old,new in changes:
        assert old in s,(name,old)
        s=s.replace(old,new)
    p.write_text(s,encoding='utf-8')
edit('fe012.spec.ts', [('Địa chỉ giao hàng (mẫu demo)','Địa chỉ giao hàng'),('Địa chỉ mẫu · shop-demo (chỉ dùng trong demo)','Địa chỉ giao hàng mẫu · Linh (khách mẫu)')])
edit('fe015.spec.ts', [('Tiền mặt · cash (mẫu demo)','111 · Tiền mặt'),('Doanh thu · sales (mẫu demo)','511 · Doanh thu bán hàng'),('Thu khác · income (mẫu demo)','711 · Thu nhập khác')])
edit('fe011.spec.ts', [("await page.getByLabel('Mã kho').fill('warehouse-01');","await chooseOption(page, 'Kho', 'MAIN · Kho chính · dữ liệu tổng hợp');")])
edit('ui-inventory-layout.spec.ts', [("page.getByRole('textbox', { name: 'Mã kho' }).waitFor", "page.getByRole('combobox', { name: 'Kho', exact: true }).waitFor"),("await page.getByRole('textbox', { name: 'Mã kho' }).fill('warehouse-01');", "await page.getByRole('combobox', { name: 'Kho', exact: true }).click();\n    await page.getByRole('option', { name: 'MAIN · Kho chính · dữ liệu tổng hợp', exact: true }).click();")])
edit('ui-toolbar-layout.spec.ts', [("const warehouse = page.getByRole('textbox', { name: 'Mã kho', exact: true });\n        await warehouse.fill('wh1');", "const warehouse = page.getByRole('combobox', { name: /^Kho(?: |$)/ });\n        await warehouse.click();\n        await page.getByRole('option', { name: 'MAIN · Kho chính · dữ liệu tổng hợp', exact: true }).click();"),("toBe('wh1');", "toBe('warehouse-01');"),("await expect(warehouse).toHaveValue('');", "await expect(warehouse.locator('..').locator('input')).toHaveValue('');")])
edit('ui-orders-layout.spec.ts', [('synthetic address','canonical address snapshot'),('Địa chỉ giao hàng (mẫu demo)','Địa chỉ giao hàng'),('Địa chỉ mẫu · shop-demo (chỉ dùng trong demo)','Địa chỉ giao hàng mẫu · Linh (khách mẫu)'),('/Địa chỉ mẫu chỉ phục vụ nghiệm thu giao diện/','/Đơn xác nhận giữ snapshot địa chỉ của báo giá/')])
edit('frontend-corrections.spec.ts', [("expect((await mutate(page, 'orders/' + current.id, { warehouseId: 'warehouse-02' }, 'PATCH', current.version)).status).toBe(200);", "const newWarehouse = await mutate(page, 'warehouses', { code: 'F01-CONCURRENT', name: 'Kho server cùng lúc', addressLine: 'Địa điểm tổng hợp' });\n    expect(newWarehouse.status).toBe(201);\n    const warehouseId = newWarehouse.payload.data.id;\n    expect((await mutate(page, 'orders/' + current.id, { warehouseId }, 'PATCH', current.version)).status).toBe(200);"),("await expect(editor.getByLabel('Mã kho xuất')).toHaveValue('warehouse-02');", "await expect(editor.getByRole('combobox', { name: /^Kho xuất(?: |$)/ }).locator('..').locator('input')).toHaveValue(warehouseId);")])
print('Canonical lookup selectors migrated; behavior and geometry assertions preserved.')
