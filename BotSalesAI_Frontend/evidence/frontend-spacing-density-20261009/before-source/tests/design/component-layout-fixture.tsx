import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Button, ThemeProvider, Typography } from '@mui/material';
import { Amount, DataTable, DetailLine, Empty, Panel, Stat, Status } from '../../apps/web/src/shared/ui/components';
import { FormFields, SurfaceContent } from '../../apps/web/src/shared/ui/composition';
import { theme } from '../../apps/web/src/shared/ui/theme';
import { formatMoney } from '../../apps/web/src/shared/model/format';
import { getDemoAddressOptions } from '../../apps/web/src/modules/orders/demo-address-preview';
import { db } from '../../apps/web/src/mocks/database';

let root: Root | undefined;
export function mountComponentFixture(container: HTMLElement, caseId: string) {
    const money = { amount: '9'.repeat(60), currency: 'VND' };
    const negative = { amount: '-' + '9'.repeat(40) + '.' + '1'.repeat(18), currency: 'USD' };
    const long = 'Nội dung hướng dẫn có thể xuống nhiều dòng trên màn hình hẹp. '.repeat(4);
    const cases = {
        money: <FormFields><Stat title="Tiền dài hợp lệ" value={<Amount wrap value={money}/>}/><Panel title="Đối chiếu số tiền" bodyMode="inset"><DetailLine label="Tiền âm"><Amount wrap value={negative}/></DetailLine><DetailLine label="Thiếu dữ liệu"><Amount wrap value={null}/></DetailLine><DetailLine label="Phần lẻ nhỏ"><Amount wrap value={{ amount: '0.000000000000000001', currency: 'VND' }}/></DetailLine></Panel><DataTable label="Tiền trong bảng" rows={[money]} rowKey={row => row.currency} columns={[{ key: 'money', label: 'Tiền', render: row => <Amount value={row}/> }]}/><Button>Tiếp tục</Button></FormFields>,
        status: <FormFields><SurfaceContent direction="row"><Typography>{long}</Typography><Status value="draft"/></SurfaceContent><SurfaceContent direction="row"><Status value={'Trạng thái chưa biết ' + 'A'.repeat(120)}/></SurfaceContent><Button>Tiếp tục</Button></FormFields>,
        empty: <Empty text={'Mã tham chiếu: ' + 'A'.repeat(120)} action={<Button>Tiếp tục</Button>}/>,
    };
    if (!(caseId in cases)) throw new Error('Unknown component fixture ' + caseId);
    root?.unmount();
    root = createRoot(container);
    root.render(<ThemeProvider theme={theme}><MemoryRouter>{cases[caseId as keyof typeof cases]}</MemoryRouter></ThemeProvider>);
    return { money: formatMoney(money), negative: formatMoney(negative) };
}

export function installReadonlyAddressFixture() {
    const option = getDemoAddressOptions('shop-demo')[0];
    const order = db.orders.find(row => row.id === 'DH-1001');
    if (!option || !order) throw new Error('Canonical synthetic order/address seed missing');
    option.label = 'Địa chỉ mẫu · shop-demo (chỉ dùng trong demo) · ' + 'A'.repeat(120);
    order.shippingAddressId = option.id;
    return option.label;
}

export async function prepareNativeScenario(caseId: string) {
    const waitFor = async (get: () => Element | undefined | null) => {
        const started = performance.now();
        while (performance.now() - started < 15000) {
            const node = get(); if (node && node.getClientRects().length) return node as HTMLElement;
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        throw new Error('Native scenario did not render target: ' + caseId);
    };
    const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('main button, [role="dialog"] button')].find(node => node.textContent?.trim() === text);
    if (['money', 'status', 'empty'].includes(caseId)) {
        const container = document.createElement('section'); document.querySelector('main')!.replaceChildren(container);
        mountComponentFixture(container, caseId);
    }
    let target: HTMLElement, focus: HTMLElement;
    if (caseId === 'order') {
        (await waitFor(() => button('Thêm dòng'))).click();
        target = await waitFor(() => document.querySelector('button[aria-label="Bỏ dòng 1"]:not(:disabled)'));
        focus = [...document.querySelectorAll<HTMLInputElement>('main input')].find(node => node.closest('.MuiFormControl-root')?.querySelector('label')?.textContent === 'Số lượng')!;
    } else if (caseId === 'address') {
        installReadonlyAddressFixture();
        (await waitFor(() => document.querySelector('main a[href="/s/shop-demo/orders/DH-1001"]'))).click();
        (await waitFor(() => button('Sửa đơn nháp'))).click();
        await waitFor(() => document.querySelector('[role="dialog"] [role="group"][aria-label="Địa chỉ giao hàng (mẫu demo)"]'));
        target = await waitFor(() => document.querySelector('[role="dialog"] button[aria-label="Đóng"]'));
        focus = target;
    } else {
        target = await waitFor(() => button(caseId === 'product' ? 'Thêm biến thể' : caseId === 'import' ? 'Bỏ' : 'Tiếp tục'));
        focus = caseId === 'import' ? [...document.querySelectorAll<HTMLInputElement>('main input')].find(node => node.getClientRects().length && !node.disabled)! : target;
    }
    if (!focus) throw new Error('Native focus target missing: ' + caseId);
    target.dataset.nativeTarget = 'true'; focus.dataset.nativeFocus = 'true';
    target.scrollIntoView({ block: 'center' });
    return 'loaded-real-component-' + caseId;
}
