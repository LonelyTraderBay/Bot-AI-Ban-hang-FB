import { createRef, useState } from 'react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, CssBaseline, TextField, ThemeProvider } from '@mui/material';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { tokens } from '@botsales/tokens';
import { theme } from '../src/shared/ui/theme';
import { ScopeContext } from '../src/shared/model/scope';
import type { Scope } from '../src/shared/model/scope';
import { UnknownResultError } from '../src/shared/api/errors';
import {
    Amount, CapabilityUnavailable, ConfirmDialog, CopyableCode, DataTable, DetailLine,
    EditDialog, Empty, ErrorNotice, LookupLoadMore, MutationButton, PageHeader,
    Pager, Panel, PartialDataNotice, QueryState, RouteLink, Stat, Stats, Status, Toolbar,
} from '../src/shared/ui/components';
import type { Column } from '../src/shared/ui/components';
import {
    ActionGroup, FieldGroup, FormFields, PageSections, SectionGrid, SurfaceContent,
} from '../src/shared/ui/composition';

afterEach(cleanup);

function renderWithTheme(ui: ReactNode) {
    return render(<ThemeProvider theme={theme}><CssBaseline />{ui}</ThemeProvider>);
}

function renderWithScope(ui: ReactNode, online = true, permissions: string[] = ['products.write']) {
    const scope = { online, membership: { permissions } } as unknown as Scope;
    return renderWithTheme(<ScopeContext.Provider value={scope}>{ui}</ScopeContext.Provider>);
}

function LocationProbe() {
    return <output aria-label="Đường dẫn hiện tại">{useLocation().pathname}</output>;
}

