import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { Button, ThemeProvider } from '@mui/material';
import { ReportWarnings } from '../../apps/web/src/modules/finance/report-warnings';
import { theme } from '../../apps/web/src/shared/ui/theme';

let root: Root | undefined;
export function mountReportWarningsFixture(container: HTMLElement, count: number) {
    const warnings = Array.from({ length: count }, (_, i) => `Nguồn ${i}: ` + 'Cảnh báo dài về giới hạn dữ liệu tổng hợp. '.repeat(8));
    root?.unmount(); root = createRoot(container);
    root.render(<ThemeProvider theme={theme}><ReportWarnings warnings={warnings}/><Button>Tiếp tục kiểm tra</Button></ThemeProvider>);
    return warnings;
}
