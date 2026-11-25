import {useRef} from 'react';
import {Alert,Button,MenuItem,TextField} from '@mui/material';
import {useForm,useWatch} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import type {FinanceEntry,FinanceEntryWrite} from '@botsales/contracts';
import {useApi,useCommand} from '@/shared/api/hooks';
import {useScope,useCanWrite} from '@/shared/model/scope';
import {useVersionedDraft,draftEqual} from '@/shared/model/versioned-draft';
import {useDraftForm,markDraftClean} from '@/shared/model/dirty-drafts';
import {codePointLength} from '@/shared/model/format';
import {DraftConflict} from '@/shared/ui/draft-conflict';
import {FormFields} from '@/shared/ui/composition';
import {EditDialog,ErrorNotice} from '@/shared/ui/components';

export const financeEntryClasses: Record<FinanceEntryWrite['classification'], string> = {
    sales_receipt: 'Thu bán hàng', inventory_purchase: 'Mua tồn kho', shipping: 'Vận chuyển', platform_fee: 'Phí nền tảng',
    payment_fee: 'Phí thanh toán', ai_expense: 'Chi phí AI', advertising_expense: 'Chi phí quảng cáo', packaging_expense: 'Chi phí đóng gói',
    operating_expense: 'Chi phí vận hành', capital: 'Góp vốn', loan_principal: 'Gốc vay', transfer: 'Chuyển nội bộ', other: 'Khác',
};
const needsSource = (category: FinanceEntryWrite['classification']) => category === 'advertising_expense' || category === 'packaging_expense';
const schema = z.object({
    kind: z.enum(['receipt', 'disbursement']), classification: z.enum(Object.keys(financeEntryClasses) as [FinanceEntryWrite['classification'], ...FinanceEntryWrite['classification'][]]),
    amount: z.object({amount:z.string().regex(/^\d+(\.\d{1,4})?$/,'Nhập số dương, tối đa 4 chữ số thập phân.').refine(v=>/[1-9]/.test(v),'Số tiền phải lớn hơn 0.'),currency:z.string().min(1)}),
    occurredAt:z.string().datetime({offset:true,message:'Nhập thời điểm ISO 8601 có múi giờ, ví dụ 2026-09-29T14:00:00Z.'}),
    description:z.string().refine(v=>codePointLength(v)<=2000,'Diễn giải tối đa 2.000 ký tự.').trim().min(5,'Diễn giải cần ít nhất 5 ký tự.'),
    sourceRef: z.object({type:z.string(),id:z.string()}).nullable(),
}).refine(entry => !needsSource(entry.classification) || /^[A-Za-z0-9_-]{1,160}$/.test(entry.sourceRef?.id ?? ''),
    {path: ['sourceRef'], message: 'Nhập mã chứng từ gồm chữ, số, gạch nối hoặc gạch dưới.'});
