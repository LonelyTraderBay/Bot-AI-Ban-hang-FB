import { createRoot } from 'react-dom/client';
import { Box, Button, ThemeProvider } from '@mui/material';
import { DetailLine, Panel } from '../../apps/web/src/shared/ui/components';
import { SurfaceContent } from '../../apps/web/src/shared/ui/composition';
import { theme } from '../../apps/web/src/shared/ui/theme';

export async function prepareNativeScenario(caseId: string) {
    if (caseId === 'detail-long') {
        const container = document.createElement('div');
        document.querySelector('main')!.replaceChildren(container);
        const long = 'Nội dung nhãn tiếng Việt dài để kiểm tra xuống dòng. '.repeat(6);
        createRoot(container).render(<ThemeProvider theme={theme}>
            <Panel title="Kiểm tra DetailLine nội dung dài" bodyMode="inset"><SurfaceContent>
                <DetailLine label={long}><strong>{'ID'.repeat(100)}</strong></DetailLine>
                <DetailLine label="Giá trị rỗng">Chưa có dữ liệu</DetailLine>
            </SurfaceContent></Panel>
            <Box><DetailLine label={long}>{'VALUE'.repeat(40)}</DetailLine></Box>
            <Button>Điểm tập trung thứ nhất</Button><Button>Điểm tập trung kế tiếp</Button>
        </ThemeProvider>);
    }
    const deadline = Date.now() + 15000;
    while (!document.querySelector('main [data-ui-detail-line],main input,main button,main a[href]')) {
        if (Date.now() > deadline) throw new Error('No native fixture target ' + caseId);
        await new Promise(resolve => setTimeout(resolve, 30));
    }
    const main = document.querySelector('main')!;
    const target = main.querySelector('[data-ui-detail-line],.MuiPaper-root,[data-ui-composition="form-fields"]');
    const focus = [...main.querySelectorAll<HTMLElement>('input:not([type="hidden"]):not(:disabled),button:not(:disabled),a[href],[role="combobox"]')].find(element => element.getClientRects().length > 0);
    if (!target || !focus) throw new Error('No real target/focus ' + caseId);
    target.setAttribute('data-native-target', 'true');
    focus.setAttribute('data-native-focus', 'true');
    await document.fonts.ready;
    return JSON.stringify({ method: caseId === 'detail-long' ? 'Actual shared React component with synthetic long caption/value in flow and plain containers' : 'Actual route, markers only; no style, data, contract or HTTP changes' });
}
