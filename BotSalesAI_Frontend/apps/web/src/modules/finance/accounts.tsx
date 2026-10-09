import { useRef, useState } from 'react';
import { Alert, Button, MenuItem, TextField } from '@mui/material';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Account } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { useVersionedDraft, draftEqual } from '@/shared/model/versioned-draft';
import { useDraftForm, markDraftClean } from '@/shared/model/dirty-drafts';
import { codePointLength } from '@/shared/model/format';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { FormFields, ActionGroup } from '@/shared/ui/composition';
import { PageHeader, Panel, Toolbar, QueryState, DataTable, Pager, Status, MutationButton, EditDialog, ConfirmDialog, ErrorNotice } from '@/shared/ui/components';

const schema=z.object({code:z.string().regex(/^[A-Za-z0-9_.-]{1,40}$/,'Mã gồm 1–40 chữ/số, dấu chấm, gạch ngang hoặc gạch dưới.'),name:z.string().refine(v=>codePointLength(v)<=160,'Tên tối đa 160 ký tự.').trim().min(1,'Nhập tên tài khoản.'),group:z.enum(['asset','liability','equity','income','expense'])});
type Fields=z.infer<typeof schema>;
const empty:Fields={code:'',name:'',group:'asset'};
const snapshot=(account:Account)=>({version:account.version,values:{code:account.code,name:account.name,group:account.group}});
export const accountGroupName:Record<Account['group'],string>={asset:'Tài sản',liability:'Nợ phải trả',equity:'Vốn chủ sở hữu',income:'Thu nhập',expense:'Chi phí'};

