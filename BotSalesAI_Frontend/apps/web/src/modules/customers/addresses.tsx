import { useMemo, useRef, useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Customer, CustomerAddress, CustomerAddressWrite, CustomerAddressWritePatch } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useVersionedDraft, draftEqual } from '@/shared/model/versioned-draft';
import { useDraftForm, markDraftClean } from '@/shared/model/dirty-drafts';
import { codePointLength } from '@/shared/model/format';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { FormFields, ActionGroup } from '@/shared/ui/composition';
import { Panel, QueryState, DataTable, Status, MutationButton, EditDialog, ConfirmDialog, ErrorNotice, LookupLoadMore } from '@/shared/ui/components';
import { usePagedApi } from '@/shared/api/hooks';

const limits={label:120,recipient:160,phone:40,line1:500,ward:120,district:120,province:120,postalCode:20,countryCode:2} as const;
const labels={label:'Tên địa chỉ',recipient:'Người nhận',phone:'Điện thoại giao hàng',line1:'Địa chỉ chi tiết',ward:'Phường / xã',district:'Quận / huyện',province:'Tỉnh / thành phố',postalCode:'Mã bưu chính',countryCode:'Mã quốc gia'} as const;
type Fields=Record<keyof typeof limits,string>;
const empty:Fields={label:'',recipient:'',phone:'',line1:'',ward:'',district:'',province:'',postalCode:'',countryCode:'VN'};
function addressName(address:CustomerAddress) {return address.label || `Địa chỉ ${address.id}`;}
function snapshot(address:CustomerAddress) {
    return {version:address.version,values:Object.fromEntries(Object.keys(limits).map(key=>[key,address[key as keyof Fields]||''])) as Fields,hidden:address.redactedFields.filter((key):key is keyof Fields=>key in limits)};
}
function addressBody(fields:Fields):CustomerAddressWrite {
    return {...fields,phone:fields.phone||null,ward:fields.ward||null,district:fields.district||null,postalCode:fields.postalCode||null};
}
function schemaFor(hidden:readonly string[]) {
    return z.object({label:z.string(),recipient:z.string(),phone:z.string(),line1:z.string(),ward:z.string(),district:z.string(),province:z.string(),postalCode:z.string(),countryCode:z.string()}).superRefine((fields,ctx)=>{
        for(const key of Object.keys(limits) as (keyof Fields)[]) {
            if(hidden.includes(key))continue;
            if(codePointLength(fields[key])>limits[key])ctx.addIssue({code:'custom',path:[key],message:`${labels[key]} tối đa ${limits[key]} ký tự.`});
            if(['label','recipient','phone','line1','province','countryCode'].includes(key)&&!fields[key].trim())ctx.addIssue({code:'custom',path:[key],message:`Nhập ${labels[key].toLocaleLowerCase('vi')}.`});
        }
        if(!hidden.includes('countryCode')&&!/^[A-Z]{2}$/.test(fields.countryCode))ctx.addIssue({code:'custom',path:['countryCode'],message:'Dùng mã quốc gia 2 chữ in hoa, ví dụ VN.'});
    });
}

