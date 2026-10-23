import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { ReportWarnings } from '../src/modules/finance/report-warnings';
import { theme } from '../src/shared/ui/theme';

afterEach(cleanup);
it.each([0,1,8])('ReportWarnings preserves %i complete source notices without an empty wrapper', count => {
    const warnings = Array.from({ length: count }, (_, i) => `Nguồn ${i}: ` + 'Giới hạn dữ liệu tổng hợp. '.repeat(12));
    const { container } = render(<ThemeProvider theme={theme}><ReportWarnings warnings={warnings}/></ThemeProvider>);
    expect(screen.queryAllByRole('alert')).toHaveLength(count);
    for (const [index,warning] of warnings.entries()) expect(screen.getAllByRole('alert')[index].querySelector('.MuiAlert-message')!.textContent).toBe(warning);
    expect(container.querySelectorAll('[data-ui-composition="surface-content"]')).toHaveLength(count ? 1 : 0);
    if (count) expect(container.querySelector('[data-ui-composition="surface-content"]')).toHaveStyle({ gap: '12px' });
});
it('ReportWarnings keeps duplicate warnings and the caller severity', () => {
    render(<ThemeProvider theme={theme}><ReportWarnings warnings={['Thiếu nguồn','Thiếu nguồn']} severity="info"/></ThemeProvider>);
    expect(screen.getAllByText('Thiếu nguồn')).toHaveLength(2);
    expect(screen.getAllByRole('alert').every(node => node.classList.contains('MuiAlert-standardInfo'))).toBe(true);
});
