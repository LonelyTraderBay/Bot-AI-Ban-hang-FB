import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert, Button, CssBaseline, TextField, ThemeProvider } from '@mui/material';
import { tokens } from '@botsales/tokens';
import { FormFields, PageSections, SurfaceContent } from '../src/shared/ui/composition';
import { Panel, Stat, Status } from '../src/shared/ui/components';
import { layoutSx } from '../src/shared/ui/layout';
import { theme } from '../src/shared/ui/theme';

afterEach(cleanup);

describe('Shared content ownership', () => {
    it('keeps section headings semantic and KPI values out of the heading outline', () => {
        render(<ThemeProvider theme={theme}><Panel title="Nhóm nội dung"><Stat title="Kết quả" value="125"/><Stat title="Trạng thái" value={<Status value="paused"/>}/></Panel></ThemeProvider>);
        expect(screen.getByRole('heading', { name: 'Nhóm nội dung', level: 2 })).toBeTruthy();
        expect(screen.queryByRole('heading', { name: '125' })).toBeNull();
        const status = screen.getByText('Tạm dừng').closest('.MuiChip-root');
        expect(status?.parentElement?.tagName).toBe('DIV');
        expect(screen.getByText('Tạm dừng').closest('p')).toBeNull();
    });
    it('retains native form refs, submission, labels and draft attributes', async () => {
        const user = userEvent.setup();
        const formRef = createRef<HTMLFormElement>();
        const submitted = vi.fn();
        render(<ThemeProvider theme={theme}><CssBaseline/><FormFields component="form" ref={formRef} id="shared-form" noValidate data-draft-clean="false" onSubmit={event => { event.preventDefault(); submitted(new FormData(event.currentTarget).get('name')); }}><TextField name="name" label="Tên"/><Button type="submit">Lưu</Button></FormFields></ThemeProvider>);
        await user.type(screen.getByRole('textbox', { name: 'Tên' }), 'Khách mẫu');
        await user.click(screen.getByRole('button', { name: 'Lưu' }));
        expect(submitted).toHaveBeenCalledWith('Khách mẫu');
        expect(formRef.current?.tagName).toBe('FORM');
        expect(formRef.current?.noValidate).toBe(true);
        expect(formRef.current?.dataset.draftClean).toBe('false');
    });

    it('maps field, page and surface rhythms to canonical token units', () => {
        render(<ThemeProvider theme={theme}><CssBaseline/><PageSections data-testid="sections"><Panel bodyMode="inset"><FormFields data-testid="fields"><TextField label="Sản phẩm"/><Alert data-testid="notice" sx={layoutSx.notice.afterGap}>Lỗi có thể khôi phục</Alert><Button>Thử lại</Button></FormFields></Panel><SurfaceContent data-testid="content"><Alert sx={layoutSx.notice.afterGap}>Dữ liệu cập nhật</Alert><Button>Mở</Button></SurfaceContent></PageSections></ThemeProvider>);
        const fields = screen.getByTestId('fields');
        expect(getComputedStyle(fields).gap).toBe(`${tokens.space.lg}px`);
        expect(getComputedStyle(screen.getByTestId('sections')).gap).toBe(`${tokens.space.lg}px`);
        expect(getComputedStyle(screen.getByTestId('content')).gap).toBe(`${tokens.space.md}px`);
    });
});