describe('S10 shared component rendered-slot contract', () => {
    it('PageHeader renders its eyebrow, h1, description and action slots', () => {
        renderWithTheme(<PageHeader eyebrow="BÁO CÁO" title="Tổng quan bán hàng" subtitle="Dữ liệu trong ngày" actions={<Button>Mở báo cáo</Button>} />);
        expect(screen.getByText('BÁO CÁO')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Tổng quan bán hàng' })).toBeInTheDocument();
        expect(screen.getByText('Dữ liệu trong ngày')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mở báo cáo' })).toBeInTheDocument();
    });

    it('Panel owns title, subtitle, action and inset body without hiding its child', () => {
        renderWithTheme(<Panel title="Thông tin" subtitle="Mô tả panel" action={<Button>Chỉnh sửa</Button>} bodyMode="inset"><span data-testid="panel-content">Nội dung panel</span></Panel>);
        const panel = screen.getByText('Thông tin').closest('.MuiPaper-root');
        const body = screen.getByTestId('panel-content').parentElement;
        expect(panel).not.toBeNull();
        expect(body).not.toBeNull();
        expect(body?.parentElement).toBe(panel);
        expect(screen.getByText('Mô tả panel')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Chỉnh sửa' })).toBeInTheDocument();
        expect(body!.className).toContain('css-');
    });

    it('Stat keeps ReactNode values, icon and note in non-heading semantic slots', () => {
        renderWithTheme(<Stat title="Doanh thu" value={<Status value="active" />} note="So với hôm qua" icon={<span role="img" aria-label="Xu hướng">↑</span>} />);
        expect(screen.getByText('Doanh thu')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Xu hướng' })).toBeInTheDocument();
        expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
        expect(screen.getByText('So với hôm qua')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Đang hoạt động' })).not.toBeInTheDocument();
    });

    it('Stats renders all children in its responsive grid owner', () => {
        renderWithTheme(<Stats><Stat title="Đơn hàng" value="12" /><Stat title="Doanh thu" value="20" /></Stats>);
        const grid = screen.getByText('Đơn hàng').closest('.MuiBox-root');
        expect(grid).toHaveStyle({ display: 'grid' });
        expect(screen.getByText('Doanh thu')).toBeInTheDocument();
    });

    it('Amount formats supported money and its null fallback through the shared owner', () => {
        renderWithTheme(<><Amount value={{ amount: '12345.6700', currency: 'VND' }} /><Amount value={null} /></>);
        expect(screen.getByText('12.345,67 ₫')).toBeInTheDocument();
        expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument();
    });

    it('CopyableCode announces clipboard failure without losing the code slot', async () => {
        const user = userEvent.setup();
        const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        renderWithTheme(<CopyableCode value="SKU-ABC-123" label="mã SKU" />);
        await user.click(screen.getByRole('button', { name: 'Sao chép mã SKU' }));
        expect(await screen.findByRole('status')).toHaveTextContent('Không thể sao chép mã SKU');
        expect(screen.getByText('SKU-ABC-123')).toBeInTheDocument();
    });

    it('Status maps positive, warning and unknown values to readable text', () => {
        renderWithTheme(<><Status value="active" /><Status value="partial" /><Status value="unmapped_status" /></>);
        expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
        expect(screen.getByText('Hoàn thành một phần')).toBeInTheDocument();
        expect(screen.getByText('unmapped_status')).toBeInTheDocument();
    });

    it('DataTable renders a ReactNode column callback and its empty-state slot', () => {
        type Row = { id: string; name: string };
        const column: Column<Row> = { key: 'name', label: 'Tên', align: 'right', render: row => <strong data-testid="rendered-cell">{row.name}</strong> };
        const { rerender } = renderWithTheme(<DataTable rows={[{ id: '1', name: 'Sản phẩm mẫu' }]} columns={[column]} rowKey={row => row.id} label="Sản phẩm" />);
        expect(screen.getByRole('table', { name: 'Sản phẩm' })).toBeInTheDocument();
        expect(screen.getByTestId('rendered-cell')).toHaveTextContent('Sản phẩm mẫu');
        expect(screen.getByRole('cell', { name: 'Sản phẩm mẫu' })).toHaveClass('MuiTableCell-alignRight');
        rerender(<ThemeProvider theme={theme}><CssBaseline /><DataTable rows={[]} columns={[column]} rowKey={row => row.id} empty="Không tìm thấy sản phẩm" label="Sản phẩm" /></ThemeProvider>);
        expect(screen.getByRole('status')).toHaveTextContent('Không tìm thấy sản phẩm');
    });

    it('Empty renders an optional action slot with its live status message', () => {
        renderWithTheme(<Empty text="Chưa có sản phẩm" action={<Button>Thêm sản phẩm</Button>} />);
        expect(screen.getByRole('status')).toHaveTextContent('Chưa có sản phẩm');
        expect(screen.getByRole('button', { name: 'Thêm sản phẩm' })).toBeInTheDocument();
    });

    it('QueryState preserves stale children while exposing refresh feedback and retry', async () => {
        const refetch = vi.fn();
        renderWithTheme(<QueryState query={{ isPending: false, isError: true, error: new Error('Mất kết nối'), data: { id: 'cached' }, isFetching: false, refetch }}><span>Dữ liệu đã tải</span></QueryState>);
        expect(screen.getByText('Dữ liệu đã tải')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('có thể đã cũ');
        await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
        expect(refetch).toHaveBeenCalledOnce();
    });

    it('QueryState keeps loaded children visible during a background refresh', () => {
        renderWithTheme(<QueryState query={{ isPending: false, isError: false, error: null, data: { id: 'cached' }, isFetching: true, refetch: vi.fn() }}><span>Dữ liệu đang hiển thị</span></QueryState>);
        expect(screen.getByText('Dữ liệu đang hiển thị')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Đang cập nhật dữ liệu');
    });

    it('ErrorNotice renders the unknown-result command slot', () => {
        renderWithTheme(<ErrorNotice error={new UnknownResultError('intent-1', 'command-42')} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Kết quả chưa xác minh');
        expect(screen.getByText(/command-42/)).toBeInTheDocument();
    });

    it('Toolbar preserves its extra slot when search is unsupported and omits an empty form', () => {
        const { rerender } = renderWithTheme(<MemoryRouter><Toolbar operation="listPrepJobs" extra={<Button>Bộ lọc bổ sung</Button>} /></MemoryRouter>);
        expect(screen.getByRole('button', { name: 'Bộ lọc bổ sung' })).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Tìm kiếm' })).not.toBeInTheDocument();
        rerender(<ThemeProvider theme={theme}><CssBaseline /><MemoryRouter><Toolbar operation="listPrepJobs" /></MemoryRouter></ThemeProvider>);
        expect(screen.queryByRole('textbox', { name: 'Tìm kiếm' })).not.toBeInTheDocument();
    });

    it('Pager treats a missing page as absent and labels a page without total', () => {
        const { rerender } = renderWithTheme(<MemoryRouter><Pager page={undefined} /></MemoryRouter>);
        expect(screen.queryByRole('button', { name: 'Trang tiếp' })).not.toBeInTheDocument();
        rerender(<ThemeProvider theme={theme}><CssBaseline /><MemoryRouter><Pager page={{ limit: 25, hasMore: false, nextCursor: null }} /></MemoryRouter></ThemeProvider>);
        expect(screen.getByText('Tối đa 25 dòng / trang')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Trang tiếp' })).toBeDisabled();
    });

    it('LookupLoadMore distinguishes exhausted, complete and busy lookup states', () => {
        const onLoadMore = vi.fn();
        const { rerender } = renderWithTheme(<LookupLoadMore label="kho" loadedCount={0} hasMore={false} onLoadMore={onLoadMore} />);
        expect(screen.queryByRole('button', { name: 'Tải thêm kho' })).not.toBeInTheDocument();
        rerender(<ThemeProvider theme={theme}><CssBaseline /><LookupLoadMore label="kho" loadedCount={3} hasMore={false} onLoadMore={onLoadMore} /></ThemeProvider>);
        expect(screen.getByText('Đã tải 3 lựa chọn')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Tải thêm kho' })).not.toBeInTheDocument();
        rerender(<ThemeProvider theme={theme}><CssBaseline /><LookupLoadMore label="kho" loadedCount={3} hasMore onLoadMore={onLoadMore} busy /></ThemeProvider>);
        expect(screen.getByRole('button', { name: 'Tải thêm kho' })).toBeDisabled();
        expect(onLoadMore).not.toHaveBeenCalled();
    });

    it('RouteLink navigates with an accessible named link target', async () => {
        const user = userEvent.setup();
        renderWithTheme(<MemoryRouter initialEntries={['/start']}><RouteLink to="/s/shop/products">Danh sách sản phẩm</RouteLink><LocationProbe /></MemoryRouter>);
        await user.click(screen.getByRole('link', { name: 'Danh sách sản phẩm' }));
        expect(screen.getByLabelText('Đường dẫn hiện tại')).toHaveTextContent('/s/shop/products');
    });

    it('MutationButton respects permission, action allowlist, online and busy states', () => {
        const { rerender } = renderWithScope(<MutationButton permission="products.write">Lưu sản phẩm</MutationButton>, true, []);
        expect(screen.queryByRole('button', { name: 'Lưu sản phẩm' })).not.toBeInTheDocument();
        rerender(<ThemeProvider theme={theme}><CssBaseline /><ScopeContext.Provider value={{ online: true, membership: { permissions: ['products.write'] } } as unknown as Scope}><MutationButton permission="products.write" allowedActions={['edit']} action="publish">Lưu sản phẩm</MutationButton></ScopeContext.Provider></ThemeProvider>);
        expect(screen.queryByRole('button', { name: 'Lưu sản phẩm' })).not.toBeInTheDocument();
        rerender(<ThemeProvider theme={theme}><CssBaseline /><ScopeContext.Provider value={{ online: false, membership: { permissions: ['products.write'] } } as unknown as Scope}><MutationButton permission="products.write">Lưu sản phẩm</MutationButton></ScopeContext.Provider></ThemeProvider>);
        expect(screen.getByRole('button', { name: 'Lưu sản phẩm' })).toBeDisabled();
        rerender(<ThemeProvider theme={theme}><CssBaseline /><ScopeContext.Provider value={{ online: true, membership: { permissions: ['products.write'] } } as unknown as Scope}><MutationButton permission="products.write" busy>Lưu sản phẩm</MutationButton></ScopeContext.Provider></ThemeProvider>);
        const button = screen.getByRole('button', { name: /Lưu sản phẩm/ });
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent('Lưu sản phẩm');
        expect(button.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
        rerender(<ThemeProvider theme={theme}><CssBaseline /><ScopeContext.Provider value={{ online: true, membership: { permissions: ['products.write'] } } as unknown as Scope}><MutationButton permission="products.write">Lưu sản phẩm</MutationButton></ScopeContext.Provider></ThemeProvider>);
        expect(screen.getByRole('button', { name: 'Lưu sản phẩm' })).toBeEnabled();
    });

    it('EditDialog exposes its content and actions while busy blocks closing controls', () => {
        renderWithTheme(<EditDialog open title="Đang lưu" description="Chờ kết quả" onClose={vi.fn()} busy actions={<Button>Lưu</Button>}><TextField label="Tên" /></EditDialog>);
        const dialog = screen.getByRole('dialog', { name: 'Đang lưu' });
        expect(dialog).toHaveAccessibleDescription('Chờ kết quả');
        expect(screen.getByRole('textbox', { name: 'Tên' })).toBeInTheDocument();
        expect(screen.getByRole('progressbar', { name: 'Đang lưu' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Đóng' })).toBeDisabled();
    });

    it('PartialDataNotice and CapabilityUnavailable render their declared message slots', () => {
        renderWithTheme(<><PartialDataNotice /><CapabilityUnavailable>Quyền đồng bộ chưa bật</CapabilityUnavailable><CapabilityUnavailable /></>);
        const notices = screen.getAllByRole('status');
        expect(notices[0]).toHaveTextContent('Một số phần của màn hình chưa có dữ liệu đầy đủ');
        expect(notices[1]).toHaveTextContent('Quyền đồng bộ chưa bật');
        expect(notices[2]).toHaveTextContent('Tính năng này chưa được API hoặc môi trường hiện tại hỗ trợ');
    });

    it('ConfirmDialog validates the reason and keeps a rejected action visible', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn().mockRejectedValue(new Error('Không thể xác nhận'));
        function Harness() {
            const [open, setOpen] = useState(true);
            return <><ConfirmDialog open={open} title="Xác nhận thao tác" description="Xem lại lý do" onClose={() => setOpen(false)} onConfirm={onConfirm} error={new Error('Không thể xác nhận')} requireReason /><output aria-label="Trạng thái dialog">{open ? 'đang mở' : 'đã đóng'}</output></>;
        }
        renderWithTheme(<Harness />);
        const confirm = screen.getByRole('button', { name: 'Xác nhận' });
        expect(confirm).toBeDisabled();
        const reason = screen.getByRole('textbox', { name: /Lý do/ });
        await user.type(reason, '1234');
        expect(confirm).toBeDisabled();
        await user.type(reason, '5');
        expect(confirm).toBeEnabled();
        await user.click(confirm);
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('12345'));
        expect(screen.getByLabelText('Trạng thái dialog')).toHaveTextContent('đang mở');
        expect(screen.getByRole('alert')).toHaveTextContent('Không thể xác nhận');
    });

    it('ConfirmDialog closes only after a successful confirmation', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        function Harness() {
            const [open, setOpen] = useState(true);
            return <><ConfirmDialog open={open} title="Xóa nhãn" description="Xác nhận xóa nhãn" onClose={() => setOpen(false)} onConfirm={onConfirm} /><output aria-label="Trạng thái xác nhận">{open ? 'đang mở' : 'đã đóng'}</output></>;
        }
        renderWithTheme(<Harness />);
        await user.click(screen.getByRole('button', { name: 'Xác nhận' }));
        await waitFor(() => expect(screen.getByLabelText('Trạng thái xác nhận')).toHaveTextContent('đã đóng'));
        expect(onConfirm).toHaveBeenCalledWith('');
    });

    it('DetailLine renders its label, ReactNode value and row separator', () => {
        renderWithTheme(<DetailLine label="Mã đơn"><strong data-testid="detail-value">ORDER-1001</strong></DetailLine>);
        expect(screen.getByText('Mã đơn')).toBeInTheDocument();
        expect(screen.getByTestId('detail-value')).toHaveTextContent('ORDER-1001');
        expect(screen.getByRole('separator')).toBeInTheDocument();
    });
});

describe('S10 shared composition rendered variants', () => {
    it('FormFields retains the div ref and native metadata branch', () => {
        const ref = createRef<HTMLDivElement>();
        renderWithTheme(<FormFields ref={ref} data-testid="form-content" data-draft-clean="true"><span>Nội dung</span></FormFields>);
        expect(ref.current?.tagName).toBe('DIV');
        expect(screen.getByTestId('form-content')).toHaveAttribute('data-draft-clean', 'true');
        expect(screen.getByText('Nội dung')).toBeInTheDocument();
    });

    it.each(['flush', 'inset', 'outlined'] as const)('FormFields renders the finite %s body profile', mode => {
        renderWithTheme(<FormFields bodyMode={mode} data-testid="fields-profile"><span>Trường nhập</span></FormFields>);
        const fields = screen.getByTestId('fields-profile');
        expect(fields).toHaveAttribute('data-ui-composition', 'form-fields');
        expect(screen.getByText('Trường nhập')).toBeInTheDocument();
        if (mode === 'outlined')
            expect(getComputedStyle(fields).borderTopWidth).toBe('1px');
    });

    it('FieldGroup forwards its accessible group name and owns compact control spacing', () => {
        renderWithTheme(<FieldGroup role="group" aria-label="Bộ lọc đơn hàng" data-testid="field-group"><Button>Trạng thái</Button><Button>Khoảng ngày</Button></FieldGroup>);
        const group = screen.getByRole('group', { name: 'Bộ lọc đơn hàng' });
        expect(group).toHaveAttribute('data-ui-composition', 'field-group');
        expect(getComputedStyle(group).gap).toBe(tokens.space.sm + 'px');
    });

    it('FieldGroup applies its toolbar inset only to the toolbar profile', () => {
        renderWithTheme(<FieldGroup bodyMode="toolbar" data-testid="toolbar-fields"><TextField label="Mã đơn" /></FieldGroup>);
        expect(getComputedStyle(screen.getByTestId('toolbar-fields')).padding).toBe(tokens.space.lg + 'px');
        expect(screen.getByRole('textbox', { name: 'Mã đơn' })).toBeInTheDocument();
    });

    it.each(['flush', 'inset', 'insetDivider', 'compactOutlined', 'compactControlOutlined'] as const)('SurfaceContent renders each finite body mode and children', mode => {
        renderWithTheme(<SurfaceContent bodyMode={mode} data-testid="surface-content"><span>Nội dung con</span></SurfaceContent>);
        const surface = screen.getByTestId('surface-content');
        expect(surface).toHaveAttribute('data-ui-composition', 'surface-content');
        expect(screen.getByText('Nội dung con')).toBeInTheDocument();
        if (mode === 'inset' || mode === 'insetDivider')
            expect(surface.className).toContain('css-');
        if (mode === 'insetDivider')
            expect(getComputedStyle(surface).borderBottomWidth).toBe('1px');
        if (mode === 'compactOutlined' || mode === 'compactControlOutlined')
            expect(getComputedStyle(surface).borderTopWidth).toBe('1px');
    });

    it.each([['compact', tokens.space.sm], ['comfortable', tokens.space.md]] as const)('ActionGroup applies its finite semantic density', (density, gap) => {
        renderWithTheme(<ActionGroup density={density} data-testid="action-group"><Button>Chỉnh sửa</Button><Button>Xem</Button></ActionGroup>);
        const group = screen.getByTestId('action-group');
        expect(group).toHaveAttribute('data-ui-rhythm', density);
        expect(getComputedStyle(group).gap).toBe(gap + 'px');
        expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('ActionGroup header mode owns its header boundary and keeps action order', () => {
        renderWithTheme(<ActionGroup bodyMode="header" data-testid="header-actions"><Button>Hủy</Button><Button>Lưu</Button></ActionGroup>);
        const group = screen.getByTestId('header-actions');
        expect(getComputedStyle(group).borderBottomWidth).toBe('1px');
        expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['Hủy', 'Lưu']);
    });

    it('PageSections owns the boundary for conditional peer sections', () => {
        renderWithTheme(<PageSections data-testid="page-sections"><><section>Phần A</section><section>Phần B</section></></PageSections>);
        const sections = screen.getByTestId('page-sections');
        expect(sections).toHaveAttribute('data-ui-composition', 'page-sections');
        expect(getComputedStyle(sections).gap).toBe(tokens.space.xl + 'px');
        expect(screen.getByText('Phần B')).toBeInTheDocument();
    });

    it('SectionGrid retains responsive columns and named content rhythm', () => {
        renderWithTheme(<SectionGrid columns={{ xs: '1fr', md: '1fr 2fr' }} rhythm="content" data-testid="section-grid"><span>Danh sách</span><span>Chi tiết</span></SectionGrid>);
        const grid = screen.getByTestId('section-grid');
        expect(grid).toHaveAttribute('data-ui-composition', 'section-grid');
        expect(grid).toHaveAttribute('data-ui-rhythm', 'content');
        expect(getComputedStyle(grid).display).toBe('grid');
        expect(getComputedStyle(grid).gap).toBe(tokens.space.md + 'px');
        expect(screen.getByText('Chi tiết')).toBeInTheDocument();
    });
});
