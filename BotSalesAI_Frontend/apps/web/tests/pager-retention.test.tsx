import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { theme } from '../src/shared/ui/theme';
import { Pager } from '../src/shared/ui/components';

function LongCursorList() {
    const [params] = useSearchParams();
    const current = Number(params.get('cursor')?.slice(1) || 0);
    return <><Pager page={{ limit: 20, hasMore: true, nextCursor: `c${current + 1}` }}/><output aria-label="Cursor hiện tại">{params.toString()}</output></>;
}

it('bounds one long list to 100 recent cursors and keeps an honest first-page fallback with its filters', () => {
    render(<ThemeProvider theme={theme}><MemoryRouter initialEntries={['/s/pager-retention?status=active&q=kept']}><LongCursorList/></MemoryRouter></ThemeProvider>);
    for (let index = 0; index < 125; index++) fireEvent.click(screen.getByRole('button', { name: 'Trang tiếp' }));
    expect(screen.getByLabelText('Cursor hiện tại')).toHaveTextContent('cursor=c125');
    for (let index = 0; index < 99; index++) fireEvent.click(screen.getByRole('button', { name: 'Trang trước' }));
    expect(screen.getByLabelText('Cursor hiện tại')).toHaveTextContent('cursor=c26');
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đầu danh sách' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Đầu danh sách' }));
    expect(screen.getByLabelText('Cursor hiện tại').textContent).toBe('status=active&q=kept');
}, 15_000);
