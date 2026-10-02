import { useState } from 'react';
import type { ReactNode } from 'react';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {Alert,Button,CssBaseline,TextField,ThemeProvider} from '@mui/material';
import {MemoryRouter,useSearchParams} from 'react-router-dom';
import {colors,tokens} from '@botsales/tokens';
import {theme} from '../src/shared/ui/theme';
import {DataTable,EditDialog,Empty,ErrorNotice,Pager,Panel,QueryState,Status,Toolbar} from '../src/shared/ui/components';
import {UnknownResultError} from '../src/shared/api/errors';
import {auditAppDesignSource,readProjectFile} from '../../../tests/design/palette-guard.mjs';

function renderWithTheme(ui: ReactNode) {
    return render(<ThemeProvider theme={theme}><CssBaseline/>{ui}</ThemeProvider>);
}

afterEach(cleanup);

function QueryProbe() {
    const [params] = useSearchParams();
    return <output aria-label="Bộ lọc">{params.toString()}</output>;
}

function contrastRatio(foreground: string, background: string) {
    const luminance = (hex: string) => {
        const channels = hex.slice(1).match(/.{2}/g)!.map(channel => parseInt(channel,16)/255).map(value => value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
        return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
    };
    const first=luminance(foreground),second=luminance(background);
    return (Math.max(first,second)+.05)/(Math.min(first,second)+.05);
}

function DialogHarness({ onClose }: { onClose: () => void }) {
    const [open, setOpen] = useState(false);
    return <>
        <Button onClick={() => setOpen(true)}>Mở hộp thoại</Button>
        <EditDialog open={open} title="Sửa khách hàng" description="Xem lại dữ liệu trước khi lưu." onClose={() => { onClose(); setOpen(false); }} actions={<Button variant="contained">Lưu</Button>}>
            <TextField label="Tên khách hàng" error helperText="Tên là bắt buộc"/>
        </EditDialog>
    </>;
}

describe('Graphite Gold theme contract',()=>{
    it('maps the approved dark tokens, typography, radii, and responsive breakpoints',()=>{
        expect(theme.palette.mode).toBe('dark');
        expect(theme.palette.background).toMatchObject({default:colors.canvas,paper:colors.surface});
        expect(theme.palette.primary).toMatchObject({main:colors.accent,light:colors.accentHover,dark:colors.accentPressed,contrastText:colors.onAccent});
        expect(theme.palette.success.main).toBe(colors.success);
        expect(theme.palette.warning.main).toBe(colors.warning);
        expect(theme.palette.error.main).toBe(colors.danger);
        expect(theme.typography.fontFamily).toBe(tokens.fontFamily);
        expect(theme.typography.fontSize).toBe(tokens.fontSizes.body);
        expect(theme.typography.body1.fontSize).toBe(tokens.fontSizes.body);
        expect(theme.typography.subtitle1.fontSize).toBe(tokens.fontSizes.bodyComfortable);
        expect(theme.typography.caption.fontSize).toBe(tokens.fontSizes.meta);
        expect(theme.typography.h4.fontSize).toBe(tokens.fontSizes.pageTitle);
        expect(theme.typography.h5.fontSize).toBe(tokens.fontSizes.sectionTitle);
        expect(theme.typography.h6.fontSize).toBe(tokens.fontSizes.sectionTitle);
        expect(theme.shape.borderRadius).toBe(tokens.radius.control);
        expect(theme.spacing(1)).toBe(`${tokens.space.sm}px`);
        for(const [factor,value] of [[.5,tokens.space.xs],[1,tokens.space.sm],[1.5,tokens.space.md],[2,tokens.space.lg],[3,tokens.space.xl],[4,tokens.space.xxl],[6,tokens.space.xxxl]]) {
            expect(theme.spacing(factor)).toBe(`${value}px`);
        }
        expect(theme.breakpoints.values.sm).toBe(tokens.breakpoints.mobileMaxExclusive);
        expect(theme.breakpoints.up('md')).toBe(`@media (min-width:${tokens.breakpoints.tabletMin}px)`);
        expect(theme.breakpoints.up('lg')).toBe(`@media (min-width:${tokens.breakpoints.desktopMin}px)`);
        expect(theme.breakpoints.values.xl).toBe(tokens.breakpoints.desktopMin);
    });

    it('keeps primary, secondary, status, and control contrast above their design thresholds',()=>{
        const textPairs=[[colors.textPrimary,colors.canvas],[colors.textPrimary,colors.surface],[colors.textSecondary,colors.surface],[colors.textMuted,colors.input],[colors.accent,colors.canvas],[colors.onAccent,colors.accent],[colors.success,colors.successSurface],[colors.warning,colors.warningSurface],[colors.danger,colors.dangerSurface],[colors.info,colors.infoSurface]];
        for(const [foreground,background] of textPairs) expect(contrastRatio(foreground,background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.borderControl,colors.input)).toBeGreaterThanOrEqual(3);
    });

    it('applies semantic token surfaces to standard alerts',()=>{
        const {container}=renderWithTheme(<><Alert severity="success">Thành công</Alert><Alert severity="warning">Cảnh báo</Alert><Alert severity="error">Lỗi</Alert><Alert severity="info">Thông tin</Alert></>);
        const alerts=[...container.querySelectorAll('[role="alert"]')];
        expect(alerts.map(alert=>getComputedStyle(alert).backgroundColor)).toEqual([
            'rgb(25, 59, 51)','rgb(62, 48, 39)','rgb(64, 40, 50)','rgb(37, 53, 75)',
        ]);
        expect(alerts.map(alert=>getComputedStyle(alert).color)).toEqual([
            'rgb(77, 215, 163)','rgb(255, 176, 120)','rgb(255, 133, 150)','rgb(138, 188, 251)',
        ]);
    });

    it('loads canonical dark tokens and bootstrap before application JavaScript',()=>{
        const html=readProjectFile('apps/web/index.html');
        const bootstrap=readProjectFile('apps/web/src/app/bootstrap.css');
        expect(html).toContain('<html lang="vi">');
        expect(html).toContain('<meta name="color-scheme" content="dark"/>');
        expect(html.indexOf('/src/app/tokens.css')).toBeLessThan(html.indexOf('/src/app/bootstrap.css'));
        expect(html.indexOf('/src/app/bootstrap.css')).toBeLessThan(html.indexOf('/src/main.tsx'));
        expect(bootstrap).toContain('html{min-height:100%;color-scheme:dark;background-color:var(--color-canvas)');
        expect(bootstrap).toContain('body,#root{min-height:100%;background-color:var(--color-canvas)');
        expect(bootstrap).toContain('scrollbar-color:var(--color-raised) var(--color-canvas)');
        expect(bootstrap).toContain(`animation-duration:${tokens.motion.reducedMotionMs}ms!important;transition-duration:${tokens.motion.reducedMotionMs}ms!important`);
        const bootstrapFont=bootstrap.match(/font-family:([^;}]+)/)?.[1].split(',').map(font=>font.trim()).join(',');
        expect(bootstrapFont).toBe(tokens.fontFamily.split(',').map(font=>font.trim()).join(','));
        expect(bootstrap).toContain('@media(forced-colors:active)');
    });

    it('keeps the application theme and source palette dark-only and token-owned',()=>{
        expect(auditAppDesignSource()).toEqual([]);
        const main=readProjectFile('apps/web/src/main.tsx');
        expect(main.match(/<ThemeProvider\b/g)).toHaveLength(1);
        expect(main.match(/<ThemeProvider\b[\s\S]*?<CssBaseline\s*\/>/)).not.toBeNull();
    });

    it('rejects copied HEX values and non-dark theme modes with negative fixtures',()=>{
        const result=auditAppDesignSource({fixtures:[
            {path:'negative/copied-hex.ts',content:'const accent = "#003366";'},
            {path:'negative/light-mode.ts',content:'createTheme({ palette: { mode: "light" } });'},
        ]});
        expect(result.map(finding=>finding.ruleId)).toEqual(['design.literal-hex','theme.non-dark-mode']);
    });
});