export function AccountsPage() {
    const {shop}=useScope(),canEdit=useCan("finance.accounts.manage");const list=useApi('listAccounts',{query:useListQuery('listAccounts')});
    const [open,setOpen]=useState(false),[selected,setSelected]=useState<Account|null>(null),[archive,setArchive]=useState<Account|null>(null),[success,setSuccess]=useState('');
    const detail=useApi('getAccount',{path:{accountId:selected?.id||''}},open&&Boolean(selected));
    const create=useCommand('createAccount',['listAccounts']),update=useCommand('updateAccount',['listAccounts','getAccount']),remove=useCommand('archiveAccount',['listAccounts','getAccount']);
    const form=useForm<Fields>({defaultValues:empty,resolver:zodResolver(schema)});useWatch({control:form.control});
    const editor=useVersionedDraft({identity:`${shop.id}:account:${selected?.id||'new'}`,source:detail.data?snapshot(detail.data.data):selected?snapshot(selected):undefined,draft:form.getValues(),apply:values=>form.reset(values),refresh:()=>detail.refetch({throwOnError:true})});
    const dirty=open&&(selected?editor.dirty:!draftEqual(empty,form.getValues())),bindDraft=useDraftForm(dirty),formRef=useRef<HTMLFormElement|null>(null),busy=create.pending||update.pending;
    const used=detail.data?.data.used??selected?.used??false;
    const blocked=Boolean(selected?update.unresolved:create.unresolved);
    const submit=form.handleSubmit(async values=>{
        if(!canEdit||blocked)return;
        try {
            if(selected){const prepared=editor.prepare();if(!prepared)return;const submitted=form.getValues(),patch={...prepared.patch};for(const key of Object.keys(patch) as (keyof Fields)[]) Object.assign(patch,{[key]:values[key]});const response=await update.execute({path:{accountId:selected.id},version:prepared.version,body:patch});if(!editor.committed(snapshot(response.data),submitted))return;}
            else await create.execute({body:values});
            if(formRef.current)markDraftClean(formRef.current);setSuccess(`Đã lưu tài khoản ${values.code} · ${values.name}.`);setOpen(false);form.reset(empty);
        }catch(error){editor.failed(error);}
    });
    return <>
        <PageHeader title="Tài khoản kế toán" subtitle="Danh mục kế toán quản trị; mã và nhóm đã dùng trong chứng từ được bảo vệ, không phải hệ thống tài khoản pháp định." actions={<MutationButton permission="finance.accounts.manage" variant="contained" onClick={()=>{setSelected(null);form.reset(empty);setOpen(true);}}>Thêm tài khoản</MutationButton>}/>
        {success&&<Alert severity="success" role="status">{success}</Alert>}
        <Panel><Toolbar operation="listAccounts" placeholder="Tìm mã hoặc tên tài khoản…"/><QueryState query={list} pendingProfile="section">{list.data&&<>
            <DataTable label="Danh mục tài khoản kế toán" rows={list.data.data} rowKey={account=>account.id} columns={[
                {key:'code',label:'Mã tài khoản',render:a=>a.code},{key:'name',label:'Tên tài khoản',render:a=>a.name},{key:'group',label:'Nhóm',render:a=>accountGroupName[a.group]},{key:'used',label:'Chứng từ',render:a=>a.used?'Đã sử dụng':'Chưa sử dụng'},{key:'status',label:'Trạng thái',render:a=><Status value={a.status}/>},
                {key:'edit',label:'Thao tác',render:a=>a.status==='active'?<ActionGroup><MutationButton permission="finance.accounts.manage" onClick={()=>{setSelected(a);form.reset(snapshot(a).values);setOpen(true);}}>Sửa tài khoản {a.code}</MutationButton><MutationButton permission="finance.accounts.manage" onClick={()=>setArchive(a)}>Ngừng dùng {a.code}</MutationButton></ActionGroup>:'Lịch sử được giữ'},
            ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
        <EditDialog open={open} title={selected?`Sửa tài khoản ${selected.code}`:'Thêm tài khoản'} busy={busy} onClose={()=>setOpen(false)} actions={<Button type="submit" form="account-editor" variant="contained" disabled={busy||blocked||!canEdit||(Boolean(selected)&&!editor.dirty)}>Lưu tài khoản</Button>}>
            <ErrorNotice error={create.error||update.error||detail.error}/><DraftConflict editor={editor} labels={{code:'Mã tài khoản',name:'Tên tài khoản',group:'Nhóm tài khoản'}} busy={busy}/>
            {used&&<Alert severity="info">Tài khoản đã có chứng từ; chỉ sửa tên, mã và nhóm được giữ nguyên.</Alert>}
            <FormFields component="form" id="account-editor" noValidate ref={node=>{formRef.current=node;bindDraft(node);}} onSubmit={submit} data-draft-clean={!dirty?'true':undefined}>
                <TextField label="Mã tài khoản" {...form.register('code')} disabled={busy||!canEdit||used} error={Boolean(form.formState.errors.code)} helperText={form.formState.errors.code?.message}/>
                <TextField label="Tên tài khoản" {...form.register('name')} disabled={busy||!canEdit} error={Boolean(form.formState.errors.name)} helperText={form.formState.errors.name?.message}/>
                <TextField select label="Nhóm tài khoản" {...form.register('group')} value={form.watch('group')} disabled={busy||!canEdit||used}>{Object.entries(accountGroupName).map(([value,label])=><MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
            </FormFields>
        </EditDialog>
        <ConfirmDialog open={Boolean(archive)} title="Ngừng dùng tài khoản" confirmLabel="Ngừng dùng tài khoản" description={`Tài khoản ${archive?.code||''} · ${archive?.name||''} sẽ không dùng cho chứng từ mới. API chặn khi còn bút toán nháp; chứng từ và số dư lịch sử được giữ.`} requireReason busy={remove.pending} error={remove.error} onClose={()=>setArchive(null)} onConfirm={async reason=>{if(!archive)return;await remove.execute({path:{accountId:archive.id},body:{expectedVersion:archive.version,reason}});setSuccess(`Đã ngừng dùng tài khoản ${archive.code}.`);}}/>
    </>;
}
