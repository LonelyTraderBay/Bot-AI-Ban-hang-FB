import { useRef, useState } from 'react';
import { Button, TextField, Alert } from '@mui/material';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Warehouse } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { useVersionedDraft, draftEqual } from '@/shared/model/versioned-draft';
import { useDraftForm, markDraftClean } from '@/shared/model/dirty-drafts';
import { codePointLength } from '@/shared/model/format';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { FormFields, ActionGroup } from '@/shared/ui/composition';
import { PageHeader, Panel, Toolbar, QueryState, DataTable, Pager, Status, MutationButton, EditDialog, ConfirmDialog, ErrorNotice } from '@/shared/ui/components';

const schema=z.object({code:z.string().refine(v=>codePointLength(v)<=40,'Mã kho tối đa 40 ký tự.').trim().min(1,'Nhập mã kho.'),name:z.string().refine(v=>codePointLength(v)<=160,'Tên kho tối đa 160 ký tự.').trim().min(1,'Nhập tên kho.'),addressLine:z.string().refine(v=>codePointLength(v)<=500,'Địa điểm tối đa 500 ký tự.').trim().min(1,'Nhập địa điểm kho.')});
type Fields=z.infer<typeof schema>;
const empty:Fields={code:'',name:'',addressLine:''};
const snapshot=(warehouse:Warehouse)=>({version:warehouse.version,values:{code:warehouse.code,name:warehouse.name,addressLine:warehouse.addressLine}});

export function WarehousesPage() {
    const {shop}=useScope(),canEdit=useCan("warehouses.manage");
    const list=useApi('listWarehouses',{query:useListQuery('listWarehouses')});
    const [open,setOpen]=useState(false),[selected,setSelected]=useState<Warehouse|null>(null),[archive,setArchive]=useState<Warehouse|null>(null),[success,setSuccess]=useState('');
    const detail=useApi('getWarehouse',{path:{warehouseId:selected?.id||''}},open&&Boolean(selected));
    const create=useCommand('createWarehouse',['listWarehouses']),update=useCommand('updateWarehouse',['listWarehouses','getWarehouse']),remove=useCommand('archiveWarehouse',['listWarehouses','getWarehouse']);
    const form=useForm<Fields>({defaultValues:empty,resolver:zodResolver(schema)});useWatch({control:form.control});
    const editor=useVersionedDraft({identity:`${shop.id}:warehouse:${selected?.id||'new'}`,source:detail.data?snapshot(detail.data.data):selected?snapshot(selected):undefined,draft:form.getValues(),apply:values=>form.reset(values),refresh:()=>detail.refetch({throwOnError:true})});
    const dirty=open&&(selected?editor.dirty:!draftEqual(empty,form.getValues())),bindDraft=useDraftForm(dirty),formRef=useRef<HTMLFormElement|null>(null);
    const busy=create.pending||update.pending;
    const blocked=Boolean(selected?update.unresolved:create.unresolved);
    const submit=form.handleSubmit(async values=>{
        if(!canEdit||blocked)return;
        try {
            if(selected) {const prepared=editor.prepare();if(!prepared)return;const submitted=form.getValues(),patch={...prepared.patch};for(const key of Object.keys(patch) as (keyof Fields)[]) patch[key]=values[key];const response=await update.execute({path:{warehouseId:selected.id},version:prepared.version,body:patch});if(!editor.committed(snapshot(response.data),submitted))return;}
            else await create.execute({body:values});
            if(formRef.current)markDraftClean(formRef.current);setSuccess(`Đã lưu kho ${values.name}.`);setOpen(false);form.reset(empty);
        }catch(error){editor.failed(error);}
    });
    return <>
        <PageHeader title="Quản trị kho" subtitle="Một danh mục kho dùng chung cho đơn hàng, tồn kho và mua hàng; ngừng dùng giữ nguyên lịch sử." actions={<MutationButton permission="warehouses.manage" variant="contained" onClick={()=>{setSelected(null);form.reset(empty);setOpen(true);}}>Thêm kho</MutationButton>}/>
        {success&&<Alert severity="success" role="status">{success}</Alert>}
        <Panel><Toolbar operation="listWarehouses" placeholder="Tìm mã hoặc tên kho…"/><QueryState query={list} pendingProfile="section">{list.data&&<>
            <DataTable label="Danh mục kho" rows={list.data.data} rowKey={warehouse=>warehouse.id} columns={[
                {key:'code',label:'Mã kho',render:w=>w.code},{key:'name',label:'Tên kho',render:w=>w.name},{key:'address',label:'Địa điểm',render:w=>w.addressLine},{key:'status',label:'Trạng thái',render:w=><Status value={w.status}/>},
                {key:'edit',label:'Thao tác',render:w=>w.status==='active'?<ActionGroup><MutationButton permission="warehouses.manage" onClick={()=>{setSelected(w);form.reset(snapshot(w).values);setOpen(true);}}>Sửa kho {w.code}</MutationButton><MutationButton permission="warehouses.manage" onClick={()=>setArchive(w)}>Ngừng dùng {w.code}</MutationButton></ActionGroup>:'Lịch sử được giữ'},
            ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
        <EditDialog open={open} title={selected?`Sửa kho ${selected.name}`:'Thêm kho'} busy={busy} onClose={()=>setOpen(false)} actions={<Button type="submit" form="warehouse-editor" variant="contained" disabled={busy||blocked||!canEdit||(Boolean(selected)&&!editor.dirty)}>Lưu kho</Button>}>
            <ErrorNotice error={create.error||update.error||detail.error}/><DraftConflict editor={editor} labels={{code:'Mã kho',name:'Tên kho',addressLine:'Địa điểm kho'}} busy={busy}/>
            <FormFields component="form" id="warehouse-editor" noValidate ref={node=>{formRef.current=node;bindDraft(node);}} onSubmit={submit} data-draft-clean={!dirty?'true':undefined}>
                {(['code','name','addressLine'] as const).map((key,i)=><TextField key={key} label={['Mã kho','Tên kho','Địa điểm kho'][i]} {...form.register(key)} disabled={busy||!canEdit} error={Boolean(form.formState.errors[key])} helperText={form.formState.errors[key]?.message}/>)}
            </FormFields>
        </EditDialog>
        <ConfirmDialog open={Boolean(archive)} title="Ngừng dùng kho" confirmLabel="Ngừng dùng kho" description={`Kho ${archive?.name||''} (${archive?.code||''}) sẽ không xuất hiện trong lựa chọn mới. API chặn kho mặc định, kho còn tồn/giữ hàng hoặc nghiệp vụ đang mở; lịch sử được giữ.`} requireReason busy={remove.pending} error={remove.error} onClose={()=>setArchive(null)} onConfirm={async reason=>{if(!archive)return;await remove.execute({path:{warehouseId:archive.id},body:{expectedVersion:archive.version,reason}});setSuccess(`Đã ngừng dùng kho ${archive.name}.`);}}/>
    </>;
}
