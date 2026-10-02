import { useState } from 'react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, CssBaseline, TextField, ThemeProvider } from '@mui/material';
import { ApiError, UnknownResultError } from '../../src/shared/api/errors';
import { CapabilityUnavailable, EditDialog, ErrorNotice, PartialDataNotice, QueryState } from '../../src/shared/ui/components';
import i18n, { requiredVietnameseKeys, viMessages } from '../../src/app/i18n';
import { theme } from '../../src/shared/ui/theme';

function renderWithTheme(ui: ReactNode) {
    return render(<ThemeProvider theme={theme}><CssBaseline />{ui}</ThemeProvider>);
}

afterEach(cleanup);

describe('FE023 shared state and form behavior', () => {
    it('renders a bounded loading state and does not show success content before data arrives', () => {
        renderWithTheme(<QueryState query={{ isPending: true, isError: false, error: null, refetch: vi.fn() }}><div>Đơn hàng đã tải</div></QueryState>);
        expect(screen.getByRole('status')).toHaveTextContent('Đang tải dữ liệu');
        expect(screen.queryByText('Đơn hàng đã tải')).not.toBeInTheDocument();
    });

    it('keeps the loaded data visible after a failed refetch and identifies it as potentially stale', async () => {
        const refetch = vi.fn();
        renderWithTheme(<QueryState query={{ isPending: false, isError: true, error: new Error('Mạng tạm gián đoạn'), data: { id: 'cached' }, refetch }}><div>Đơn hàng đã tải</div></QueryState>);
        expect(screen.getByText('Đơn hàng đã tải')).toBeVisible();
        expect(screen.getByRole('status')).toHaveTextContent('Dữ liệu đang hiển thị có thể đã cũ');
        await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
        expect(refetch).toHaveBeenCalledOnce();
    });

    it('shows forbidden as an access state without offering a meaningless retry', () => {
        renderWithTheme(<QueryState query={{ isPending: false, isError: true, error: new ApiError(403, 'FORBIDDEN', 'Không được phép'), refetch: vi.fn() }}>Nội dung riêng</QueryState>);
        expect(screen.getByRole('alert')).toHaveTextContent('Không đủ quyền truy cập');
        expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
        expect(screen.queryByText('Nội dung riêng')).not.toBeInTheDocument();
    });

    it('maps 422 errors to a field, focuses it, and preserves the user input', async () => {
        const error = new ApiError(422, 'VALIDATION_FAILED', 'Số lượng không hợp lệ.', { errors: [{ path: 'quantity', message: 'Phải lớn hơn 0.' }] } as never);
        function Form() {
            const [value, setValue] = useState('17');
            return <form><TextField name="quantity" label="Số lượng" value={value} onChange={event => setValue(event.target.value)} /><ErrorNotice error={error} /></form>;
        }
        renderWithTheme(<Form />);
        const field = screen.getByRole('textbox', { name: 'Số lượng' });
        await waitFor(() => expect(field).toHaveFocus());
        expect(field).toHaveValue('17');
        expect(field).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('alert')).toHaveTextContent('Phải lớn hơn 0.');
    });

    it.each([
        [412, 'Dữ liệu đã thay đổi', 'Không gửi lại mù.'],
        [428, 'Thiếu phiên bản dữ liệu', 'phiên bản hiện tại'],
        [404, 'Không tìm thấy dữ liệu', 'Không còn hiển thị dữ liệu cũ'],
    ])('presents HTTP %s with an actionable Vietnamese state', (status, title, detail) => {
        renderWithTheme(<ErrorNotice error={new ApiError(status, 'STATE_TEST', 'Thông tin máy chủ.')} />);
        expect(screen.getByRole('alert')).toHaveTextContent(title);
        if (status !== 404)
            expect(screen.getByRole('alert')).toHaveTextContent(detail);
    });

    it('keeps an unknown mutation outcome distinct and includes the reconciliation command ID', () => {
        renderWithTheme(<ErrorNotice error={new UnknownResultError('intent-1', 'command-1')} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Kết quả chưa xác minh');
        expect(screen.getByRole('alert')).toHaveTextContent('command-1');
        expect(screen.getByRole('alert')).toHaveTextContent('Không gửi lại thao tác');
    });

    it('asks before closing a dialog with a dirty field and keeps the field until discard is chosen', async () => {
        function DialogProbe() {
            const [open, setOpen] = useState(true);
            const [value, setValue] = useState('Ban đầu');
            return <><EditDialog open={open} title="Chỉnh sửa" onClose={() => setOpen(false)} actions={<Button>Lưu</Button>}><TextField label="Tên bản nháp" value={value} onChange={event => setValue(event.target.value)} /></EditDialog>{!open && <div>Đã đóng</div>}</>;
        }
        renderWithTheme(<DialogProbe />);
        await userEvent.clear(screen.getByRole('textbox', { name: 'Tên bản nháp' }));
        await userEvent.type(screen.getByRole('textbox', { name: 'Tên bản nháp' }), 'Bản nháp giữ lại');
        await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));

        const confirm = screen.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' });
        expect(confirm).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Tên bản nháp', hidden: true })).toHaveValue('Bản nháp giữ lại');
        await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục sửa' }));
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' })).not.toBeInTheDocument());
        expect(screen.getByRole('textbox', { name: 'Tên bản nháp' })).toHaveValue('Bản nháp giữ lại');
        await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
        await userEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }));
        expect(await screen.findByText('Đã đóng')).toBeVisible();
    });

    it('exposes partial data and unavailable capability as explicit, accessible states', () => {
        renderWithTheme(<><PartialDataNotice>Một báo cáo chưa có chuỗi số liệu.</PartialDataNotice><CapabilityUnavailable /></>);
        expect(screen.getAllByRole('status')[0]).toHaveTextContent('Một báo cáo chưa có chuỗi số liệu.');
        expect(screen.getAllByRole('status')[1]).toHaveTextContent(viMessages.state.capabilityUnavailable);
    });

    it('has a complete Vietnamese translation for every registered common UI key', () => {
        const flatten = (value: unknown, prefix = ''): string[] => Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
            const next = prefix ? `${prefix}.${key}` : key;
            return typeof child === 'string' ? [next] : flatten(child, next);
        });
        const keys = new Set(flatten(viMessages));
        expect(requiredVietnameseKeys.every(key => keys.has(key))).toBe(true);
        expect(i18n.resolvedLanguage).toBe('vi');
        expect(requiredVietnameseKeys.filter(key => i18n.t(key) === key)).toEqual([]);
    });
});
