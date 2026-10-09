import {useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Alert,Button,MenuItem,TextField} from '@mui/material';
import {useForm,useWatch,useFieldArray} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import type {OpeningBalance,OpeningBalanceWrite} from '@botsales/contracts';
import {useApi,useCommand,usePagedApi} from '@/shared/api/hooks';
import {useScope,useCan} from '@/shared/model/scope';
import {useListQuery} from '@/shared/model/filters';
import {useDraftForm,markDraftClean} from '@/shared/model/dirty-drafts';
import {useVersionedDraft,draftEqual} from '@/shared/model/versioned-draft';
import {dateTime,dateOnlyInTimezone,isValidDateOnly,codePointLength,formatDateOnly} from '@/shared/model/format';
import {DraftConflict} from '@/shared/ui/draft-conflict';
import {ActionGroup,FormFields,SurfaceContent} from '@/shared/ui/composition';
import {Amount,ConfirmDialog,DataTable,DetailLine,EditDialog,ErrorNotice,LookupLoadMore,MutationButton,PageHeader,Pager,Panel,QueryState,RouteLink,Stat,Stats,Status,Toolbar} from '@/shared/ui/components';
import {useReportRange,ReportRangeFields} from './report-range';
import {accountGroupName} from './accounts';

export function BookProvenance({report}: {report:{asOf:string;policyVersion?:string;completeness?:string;warnings:string[];sourceJournalIds?:string[]}}) {
    const {shop}=useScope();
    return <SurfaceContent>
        <DetailLine label="Dữ liệu tại">{dateTime(report.asOf,shop.timezone)}</DetailLine>
        <DetailLine label="Chính sách">{report.policyVersion||'Chưa có'}</DetailLine>
        <DetailLine label="Mức đầy đủ"><Status value={report.completeness||'incomplete'}/></DetailLine>
        {report.warnings.map(w=><Alert key={w} severity="warning">{w}</Alert>)}
        {report.sourceJournalIds&&<ActionGroup>{report.sourceJournalIds.length?report.sourceJournalIds.map(id=><RouteLink key={id} to={`/s/${shop.id}/finance/journals?journalId=${encodeURIComponent(id)}`}>Chứng từ {id}</RouteLink>):<Alert severity="info">Không có bút toán trong khoảng này.</Alert>}</ActionGroup>}
    </SurfaceContent>;
}
export function LedgerPage() {
    const {shop}=useScope(),range=useReportRange(shop.timezone),[params,setParams]=useSearchParams();
    const accountId=params.get('accountId')||undefined,cursor=params.get('cursor')||undefined;
    const accounts=usePagedApi('listAccounts');
    const query=useApi('getLedger',{query:{...range.query,accountId,cursor,limit:20}},range.valid),report=query.data?.data;
    return <><PageHeader title="Sổ cái" subtitle="Tổng Nợ, Có và số dư lấy từ toàn bộ chứng từ trong khoảng; phân trang chỉ áp dụng các dòng chi tiết."/>
        <ReportRangeFields range={range.range} timezone={shop.timezone} setFrom={range.setFrom} setTo={range.setTo}/>
        <FormFields afterGap="section"><TextField select label="Tài khoản sổ cái" value={accountId||''} onChange={e=>{const next=new URLSearchParams(params);next.delete('cursor');if(e.target.value)next.set('accountId',e.target.value);else next.delete('accountId');setParams(next);}}>
            <MenuItem value="">Tất cả tài khoản</MenuItem>{accountId&&!accounts.data?.data.some(a=>a.id===accountId)&&<MenuItem value={accountId}>Đang giữ tài khoản {accountId}</MenuItem>}{accounts.data?.data.map(a=><MenuItem key={a.id} value={a.id}>{a.code} · {a.name}</MenuItem>)}</TextField><ErrorNotice error={accounts.error}/><LookupLoadMore label="tài khoản" loadedCount={accounts.loadedCount} hasMore={accounts.hasMore} busy={accounts.isLoadingMore} onLoadMore={accounts.loadMore}/></FormFields>
        {range.valid?<QueryState query={query} pendingProfile="section">{report&&<><Stats><Stat title="Số dư đầu khoảng (Nợ − Có)" value={<Amount wrap value={report.openingBalance}/>}/><Stat title="Tổng phát sinh Nợ" value={<Amount wrap value={report.totalDebit}/>}/><Stat title="Tổng phát sinh Có" value={<Amount wrap value={report.totalCredit}/>}/><Stat title="Số dư cuối khoảng (Nợ − Có)" value={<Amount wrap value={report.closingBalance}/>}/></Stats><Panel title="Các dòng sổ cái"><DataTable label="Sổ cái theo chứng từ" rows={report.entries} rowKey={r=>r.id} columns={[
            {key:'date',label:'Ngày hiệu lực',render:r=>formatDateOnly(r.effectiveDate)},{key:'account',label:'Tài khoản',render:r=>`${r.accountCode} · ${r.accountName}`},{key:'note',label:'Diễn giải',render:r=>r.description},{key:'debit',label:'Nợ',render:r=><Amount value={r.debit}/>},{key:'credit',label:'Có',render:r=><Amount value={r.credit}/>},{key:'balance',label:'Số dư tài khoản (Nợ − Có)',render:r=><Amount value={r.balance}/>},{key:'source',label:'Chứng từ',render:r=><RouteLink to={`/s/${shop.id}/finance/journals?journalId=${r.journalId}`}>Mã chứng từ: {r.journalId}</RouteLink>},
        ]}/><Pager page={report.page}/></Panel><Panel title="Nguồn và giới hạn" bodyMode="inset" beforeGap="section"><BookProvenance report={report}/></Panel></>}</QueryState>:<Alert severity="error">Ngày bắt đầu phải trước ngày kết thúc.</Alert>}
    </>;
}
export function TrialBalancePage() {
    const {shop}=useScope(),range=useReportRange(shop.timezone),query=useApi('getTrialBalance',{query:range.query},range.valid),report=query.data?.data;
    return <><PageHeader title="Cân đối phát sinh" subtitle="Số dư đầu, phát sinh và số dư cuối do read-model tổng hợp đầy đủ theo tài khoản."/><ReportRangeFields range={range.range} timezone={shop.timezone} setFrom={range.setFrom} setTo={range.setTo}/>
        {range.valid?<QueryState query={query} pendingProfile="section">{report&&<><Stats><Stat title="Phát sinh Nợ" value={<Amount wrap value={report.totalDebit}/>}/><Stat title="Phát sinh Có" value={<Amount wrap value={report.totalCredit}/>}/><Stat title="Chênh lệch cuối" value={<Amount wrap value={report.difference}/>}/><Stat title="Kiểm cân bằng" value={report.balanced?'Cân bằng':'Không cân bằng'}/></Stats><Panel title="Cân đối theo tài khoản"><DataTable label="Cân đối phát sinh các tài khoản" rows={report.rows} rowKey={r=>r.accountId} columns={[
            {key:'code',label:'Tài khoản',render:r=><RouteLink to={`/s/${shop.id}/finance/ledger?accountId=${r.accountId}&fromDate=${range.range.from}&toDate=${range.range.to}`}>{r.code} · {r.name}</RouteLink>},{key:'openingDebit',label:'Đầu kỳ Nợ',render:r=><Amount value={r.openingDebit}/>},{key:'openingCredit',label:'Đầu kỳ Có',render:r=><Amount value={r.openingCredit}/>},{key:'debit',label:'Phát sinh Nợ',render:r=><Amount value={r.debit}/>},{key:'credit',label:'Phát sinh Có',render:r=><Amount value={r.credit}/>},{key:'closingDebit',label:'Cuối kỳ Nợ',render:r=><Amount value={r.closingDebit}/>},{key:'closingCredit',label:'Cuối kỳ Có',render:r=><Amount value={r.closingCredit}/>},
        ]}/></Panel><Panel title="Nguồn và giới hạn" bodyMode="inset" beforeGap="section"><BookProvenance report={report}/></Panel></>}</QueryState>:<Alert severity="error">Ngày bắt đầu phải trước ngày kết thúc.</Alert>}
    </>;
}
export function BalanceSheetPage() {
    const {shop}=useScope(),[params,setParams]=useSearchParams();const atDate=params.get('atDate')??dateOnlyInTimezone(new Date(),shop.timezone),valid=isValidDateOnly(atDate);
    const query=useApi('getBalanceSheet',{query:{atDate}},valid),report=query.data?.data;
    return <><PageHeader title="Cân đối quản trị" subtitle="Tài sản = nợ phải trả + vốn chủ sở hữu + kết quả lũy kế; đây là báo cáo quản trị theo chính sách của shop."/><FormFields afterGap="section"><TextField type="date" label="Tại ngày" value={atDate} onChange={e=>{const next=new URLSearchParams(params);next.set('atDate',e.target.value);setParams(next);}}/></FormFields>
        {valid?<QueryState query={query} pendingProfile="section">{report&&<><Stats><Stat title="Tài sản" value={<Amount wrap value={report.assets}/>}/><Stat title="Nợ phải trả" value={<Amount wrap value={report.liabilities}/>}/><Stat title="Vốn chủ sở hữu" value={<Amount wrap value={report.equity}/>}/><Stat title="Kết quả lũy kế" value={<Amount wrap value={report.retainedProfit}/>}/></Stats><Panel title="Kiểm cân đối" bodyMode="inset"><DetailLine label="Cân bằng">{report.balanced?'Có':'Không'}</DetailLine><DetailLine label="Chênh lệch"><Amount wrap value={report.difference}/></DetailLine></Panel><Panel title="Số dư theo nhóm" beforeGap="section"><DataTable label="Tài khoản của báo cáo cân đối quản trị" rows={report.rows} rowKey={r=>r.accountId} columns={[
            {key:'code',label:'Tài khoản',render:r=><RouteLink to={`/s/${shop.id}/finance/ledger?accountId=${r.accountId}`}>{r.code} · {r.name}</RouteLink>},{key:'group',label:'Nhóm',render:r=>accountGroupName[r.group]},{key:'balance',label:'Số dư theo chiều nhóm',render:r=><Amount value={r.balance}/>},
        ]}/></Panel><Panel title="Nguồn và giới hạn" bodyMode="inset" beforeGap="section"><BookProvenance report={report}/></Panel></>}</QueryState>:<Alert severity="error">Chọn ngày hợp lệ.</Alert>}
    </>;
}
const exact=z.string().regex(/^\d+(\.\d{1,4})?$/,'Nhập số không âm, tối đa 4 chữ số thập phân.');
const moneySchema=z.object({amount:exact,currency:z.string().min(1)});
const reasonSchema=z.string().refine(v=>codePointLength(v)<=1000,'Lý do tối đa 1.000 ký tự.').trim().min(5,'Lý do cần ít nhất 5 ký tự.');
const periodSchema=z.object({startDate:z.string().refine(isValidDateOnly,'Chọn ngày hợp lệ.'),endDate:z.string().refine(isValidDateOnly,'Chọn ngày hợp lệ.'),reason:reasonSchema}).refine(v=>v.startDate<=v.endDate,{path:['endDate'],message:'Ngày cuối kỳ phải từ ngày đầu kỳ trở đi.'});
export function CreatePeriodDialog({onClose,onSaved}:{onClose:()=>void;onSaved:()=>void}) {
    const create=useCommand('createAccountingPeriod',['listAccountingPeriods']);
    const form=useForm<z.infer<typeof periodSchema>>({defaultValues:{startDate:'',endDate:'',reason:''},resolver:zodResolver(periodSchema)});useWatch({control:form.control});
    const bind=useDraftForm(form.formState.isDirty),ref=useRef<HTMLFormElement|null>(null);
    return <EditDialog open title="Tạo kỳ kế toán" onClose={onClose} busy={create.pending} actions={<Button type="submit" form="period-create" variant="contained" disabled={create.pending||create.unresolved}>Tạo kỳ kế toán</Button>}><ErrorNotice error={create.error}/>
        <FormFields component="form" id="period-create" noValidate ref={node=>{ref.current=node;bind(node);}} data-draft-clean={!form.formState.isDirty?'true':undefined} onSubmit={form.handleSubmit(async values=>{try{await create.execute({body:values});if(ref.current)markDraftClean(ref.current);onSaved();onClose();}catch{/* Retain draft and recovery. */}})}>
            <Alert severity="info">Kỳ mới phải không chồng lấn kỳ đã có; API kiểm lại trước khi tạo.</Alert>
            <TextField label="Ngày đầu kỳ" type="date" {...form.register('startDate')} error={Boolean(form.formState.errors.startDate)} helperText={form.formState.errors.startDate?.message}/>
            <TextField label="Ngày cuối kỳ" type="date" {...form.register('endDate')} error={Boolean(form.formState.errors.endDate)} helperText={form.formState.errors.endDate?.message}/>
            <TextField label="Lý do tạo kỳ" {...form.register('reason')} error={Boolean(form.formState.errors.reason)} helperText={form.formState.errors.reason?.message}/>
        </FormFields>
    </EditDialog>;
}
const openingSchema=z.object({effectiveDate:z.string().refine(isValidDateOnly,'Chọn ngày hợp lệ.'),policyVersion:z.literal('synthetic-policy-1'),reason:reasonSchema,lines:z.array(z.object({accountId:z.string().min(1,'Chọn tài khoản.'),debit:moneySchema,credit:moneySchema,description:z.string().refine(v=>codePointLength(v)<=300,'Diễn giải tối đa 300 ký tự.').trim().min(1,'Nhập diễn giải.')})),inventory:z.array(z.object({variantId:z.string().min(1,'Chọn biến thể.'),warehouseId:z.string().min(1,'Chọn kho.'),quantity:z.number().int().min(0,'Số lượng không âm.'),unitCost:moneySchema}))}).superRefine((values,ctx)=>{
    const units=(a:string)=>{const [n='',f='']=a.split('.');return /^\d+(\.\d{1,4})?$/.test(a)?BigInt(n)*10000n+BigInt(f.padEnd(4,'0')):0n;};let d=0n,c=0n;
    values.lines.forEach((line,i)=>{const debit=units(line.debit.amount),credit=units(line.credit.amount);d+=debit;c+=credit;if((debit>0n)===(credit>0n))ctx.addIssue({code:'custom',path:['lines',i,'debit','amount'],message:'Mỗi dòng cần đúng một bên Nợ hoặc Có dương.'});});
    if(d!==c)ctx.addIssue({code:'custom',path:['lines',0,'debit','amount'],message:'Tổng số dư Nợ phải bằng tổng số dư Có.'});
    const keys=new Set<string>();values.inventory.forEach((line,i)=>{const key=`${line.warehouseId}:${line.variantId}`;if(keys.has(key))ctx.addIssue({code:'custom',path:['inventory',i,'variantId'],message:'Không lặp kho/biến thể.'});keys.add(key);});
});
const snapshot=(r:OpeningBalance)=>({version:r.version,values:{effectiveDate:r.effectiveDate,policyVersion:r.policyVersion as 'synthetic-policy-1',reason:r.reason,lines:r.lines,inventory:r.inventory}});
type OpeningFields=z.infer<typeof openingSchema>;
export function OpeningBalancesPage() {
    const {shop}=useScope(),can=useCan('finance.post');const list=useApi('listOpeningBalances',{query:useListQuery('listOpeningBalances')});
    const [open,setOpen]=useState(false),[selected,setSelected]=useState<OpeningBalance|null>(null),[postRow,setPostRow]=useState<OpeningBalance|null>(null),[success,setSuccess]=useState('');
    const detail=useApi('getOpeningBalance',{path:{openingId:selected?.id||''}},open&&Boolean(selected));
    const accounts=usePagedApi('listAccounts',{query:{status:'active'}}),warehouses=usePagedApi('listWarehouses',{query:{status:'active'}}),products=usePagedApi('listProducts',{query:{status:'active'}});
    const create=useCommand('createOpeningBalance',['listOpeningBalances']),update=useCommand('updateOpeningBalance',['listOpeningBalances','getOpeningBalance']),post=useCommand('postOpeningBalance',['listOpeningBalances','getOpeningBalance','listStockSnapshots','getLedger','getTrialBalance','getBalanceSheet','getProfitLoss','getCashflow','listJournals']);
    const empty:OpeningFields={effectiveDate:dateOnlyInTimezone(new Date(),shop.timezone),policyVersion:'synthetic-policy-1',reason:'',lines:[],inventory:[]};
    const form=useForm<OpeningFields>({defaultValues:empty,resolver:zodResolver(openingSchema)});useWatch({control:form.control});
    const lines=useFieldArray({control:form.control,name:'lines'}),inventory=useFieldArray({control:form.control,name:'inventory'}),formRef=useRef<HTMLFormElement|null>(null);
    const editor=useVersionedDraft({identity:`${shop.id}:opening:${selected?.id||'new'}`,source:detail.data?snapshot(detail.data.data):selected?snapshot(selected):undefined,draft:form.getValues(),apply:v=>form.reset(v),refresh:()=>detail.refetch({throwOnError:true})});
    const dirty=open&&(selected?editor.dirty:!draftEqual(empty,form.getValues())),bind=useDraftForm(dirty),busy=create.pending||update.pending,blocked=selected?update.unresolved:create.unresolved;
    const submit=form.handleSubmit(async values=>{if(!can||blocked)return;try {if(selected){const prepared=editor.prepare();if(!prepared)return;const submitted=form.getValues();const result=await update.execute({path:{openingId:selected.id},version:prepared.version,body:values as OpeningBalanceWrite});if(!editor.committed(snapshot(result.data),submitted))return;}else await create.execute({body:values});if(formRef.current)markDraftClean(formRef.current);setOpen(false);setSuccess('Đã lưu nháp mở sổ. Kiểm lại số dư và tồn trước khi ghi sổ.');}catch(e){editor.failed(e);}});
    return <><PageHeader title="Mở sổ kế toán" subtitle="Ghi số dư và tồn đầu kỳ một lần sau đối chiếu; API chặn ghi đè shop đã có nghiệp vụ." actions={<MutationButton permission="finance.post" variant="contained" onClick={()=>{setSelected(null);form.reset(empty);setOpen(true);}}>Tạo nháp mở sổ</MutationButton>}/>{success&&<Alert severity="success" role="status">{success}</Alert>}
        <Panel><Toolbar operation="listOpeningBalances"/><QueryState query={list} pendingProfile="section">{list.data&&<><DataTable label="Hồ sơ mở sổ" rows={list.data.data} rowKey={r=>r.id} columns={[
            {key:'id',label:'Hồ sơ',render:r=>r.id},{key:'date',label:'Ngày hiệu lực',render:r=>formatDateOnly(r.effectiveDate)},{key:'reason',label:'Lý do',render:r=>r.reason},{key:'status',label:'Trạng thái',render:r=><Status value={r.status}/>},{key:'actions',label:'Thao tác',render:r=>r.status==='draft'?<ActionGroup><MutationButton permission="finance.post" onClick={()=>{setSelected(r);form.reset(snapshot(r).values);setOpen(true);}}>Sửa mở sổ {r.id}</MutationButton><MutationButton permission="finance.post" onClick={()=>setPostRow(r)}>Ghi mở sổ {r.id}</MutationButton></ActionGroup>:r.journalId?<RouteLink to={`/s/${shop.id}/finance/journals?journalId=${r.journalId}`}>Bút toán mở sổ</RouteLink>:'Mở sổ số dư bằng 0'},
        ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
        <EditDialog open={open} title={selected?`Sửa mở sổ ${selected.id}`:'Nháp mở sổ mới'} onClose={()=>setOpen(false)} busy={busy} actions={<Button type="submit" form="opening-form" variant="contained" disabled={busy||blocked||!can||(Boolean(selected)&&!editor.dirty)}>Lưu nháp mở sổ</Button>}>
            <ErrorNotice error={create.error||update.error||detail.error||accounts.error||warehouses.error||products.error}/><DraftConflict editor={editor} labels={{effectiveDate:'Ngày hiệu lực',policyVersion:'Chính sách',reason:'Lý do',lines:'Toàn bộ số dư tài khoản',inventory:'Toàn bộ tồn đầu kỳ'}} busy={busy}/>
            <FormFields component="form" id="opening-form" noValidate onSubmit={submit} ref={node=>{formRef.current=node;bind(node);}} data-draft-clean={!dirty?'true':undefined}>
                <Alert severity="info">Số dư bằng 0 được phép để trống dòng. Giá trị tồn phải khớp tài khoản 156; số dư cần cân bằng và chỉ ghi trong kỳ đang mở.</Alert>
                <TextField type="date" label="Ngày mở sổ" {...form.register('effectiveDate')} error={Boolean(form.formState.errors.effectiveDate)} helperText={form.formState.errors.effectiveDate?.message}/>
                <TextField label="Chính sách mở sổ" value="synthetic-policy-1" InputProps={{readOnly:true}}/>
                <LookupLoadMore label="tài khoản mở sổ" loadedCount={accounts.loadedCount} hasMore={accounts.hasMore} busy={accounts.isLoadingMore} onLoadMore={accounts.loadMore}/>
                {lines.fields.map((field,i)=><SurfaceContent key={field.id} bodyMode="compactOutlined"><FormFields>
                    <TextField select label={`Tài khoản số dư ${i+1}`} {...form.register(`lines.${i}.accountId`)} value={form.watch(`lines.${i}.accountId`)} error={Boolean(form.formState.errors.lines?.[i]?.accountId)} helperText={form.formState.errors.lines?.[i]?.accountId?.message}><MenuItem value="">Chọn tài khoản</MenuItem>{accounts.data?.data.map(a=><MenuItem key={a.id} value={a.id}>{a.code} · {a.name}</MenuItem>)}</TextField>
                    {(['debit','credit'] as const).map(side=><TextField key={side} label={`${side==='debit'?'Nợ':'Có'} số dư ${i+1} (${shop.currency})`} {...form.register(`lines.${i}.${side}.amount`)} error={Boolean(form.formState.errors.lines?.[i]?.[side]?.amount)} helperText={form.formState.errors.lines?.[i]?.[side]?.amount?.message} inputProps={{inputMode:'decimal'}}/>)}
                    <TextField label={`Diễn giải số dư ${i+1}`} {...form.register(`lines.${i}.description`)} error={Boolean(form.formState.errors.lines?.[i]?.description)} helperText={form.formState.errors.lines?.[i]?.description?.message}/><Button onClick={()=>lines.remove(i)}>Bỏ số dư {i+1}</Button>
                </FormFields></SurfaceContent>)}
                {form.formState.errors.lines?.message&&<Alert severity="error">{form.formState.errors.lines.message}</Alert>}
                <Button onClick={()=>lines.append({accountId:'',debit:{amount:'0',currency:shop.currency},credit:{amount:'0',currency:shop.currency},description:''})}>Thêm số dư tài khoản</Button>
                <LookupLoadMore label="kho mở sổ" loadedCount={warehouses.loadedCount} hasMore={warehouses.hasMore} busy={warehouses.isLoadingMore} onLoadMore={warehouses.loadMore}/><LookupLoadMore label="sản phẩm mở sổ" loadedCount={products.loadedCount} hasMore={products.hasMore} busy={products.isLoadingMore} onLoadMore={products.loadMore}/>
                {inventory.fields.map((field,i)=><SurfaceContent key={field.id} bodyMode="compactOutlined"><FormFields>
                    <TextField select label={`Kho tồn đầu ${i+1}`} {...form.register(`inventory.${i}.warehouseId`)} value={form.watch(`inventory.${i}.warehouseId`)} error={Boolean(form.formState.errors.inventory?.[i]?.warehouseId)} helperText={form.formState.errors.inventory?.[i]?.warehouseId?.message}><MenuItem value="">Chọn kho</MenuItem>{warehouses.data?.data.map(w=><MenuItem key={w.id} value={w.id}>{w.code} · {w.name}</MenuItem>)}</TextField>
                    <TextField select label={`Biến thể tồn đầu ${i+1}`} {...form.register(`inventory.${i}.variantId`)} value={form.watch(`inventory.${i}.variantId`)} error={Boolean(form.formState.errors.inventory?.[i]?.variantId)} helperText={form.formState.errors.inventory?.[i]?.variantId?.message}><MenuItem value="">Chọn biến thể</MenuItem>{products.data?.data.flatMap(p=>p.variants.map(v=><MenuItem key={v.id} value={v.id}>{v.sku} · {p.name}</MenuItem>))}</TextField>
                    <TextField label={`Số lượng tồn đầu ${i+1}`} {...form.register(`inventory.${i}.quantity`,{valueAsNumber:true})} error={Boolean(form.formState.errors.inventory?.[i]?.quantity)} helperText={form.formState.errors.inventory?.[i]?.quantity?.message} inputProps={{inputMode:'numeric'}}/>
                    <TextField label={`Giá vốn đơn vị ${i+1} (${shop.currency})`} {...form.register(`inventory.${i}.unitCost.amount`)} error={Boolean(form.formState.errors.inventory?.[i]?.unitCost?.amount)} helperText={form.formState.errors.inventory?.[i]?.unitCost?.amount?.message} inputProps={{inputMode:'decimal'}}/><Button onClick={()=>inventory.remove(i)}>Bỏ tồn đầu {i+1}</Button>
                </FormFields></SurfaceContent>)}
                <Button onClick={()=>inventory.append({warehouseId:'',variantId:'',quantity:0,unitCost:{amount:'0',currency:shop.currency}})}>Thêm tồn đầu kỳ</Button>
                <TextField label="Lý do mở sổ" multiline minRows={2} {...form.register('reason')} error={Boolean(form.formState.errors.reason)} helperText={form.formState.errors.reason?.message}/>
            </FormFields>
        </EditDialog>
        <ConfirmDialog open={Boolean(postRow)} title="Ghi mở sổ" confirmLabel="Ghi mở sổ" description={`Hồ sơ ${postRow?.id||''}, hiệu lực ${formatDateOnly(postRow?.effectiveDate)}: ghi số dư và tồn sau đối chiếu. Không sửa trực tiếp sau ghi; mọi điều kiện được API kiểm lại.`} busy={post.pending} error={post.error} onClose={()=>setPostRow(null)} onConfirm={async()=>{if(!postRow)return;await post.execute({path:{openingId:postRow.id},body:{expectedVersion:postRow.version}});setSuccess('Đã ghi mở sổ; số dư và tồn lấy từ hồ sơ đã kiểm.');}}/>
    </>;
}
