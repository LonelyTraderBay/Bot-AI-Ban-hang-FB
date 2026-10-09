from pathlib import Path
root=Path(__file__).resolve().parents[2]
pending={}
def edit(file,old,new,count=1):
    p=root/file
    text=pending.get(p,p.read_text(encoding='utf-8-sig'))
    assert text.count(old)==count,(file,old[:80],text.count(old),count)
    pending[p]=text.replace(old,new)

file='apps/web/src/app/Shell.tsx'
edit(file,'Navigate, Outlet, useBlocker, useLocation','Navigate, Outlet, useLocation')
edit(file,'Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, ','')
edit(file,"import { consumeFormSubmissionNavigation, hasUnsavedFormDraft, observeFormSubmissions } from './dirty-drafts';","import { hasUnsavedFormDraft } from './dirty-drafts';\nimport {DraftNavigationGuard} from './DraftNavigationGuard';")
text=(root/file).read_text(encoding='utf-8-sig')
start=text.index('    const blocker = useBlocker(')
end=text.index('    const membership = ',start)
edit(file,text[start:end],'')
edit(file,'    useEffect(() => observeFormSubmissions(), []);\n','')
start=text.index('    useEffect(() => {\n        const prevent = (event: BeforeUnloadEvent)')
end=text.index('    if (loading)',start)
edit(file,text[start:end],'')
start=text.index('<Dialog open={blocker.state')
end=text.index('<FeedbackDialog ',start)
edit(file,text[start:end],'<DraftNavigationGuard logoutPending={logoutPending} onCancelLogout={() => setLogoutPending(false)} onDiscardLogout={performLogout}/>')

file='apps/web/src/modules/workspace/index.tsx'
edit(file,"import { useEffect, useState } from 'react';","import { useEffect, useRef, useState } from 'react';")
edit(file,"import { useDraftForm } from '@/shared/model/dirty-drafts';","import { markDraftClean, useDraftForm } from '@/shared/model/dirty-drafts';")
edit(file,"    const save = async () => { setPending(true); setError(null); try {", "    const formElement = useRef<HTMLFormElement>(null);\n    const baseline = useRef({name: '',currency: 'VND',timezone: 'Asia/Vientiane'});\n    const mounted = useRef(true);\n    useEffect(() => { mounted.current=true; return () => { mounted.current=false; }; },[]);\n    const bindDraft = useDraftForm(name!==baseline.current.name || currency!==baseline.current.currency || timezone!==baseline.current.timezone);\n    const save = async () => { if (pending) return; setPending(true); setError(null); try {")
edit(file,"        navigate(`/s/${r.data.id}/overview`);", "        if (!mounted.current) return;\n        baseline.current={name,currency,timezone};\n        if (formElement.current) markDraftClean(formElement.current);\n        navigate(`/s/${r.data.id}/overview`);")
edit(file,"        setError(e instanceof Error ? e : new Error('Không tạo được cửa hàng'));", "        if (mounted.current) setError(e instanceof Error ? e : new Error('Không tạo được cửa hàng'));")
edit(file,"        setPending(false);\n    } };\n    return <AuthCard><Typography component=\"h1\" variant=\"h4\" sx={layoutSx.auth.brandTitleGap}>Tạo cửa hàng", "        if (mounted.current) setPending(false);\n    } };\n    return <AuthCard><Typography component=\"h1\" variant=\"h4\" sx={layoutSx.auth.brandTitleGap}>Tạo cửa hàng")
edit(file,'<ErrorNotice error={error}/><FormFields ><TextField label="Tên cửa hàng"','<ErrorNotice error={error}/><FormFields component="form" noValidate ref={element => {formElement.current=element;bindDraft(element);}} onSubmit={event => {event.preventDefault();void save();}}><TextField disabled={pending} label="Tên cửa hàng"')
edit(file,'<TextField label="Tiền tệ cơ sở" select','<TextField disabled={pending} label="Tiền tệ cơ sở" select')
edit(file,'<TextField label="Múi giờ" value={timezone} onChange={e => setTimezone(e.target.value)}','<TextField disabled={pending} label="Múi giờ" value={timezone} onChange={e => setTimezone(e.target.value)}')
edit(file,'<Button variant="contained" disabled={!name.trim() || !timezone || pending} onClick={() => void save()}>Tạo cửa hàng','<Button type="submit" variant="contained" disabled={!name.trim() || !timezone || pending}>Tạo cửa hàng')

for file in ['catalog','customers','orders','knowledge']:
    p=f'apps/web/src/modules/{file}/index.tsx'
    original=(root/p).read_text(encoding='utf-8-sig')
    pending[root/p]="import {useListReturn} from '@/shared/model/list-return';\n"+original
    if file=='catalog':
        edit(p,'export function ProductPage() {', 'export function ProductPage() {') if False else None
        # The list return is used only by the detail/create editor, not the collection.
        edit(p,'actions={<Button component={RouterLink} to={`/s/${shop.id}/products`}>Danh sách</Button>}', 'actions={<Button component={RouterLink} to={listHref}>Danh sách</Button>}')
        edit(p,"    const { productId } = useParams();", "    const { productId } = useParams();") if False else None
        marker='    const { shop } = useScope();'
        text=pending[root/p]
        function_start=text.index('export function ProductEditorPage')
        position=text.index(marker,function_start)+len(marker)
        pending[root/p]=text[:position]+"\n    const listHref=useListReturn(`/s/${shop.id}/products`);"+text[position:]
    elif file=='customers':
        edit(p,"to={'/s/' + shop.id + '/customers'}",'to={listHref}')
        text=pending[root/p];start=text.index('export function CustomerPage');position=text.index('    const { shop } = useScope();',start)+len('    const { shop } = useScope();');pending[root/p]=text[:position]+"\n    const listHref=useListReturn(`/s/${shop.id}/customers`);"+text[position:]
    elif file=='orders':
        text=pending[root/p];start=text.index('export function OrderDetailPage');position=text.index('    const { shop } = useScope();',start)+len('    const { shop } = useScope();');pending[root/p]=text[:position]+"\n    const listHref=useListReturn(`/s/${shop.id}/orders`);"+text[position:]
        edit(p,'subtitle="Mọi thay đổi quan trọng kiểm lại phiên bản và điều kiện nghiệp vụ." actions={<RouteLink to={`/s/${shop.id}/orders`}>','subtitle="Mọi thay đổi quan trọng kiểm lại phiên bản và điều kiện nghiệp vụ." actions={<RouteLink to={listHref}>')
    else:
        text=pending[root/p];start=text.index('export function KnowledgeDetailPage');position=text.index('    const { shop } = useScope();',start)+len('    const { shop } = useScope();');pending[root/p]=text[:position]+"\n    const listHref=useListReturn(`/s/${shop.id}/knowledge`);"+text[position:]
        edit(p,'subtitle="Lịch sử phiên bản không bị thay bởi nội dung hiện tại." actions={<RouteLink to={`/s/${shop.id}/knowledge`}>','subtitle="Lịch sử phiên bản không bị thay bởi nội dung hiện tại." actions={<RouteLink to={listHref}>')
for p,text in pending.items():p.write_text(text,encoding='utf-8')
print('C02 checked edits',len(pending))
