import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuItem, TextField, ThemeProvider } from '@mui/material';
import { useState } from 'react';
import { theme } from '../src/shared/ui/theme';
import { ReportRangeFields } from '../src/modules/finance/report-range';

afterEach(cleanup);

function Filter() {
    const [value, setValue] = useState('');
    return <TextField id="test-status" select label="Trạng thái" SelectProps={{ displayEmpty: true, SelectDisplayProps: { 'aria-labelledby': 'test-status-label' } }} value={value} onChange={event => setValue(event.target.value)}>
        <MenuItem value="">Tất cả trạng thái</MenuItem>
        <MenuItem value="open">Đang mở</MenuItem>
    </TextField>;
}

describe('UI audit regressions', () => {
    it('shows the empty filter option and retains normal selection', async () => {
        const user = userEvent.setup();
        render(<ThemeProvider theme={theme}><Filter /></ThemeProvider>);
        const select = screen.getByRole('combobox', { name: /Trạng thái/ });
        expect(select).toHaveTextContent('Tất cả trạng thái');
        await user.click(select);
        await user.click(screen.getByRole('option', { name: 'Đang mở' }));
        expect(select).toHaveTextContent('Đang mở');
        await user.click(select);
        await user.click(screen.getByRole('option', { name: 'Tất cả trạng thái' }));
        expect(select).toHaveTextContent('Tất cả trạng thái');
    });

    it('explains the exclusive end and shows unambiguous Vietnamese dates', () => {
        render(<ThemeProvider theme={theme}><ReportRangeFields range={{ from: '2026-10-01', to: '2026-11-01' }} timezone="Asia/Vientiane" setFrom={vi.fn()} setTo={vi.fn()} /></ThemeProvider>);
        expect(screen.getByText('Ngày bắt đầu: 1/10/26')).toBeInTheDocument();
        expect(screen.getByText('Ngày kết thúc: 1/11/26')).toBeInTheDocument();
        expect(screen.getByText(/không bao gồm ngày kết thúc/)).toBeInTheDocument();
    });
});
