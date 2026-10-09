import {useRef} from 'react';
import {Alert,Button,MenuItem,TextField} from '@mui/material';
import {useForm,useWatch,useFieldArray} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import type {Journal,JournalLine,JournalCreate} from '@botsales/contracts';
import {useApi,usePagedApi,useCommand} from '@/shared/api/hooks';
import {useScope} from '@/shared/model/scope';
import {dateOnlyInTimezone,isValidDateOnly,codePointLength} from '@/shared/model/format';
import {useDraftForm,markDraftClean} from '@/shared/model/dirty-drafts';
import {FormFields,SurfaceContent} from '@/shared/ui/composition';
import {EditDialog,ErrorNotice,LookupLoadMore} from '@/shared/ui/components';
const exact=z.string().regex(/^\d+(\.\d{1,4})?$/,'Nhập số không âm, tối đa 4 chữ số thập phân.');
const units=(value:string)=>{const [whole='',fraction='']=value.split('.');return /^\d+(\.\d{1,4})?$/.test(value)?BigInt(whole)*10000n+BigInt(fraction.padEnd(4,'0')):0n;};
const money=z.object({amount:exact,currency:z.string().min(1)});
const schema=z.object({sourceType:z.string().refine(v=>codePointLength(v)<=100,'Loại nguồn tối đa 100 ký tự.').trim().min(1,'Nhập loại nguồn.'),sourceId:z.string().regex(/^[A-Za-z0-9_-]+$/,'Mã nguồn chỉ gồm chữ/số, gạch ngang và gạch dưới.'),effectiveDate:z.string().refine(isValidDateOnly,'Chọn ngày hợp lệ.'),reason:z.string().refine(v=>codePointLength(v)<=1000,'Lý do tối đa 1.000 ký tự.').trim().min(5,'Lý do cần ít nhất 5 ký tự.'),replacesJournalId:z.string().nullable().optional(),lines:z.array(z.object({accountId:z.string().min(1,'Chọn tài khoản.'),debit:money,credit:money,description:z.string().refine(v=>codePointLength(v)<=300,'Diễn giải tối đa 300 ký tự.').trim().min(1,'Nhập diễn giải.')})).min(2,'Bút toán cần ít nhất hai dòng.')}).superRefine((values,ctx)=>{let debit=0n,credit=0n;values.lines.forEach((l,i)=>{const d=units(l.debit.amount),c=units(l.credit.amount);debit+=d;credit+=c;if((d>0n)===(c>0n))ctx.addIssue({code:'custom',path:['lines',i,'debit','amount'],message:'Mỗi dòng cần đúng một bên Nợ hoặc Có dương.'});});if(debit!==credit)ctx.addIssue({code:'custom',path:['lines',0,'debit','amount'],message:'Tổng Nợ và Có cần cân bằng.'});});
export function JournalEditor({replacement,onClose,onSaved}:{replacement:Journal|null;onClose:()=>void;onSaved:()=>void}) {
    const {shop}=useScope(),accounts=usePagedApi('listAccounts',{query:{status:'active'}}),periods=useApi('listAccountingPeriods'),create=useCommand('createJournal',['listJournals']);
    const newLine=():JournalLine=>({accountId:'',debit:{amount:'0',currency:shop.currency},credit:{amount:'0',currency:shop.currency},description:''});
    const form=useForm<JournalCreate>({defaultValues:{sourceType:replacement?.sourceType||'manual',sourceId:replacement?.sourceId||'',effectiveDate:dateOnlyInTimezone(new Date(),shop.timezone),lines:replacement?.lines||[newLine(),newLine()],reason:'',replacesJournalId:replacement?.id||null},resolver:zodResolver(schema)});useWatch({control:form.control});
    const lines=useFieldArray({control:form.control,name:'lines'}),ref=useRef<HTMLFormElement|null>(null),bind=useDraftForm(form.formState.isDirty),date=form.watch('effectiveDate'),period=periods.data?.data.find(p=>date>=p.startDate&&date<=p.endDate);
    const submit=form.handleSubmit(async values=>{if(period?.state!=='open'){form.setError('effectiveDate',{message:'Ngày hiệu lực cần nằm trong kỳ kế toán đang mở.'},{shouldFocus:true});return;}try{const {replacesJournalId,...body}=values;await create.execute({body:replacesJournalId?{...body,replacesJournalId}:body});if(ref.current)markDraftClean(ref.current);onSaved();onClose();}catch{/* Draft and recovery remain visible. */}});
    return <EditDialog open title={replacement?'Thay thế bút toán đã đảo':'Bút toán nháp'} onClose={onClose} busy={create.pending} actions={<Button type="submit" form="journal-create" variant="contained" disabled={create.pending||create.unresolved}>Lưu nháp</Button>}>
        <ErrorNotice error={create.error||accounts.error||periods.error}/><FormFields component="form" id="journal-create" noValidate ref={node=>{ref.current=node;bind(node);}} onSubmit={submit} data-draft-clean={!form.formState.isDirty?'true':undefined}>
            {replacement&&<Alert severity="info">Thay thế {replacement.id} sau đảo; giữ nguyên nguồn và lịch sử. API kiểm revision mới, phiên bản tài khoản và kỳ trước khi ghi.</Alert>}
            <TextField label="Loại chứng từ nguồn" {...form.register('sourceType')} InputProps={{readOnly:Boolean(replacement)}} error={Boolean(form.formState.errors.sourceType)} helperText={form.formState.errors.sourceType?.message}/>
            <TextField label="Mã chứng từ nguồn" {...form.register('sourceId')} InputProps={{readOnly:Boolean(replacement)}} error={Boolean(form.formState.errors.sourceId)} helperText={form.formState.errors.sourceId?.message}/>
            <TextField type="date" label="Ngày hiệu lực" {...form.register('effectiveDate')} error={Boolean(form.formState.errors.effectiveDate)} helperText={form.formState.errors.effectiveDate?.message}/>
            <Alert severity={period?.state==='open'?'info':'warning'}>{period?period.state==='open'?`Kỳ ${period.startDate} – ${period.endDate} đang mở.`:`Kỳ ${period.startDate} – ${period.endDate} đã khóa.`:'Chưa có kỳ mở cho ngày này; tạo kỳ tại Công nợ & khóa kỳ.'}</Alert>
            <LookupLoadMore label="tài khoản kế toán" loadedCount={accounts.loadedCount} hasMore={accounts.hasMore} busy={accounts.isLoadingMore} onLoadMore={accounts.loadMore}/>
            {lines.fields.map((field,i)=><SurfaceContent key={field.id} bodyMode="compactOutlined"><FormFields>
                <TextField select label={`Tài khoản dòng ${i+1}`} {...form.register(`lines.${i}.accountId`)} value={form.watch(`lines.${i}.accountId`)} error={Boolean(form.formState.errors.lines?.[i]?.accountId)} helperText={form.formState.errors.lines?.[i]?.accountId?.message}><MenuItem value="">Chọn tài khoản</MenuItem>{accounts.data?.data.map(a=><MenuItem key={a.id} value={a.id}>{a.code} · {a.name}</MenuItem>)}</TextField>
                {(['debit','credit'] as const).map(side=><TextField key={side} label={`${side==='debit'?'Nợ':'Có'} dòng ${i+1}`} {...form.register(`lines.${i}.${side}.amount`)} error={Boolean(form.formState.errors.lines?.[i]?.[side]?.amount)} helperText={form.formState.errors.lines?.[i]?.[side]?.amount?.message} inputProps={{inputMode:'decimal'}}/>)}
                <TextField label={`Diễn giải dòng ${i+1}`} {...form.register(`lines.${i}.description`)} error={Boolean(form.formState.errors.lines?.[i]?.description)} helperText={form.formState.errors.lines?.[i]?.description?.message}/><Button disabled={lines.fields.length<=2} onClick={()=>lines.remove(i)}>Bỏ dòng {i+1}</Button>
            </FormFields></SurfaceContent>)}
            {form.formState.errors.lines?.message&&<Alert severity="error">{form.formState.errors.lines.message}</Alert>}<Button onClick={()=>lines.append(newLine())}>Thêm dòng</Button>
            <TextField label="Lý do" {...form.register('reason')} error={Boolean(form.formState.errors.reason)} helperText={form.formState.errors.reason?.message}/>
        </FormFields>
    </EditDialog>;
}