export function AddressesPanel({customer}:{customer:Customer}) {
    const {shop}=useScope(),canEdit=useCan('customers.write');
    const list=usePagedApi('listCustomerAddresses',{path:{customerId:customer.id},query:{limit:20}});
    const [open,setOpen]=useState(false),[selected,setSelected]=useState<CustomerAddress|null>(null),[archive,setArchive]=useState<CustomerAddress|null>(null),[success,setSuccess]=useState('');
    const detail=useApi('getCustomerAddress',{path:{customerId:customer.id,addressId:selected?.id||''}},open&&Boolean(selected));
    const hidden=useMemo(()=>Object.keys(limits).filter(field=>customer.redactedFields.includes('addresses')||customer.redactedFields.includes('shippingAddress')||customer.redactedFields.includes(`address.${field}`)||(field==='phone'&&customer.redactedFields.includes('phone'))),[customer.redactedFields]);
    const canCreate=!hidden.some(key=>["label","recipient","line1","province","countryCode"].includes(key));
    const schema=useMemo(()=>schemaFor(hidden),[hidden]);
    const form=useForm<Fields>({defaultValues:empty,resolver:zodResolver(schema)});useWatch({control:form.control});
    const create=useCommand('createCustomerAddress',['listCustomerAddresses']),update=useCommand('updateCustomerAddress',['listCustomerAddresses','getCustomerAddress']),remove=useCommand('archiveCustomerAddress',['listCustomerAddresses','getCustomerAddress']);
    const editor=useVersionedDraft({identity:`${shop.id}:${customer.id}:address:${selected?.id||'new'}`,source:detail.data?snapshot(detail.data.data):selected?snapshot(selected):undefined,draft:form.getValues(),apply:values=>form.reset(values),refresh:()=>detail.refetch({throwOnError:true})});
    const dirty=open&&(selected?editor.dirty:!draftEqual(empty,form.getValues())),bindDraft=useDraftForm(dirty),formRef=useRef<HTMLFormElement|null>(null),busy=create.pending||update.pending;
    const blocked=Boolean(selected?update.unresolved:create.unresolved);
    const submit=form.handleSubmit(async values=>{
        if(!canEdit||blocked||(!selected&&!canCreate))return;
        try {
            if(selected) {
                const prepared=editor.prepare();if(!prepared)return;
                const converted=addressBody(values),patch:CustomerAddressWritePatch={};
                for(const key of Object.keys(prepared.patch) as (keyof Fields)[]) if(!hidden.includes(key)) Object.assign(patch,{[key]:converted[key]});
                const response=await update.execute({path:{customerId:customer.id,addressId:selected.id},version:prepared.version,body:patch});if(!editor.committed(snapshot(response.data),values))return;
            }else {
                const body=addressBody(values);if(hidden.includes('phone'))body.phone=null;
                await create.execute({path:{customerId:customer.id},body});
            }
            if(formRef.current)markDraftClean(formRef.current);setSuccess(`Đã lưu địa chỉ ${values.label}.`);setOpen(false);form.reset(empty);
        }catch(error){editor.failed(error);}
    });
    return <Panel title="Địa chỉ khách hàng" bodyMode="inset" subtitle="Địa chỉ sửa sau không làm đổi snapshot của đơn đã xác nhận." action={<MutationButton permission="customers.write" disabled={!canCreate} onClick={()=>{setSelected(null);form.reset(empty);setOpen(true);}}>Thêm địa chỉ</MutationButton>}>
        {!canCreate&&<Alert severity="info">Quyền hiện tại che thông tin bắt buộc của địa chỉ; cần người có quyền phù hợp để tạo địa chỉ mới.</Alert>}
        {success&&<Alert severity="success" role="status">{success}</Alert>}
        <QueryState query={list} pendingProfile="section">{list.data&&<>
            <DataTable label="Địa chỉ trong hồ sơ khách" rows={list.data.data} rowKey={address=>address.id} columns={[
                {key:'name',label:'Địa chỉ',render:a=>addressName(a)},{key:'recipient',label:'Người nhận',render:a=>a.recipient||'Đã che theo quyền'},{key:'line',label:'Địa điểm',render:a=>a.line1||'Đã che theo quyền'},{key:'status',label:'Trạng thái',render:a=><Status value={a.status}/>},
                {key:'edit',label:'Thao tác',render:a=>a.status==='active'?<ActionGroup><MutationButton permission="customers.write" onClick={()=>{setSelected(a);form.reset(snapshot(a).values);setOpen(true);}}>Sửa địa chỉ {addressName(a)}</MutationButton><MutationButton permission="customers.write" onClick={()=>setArchive(a)}>Ngừng dùng {addressName(a)}</MutationButton></ActionGroup>:'Lịch sử được giữ'},
            ]}/><LookupLoadMore label="địa chỉ khách hàng" loadedCount={list.loadedCount} hasMore={list.hasMore} busy={list.isLoadingMore} onLoadMore={list.loadMore}/>
        </>}</QueryState>
        <EditDialog open={open} title={selected?`Sửa địa chỉ ${addressName(selected)}`:'Thêm địa chỉ'} busy={busy} onClose={()=>setOpen(false)} actions={<Button type="submit" form="address-editor" variant="contained" disabled={busy||blocked||!canEdit||(!selected&&!canCreate)||(Boolean(selected)&&!editor.dirty)}>Lưu địa chỉ</Button>}>
            <ErrorNotice error={create.error||update.error||detail.error}/><DraftConflict editor={editor} labels={labels} busy={busy}/>
            {hidden.length>0&&<Alert severity="info">Một số trường địa chỉ đang bị che và không được ghi lại. Địa chỉ mới thiếu thông tin giao hàng sẽ chưa dùng để xác nhận đơn.</Alert>}
            <FormFields component="form" id="address-editor" noValidate ref={node=>{formRef.current=node;bindDraft(node);}} onSubmit={submit} data-draft-clean={!dirty?'true':undefined}>
                {(Object.keys(limits) as (keyof Fields)[]).map(key=><TextField key={key} label={labels[key]} {...form.register(key)} disabled={busy||!canEdit||hidden.includes(key)} error={Boolean(form.formState.errors[key])} helperText={form.formState.errors[key]?.message}/>)}
            </FormFields>
        </EditDialog>
        <ConfirmDialog open={Boolean(archive)} title="Ngừng dùng địa chỉ" confirmLabel="Ngừng dùng địa chỉ" description={`Địa chỉ ${archive?addressName(archive):''} của ${customer.displayName} không còn dùng cho đơn mới. Snapshot trong đơn đã xác nhận và lịch sử vẫn được giữ.`} requireReason busy={remove.pending} error={remove.error} onClose={()=>setArchive(null)} onConfirm={async reason=>{if(!archive)return;await remove.execute({path:{customerId:customer.id,addressId:archive.id},body:{expectedVersion:archive.version,reason}});setSuccess(`Đã ngừng dùng địa chỉ ${addressName(archive)}.`);}}/>
    </Panel>;
}