describe('Accessible shared presentation',()=>{
    it('uses the canonical touch target for primary controls',()=>{
        renderWithTheme(<Button>Thao tác</Button>);
        expect(getComputedStyle(screen.getByRole('button')).minHeight).toBe(`${tokens.layout.touchTarget}px`);
    });

    it('uses the approved card radius rather than MUI spacing-scaled radius',()=>{
        const {container}=renderWithTheme(<Panel title="Thông tin cửa hàng">Nội dung</Panel>);
        const card=container.querySelector('.MuiPaper-root');
        expect(card).not.toBeNull();
        expect(getComputedStyle(card!).borderRadius).toBe(`${tokens.radius.card}px`);
    });

    it('renders semantic status text and a keyboard-navigable, named table region',()=>{
        renderWithTheme(<DataTable rows={[{id:'1',name:'Sản phẩm mẫu'}]} rowKey={r=>r.id} columns={[{key:'name',label:'Tên',render:r=>r.name}]} label="Danh sách sản phẩm"/>);
        expect(screen.getByRole('region',{name:'Danh sách sản phẩm'})).toHaveAttribute('tabindex','0');
        expect(screen.getByRole('table',{name:'Danh sách sản phẩm'})).toBeInTheDocument();
        expect(screen.getByText('Cuộn ngang để xem đủ cột.')).toBeInTheDocument();
        expect(screen.getByRole('columnheader')).toHaveTextContent('Tên');
        expect(screen.getByText('Sản phẩm mẫu')).toBeInTheDocument();
    });

    it('keeps status and empty states understandable without relying on color',()=>{
        renderWithTheme(<><Status value="unknown"/><Empty text="Chưa có kết quả phù hợp."/></>);
        expect(screen.getByText(/chưa rõ/i)).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Chưa có kết quả phù hợp.');
    });

    it('shows a reserved loading state and a retryable error state',async()=>{
        const refetch=vi.fn();
        const loading=renderWithTheme(<QueryState query={{isPending:true,isError:false,error:null,refetch}}>Nội dung</QueryState>);
        expect(screen.getByRole('status')).toHaveTextContent('Đang tải dữ liệu');
        expect(screen.getByRole('progressbar',{name:'Đang tải dữ liệu'})).toBeInTheDocument();
        loading.unmount();
        renderWithTheme(<QueryState query={{isPending:false,isError:true,error:new Error('Không thể tải'),refetch}}>Nội dung</QueryState>);
        expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải');
        await userEvent.click(screen.getByRole('button',{name:'Thử lại'}));
        expect(refetch).toHaveBeenCalledOnce();
    });

    it('clears search, cursor, and returns focus while preserving other filters',async()=>{
        const user=userEvent.setup();
        renderWithTheme(<MemoryRouter initialEntries={['/s/shop/orders?status=open&cursor=next&q=old']}><Toolbar placeholder="Tìm mã đơn"/><QueryProbe/></MemoryRouter>);
        const input=screen.getByRole('textbox',{name:'Tìm kiếm'});
        await user.click(screen.getByRole('button',{name:'Xóa tìm kiếm'}));
        expect(input).toHaveFocus();
        expect(screen.getByLabelText('Bộ lọc')).toHaveTextContent('status=open');
        await user.type(input,'  don-123  ');
        await user.click(screen.getByRole('button',{name:'Tìm kiếm'}));
        expect(screen.getByLabelText('Bộ lọc')).toHaveTextContent('status=open&q=don-123');
    });

    it('moves between cursor pages without dropping unrelated query filters',async()=>{
        const user=userEvent.setup();
        renderWithTheme(<MemoryRouter initialEntries={['/s/shop/categories?status=active&cursor=current']}><Pager page={{limit:20,total:25,hasMore:true,nextCursor:'cursor-next'}}/><QueryProbe/></MemoryRouter>);
        await user.click(screen.getByRole('button',{name:'Trang tiếp'}));
        expect(screen.getByLabelText('Bộ lọc')).toHaveTextContent('status=active&cursor=cursor-next');
        await user.click(screen.getByRole('button',{name:'Đầu danh sách'}));
        expect(screen.getByLabelText('Bộ lọc')).toHaveTextContent('status=active');
    });

    it('does not submit an unfinished IME composition',()=>{
        renderWithTheme(<MemoryRouter><Toolbar/><QueryProbe/></MemoryRouter>);
        const input=screen.getByRole('textbox',{name:'Tìm kiếm'});
        const event=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,isComposing:true});
        fireEvent(input,event);
        expect(event.defaultPrevented).toBe(true);
    });

    it('associates form errors with the visible label and returns focus after dialog close',async()=>{
        const user=userEvent.setup();
        const onClose=vi.fn();
        renderWithTheme(<DialogHarness onClose={onClose}/>);
        const opener=screen.getByRole('button',{name:'Mở hộp thoại'});
        await user.click(opener);
        const dialog=screen.getByRole('dialog',{name:'Sửa khách hàng'});
        const descriptionId=dialog.getAttribute('aria-describedby');
        expect(descriptionId).toBeTruthy();
        expect(document.getElementById(descriptionId || '')).toHaveTextContent('Xem lại dữ liệu trước khi lưu.');
        const field=screen.getByRole('textbox',{name:'Tên khách hàng'});
        expect(field).toHaveAttribute('aria-invalid','true');
        expect(document.getElementById(field.getAttribute('aria-describedby') || '')).toHaveTextContent('Tên là bắt buộc');
        await user.keyboard('{Escape}');
        await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        await waitFor(()=>expect(opener).toHaveFocus());
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('has no axe violations in the shared table, status, and search states',async()=>{
        const {container}=renderWithTheme(<MemoryRouter><Toolbar/><Status value="active"/><DataTable rows={[{id:'1',name:'Sản phẩm mẫu'}]} rowKey={r=>r.id} columns={[{key:'name',label:'Tên',render:r=>r.name}]} label="Danh sách sản phẩm"/></MemoryRouter>);
        const results=await axe.run(container,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},rules:{'color-contrast':{enabled:false}}});
        expect(results.violations.map(issue=>issue.id)).toEqual([]);
    });

    it('reflows the real mock application from 320px to 1440px and passes browser axe',async()=>{
        const auditOutput=execFileSync(process.execPath,[path.join(process.cwd(),'tests','design','run-browser-audit.mjs')],{cwd:process.cwd(),encoding:'utf8',timeout:45000});
        const reportLine=auditOutput.split(/\r?\n/).find(line=>line.startsWith('BROWSER_AUDIT_JSON '));
        expect(reportLine).toBeDefined();
        const report=JSON.parse(reportLine!.slice('BROWSER_AUDIT_JSON '.length));
        expect(report.preJavaScript).toEqual({html:'rgb(17, 19, 24)',body:'rgb(17, 19, 24)',root:'rgb(17, 19, 24)',colorScheme:'dark'});
        expect(report.accessibilityPreferences).toMatchObject({forcedColors:true,reducedMotion:true,focusedTag:'A',focusOutline:'solid',scrollBehavior:'auto'});
        expect(report.viewports.map(view=>[view.width,view.kpiColumns,view.documentWidth<=view.contentWidth])).toEqual([
            [320,1,true],[390,1,true],[768,2,true],[1440,4,true],
        ]);
        expect(report.viewports[0].tableScrollsLocally).toBe(true);
        expect(report.viewports[0].tableHintVisible).toBe(true);
        expect(report.axe.mainViolations).toEqual([]);
        expect(report.axe.appViolations).toEqual([]);
    },30000);
});
