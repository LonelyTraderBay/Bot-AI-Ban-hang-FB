import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Button, TextField, ThemeProvider } from '@mui/material';
import { Toolbar } from '../../apps/web/src/shared/ui/components';
import { FieldGroup } from '../../apps/web/src/shared/ui/composition';
import { theme } from '../../apps/web/src/shared/ui/theme';
import { http, HttpResponse } from 'msw';
import { worker } from '../../apps/web/src/mocks/browser';
import { db } from '../../apps/web/src/mocks/database';

let releasePage: (() => void) | undefined;
let failLookup = true;
export function installCategoryLookupBranches() {
    const template = db.categories.find(row => row.id === 'cat-0')!;
    for (let index = 0; index < 61; index++) db.categories.push({ ...template, id: `toolbar-category-${index}`, name: `Toolbar lookup ${index}` });
    worker.use(http.get('*/api/v2/shops/shop-demo/categories', async ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get('q') === 'toolbar-lookup-error' && failLookup) return HttpResponse.error();
        if (params.get('q') === 'Toolbar lookup' && params.has('cursor')) await new Promise<void>(resolve => { releasePage = resolve; });
        // Let the original canonical MSW handler supply validated data and real pagination.
        return undefined;
    }));
}
export function releaseCategoryPage() {
    if (!releasePage) throw new Error('No pending category page');
    releasePage(); releasePage = undefined;
}
export function recoverCategoryLookup() { failLookup = false; }

/** Real shared owner with a deliberately tall existing extra slot, outside product code. */
export function mountToolbarFixture(container: HTMLElement) {
    const root = createRoot(container);
    root.render(<ThemeProvider theme={theme}><MemoryRouter><Toolbar operation="listProducts"
        extra={<FieldGroup><TextField label="Lọc một" helperText="Hướng dẫn dài cần xuống dòng khi vùng lọc hẹp." /><TextField label="Lọc hai" helperText="Thông tin phụ không được làm nút submit cao theo toàn nhóm." /><Button>Thử lại bộ lọc</Button></FieldGroup>} />
    </MemoryRouter></ThemeProvider>);
}