const snapshot=(r:FinanceEntry)=>({version:r.version,values:{kind:r.kind,classification:r.classification,amount:r.amount,occurredAt:r.occurredAt,description:r.description,sourceRef:r.sourceRef}});
export function FinanceEntryEditor({initial,onClose,onSaved}:{initial:FinanceEntry|null;onClose:()=>void;onSaved:()=>void}) {
    const {shop}=useScope(),can=useCanWrite('finance.post');
    const empty:FinanceEntryWrite={kind:'disbursement',classification:'operating_expense',amount:{amount:'',currency:shop.currency},occurredAt:new Date().toISOString(),description:'',sourceRef:null};
    const initialEmpty=useRef(empty).current;
    const form=useForm<FinanceEntryWrite>({defaultValues:initial?snapshot(initial).values:initialEmpty,resolver:zodResolver(schema)});useWatch({control:form.control});
    const detail=useApi('getFinanceEntry',{path:{entryId:initial?.id||''}},Boolean(initial));
    const create=useCommand('createFinanceEntry',['listFinanceEntries']),update=useCommand('updateFinanceEntry',['listFinanceEntries','getFinanceEntry']);
    const editor=useVersionedDraft({identity:`${shop.id}:entry:${initial?.id||'new'}`,source:detail.data?snapshot(detail.data.data):initial?snapshot(initial):undefined,draft:form.getValues(),apply:v=>form.reset(v),refresh:()=>detail.refetch({throwOnError:true})});
    const dirty=initial?editor.dirty:!draftEqual(initialEmpty,form.getValues()),ref=useRef<HTMLFormElement|null>(null),bind=useDraftForm(dirty),busy=create.pending||update.pending,blocked=initial?update.unresolved:create.unresolved;
    const submit=form.handleSubmit(async values=>{if(!can||blocked)return;try{if(initial){const prepared=editor.prepare();if(!prepared)return;const submitted=form.getValues();const body={...prepared.patch};for(const key of Object.keys(body) as (keyof FinanceEntryWrite)[])Object.assign(body,{[key]:values[key]});const result=await update.execute({path:{entryId:initial.id},version:prepared.version,body});if(!editor.committed(snapshot(result.data),submitted))return;}else await create.execute({body:values});if(ref.current)markDraftClean(ref.current);onSaved();onClose();}catch(e){editor.failed(e);}});
    return <EditDialog open title={initial?'Sửa phiếu nháp':'Phiếu thu chi mới'} onClose={onClose} busy={busy} actions={<Button variant="contained" type="submit" form="finance-entry-editor" disabled={busy||blocked||!can||(Boolean(initial)&&!editor.dirty)}>Lưu nháp</Button>}>
        <ErrorNotice error={create.error||update.error||detail.error}/><DraftConflict editor={editor} labels={{kind:'Loại phiếu',classification:'Phân loại',amount:'Số tiền',occurredAt:'Thời điểm',description:'Diễn giải',sourceRef:'Nguồn chứng từ'}} busy={busy}/>
        <FormFields component="form" id="finance-entry-editor" noValidate ref={node=>{ref.current=node;bind(node);}} onSubmit={submit} data-draft-clean={!dirty?'true':undefined}>
            <TextField select label="Loại phiếu" {...form.register('kind')} value={form.watch('kind')}><MenuItem value="receipt">Thu tiền</MenuItem><MenuItem value="disbursement">Chi tiền</MenuItem></TextField>
            <TextField select label="Phân loại" {...form.register('classification')} value={form.watch('classification')}>{Object.entries(financeEntryClasses).map(([value,label])=><MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
            {needsSource(form.watch('classification')) && <TextField label="Mã chứng từ nguồn" required value={form.watch('sourceRef')?.id ?? ''}
                onChange={event => form.setValue('sourceRef', event.target.value ? {type: form.getValues('sourceRef')?.type ?? 'manual', id: event.target.value} : null,
                    {shouldDirty: true, shouldValidate: true})} error={Boolean(form.formState.errors.sourceRef)} helperText={form.formState.errors.sourceRef?.message}
                inputProps={{maxLength:160}}/>}
            <TextField label={`Số tiền (${shop.currency})`} {...form.register('amount.amount')} error={Boolean(form.formState.errors.amount?.amount)} helperText={form.formState.errors.amount?.amount?.message} inputProps={{inputMode:'decimal'}}/>
            <TextField label="Thời điểm ISO 8601" {...form.register('occurredAt')} error={Boolean(form.formState.errors.occurredAt)} helperText={form.formState.errors.occurredAt?.message||'Có múi giờ; không tự suy từ máy.'}/>
            <TextField label="Diễn giải" multiline minRows={2} {...form.register('description')} error={Boolean(form.formState.errors.description)} helperText={form.formState.errors.description?.message}/>
            <Alert severity="info">Ghi sổ theo chính sách quản trị. Chứng từ có nguồn đối soát/đơn phải điều chỉnh qua nghiệp vụ sở hữu, không đảo riêng làm lệch công nợ và tồn.</Alert>
        </FormFields>
    </EditDialog>;
}
