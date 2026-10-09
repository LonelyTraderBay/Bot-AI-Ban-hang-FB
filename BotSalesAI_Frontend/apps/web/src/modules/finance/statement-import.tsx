import {useRef,useState} from 'react';
import {Alert,Button,MenuItem,TextField} from '@mui/material';
import type {StatementPreview} from '@botsales/contracts';
import {useApi,useCommand} from '@/shared/api/hooks';
import {useScope} from '@/shared/model/scope';
import {useDraftForm,markDraftClean} from '@/shared/model/dirty-drafts';
import {codePointLength,dateTime} from '@/shared/model/format';
import {FormFields} from '@/shared/ui/composition';
import {DataTable,EditDialog,ErrorNotice,QueryState,RouteLink} from '@/shared/ui/components';

export function StatementDialog({onClose}:{onClose:()=>void}) {
    const {shop}=useScope(),formats=useApi('listStatementFormats');
    const upload=useCommand('uploadFile',[]),previewCommand=useCommand('previewStatementImport',[]),bank=useCommand('importBankStatement',['listBankTransactions','listReconciliationCases']),cod=useCommand('importCODStatement',['listCODSettlements']);
    const [kind,setKind]=useState<'bank'|'cod'>('bank'),[file,setFile]=useState<File|null>(null),[resource,setResource]=useState(''),[batch,setBatch]=useState(''),[formatId,setFormat]=useState('botsales-csv-v1'),[fileId,setFileId]=useState(''),[preview,setPreview]=useState<StatementPreview|null>(null),[jobId,setJob]=useState(''),[error,setError]=useState(''),[draftCommit,setDraftCommit]=useState<{scope:null;sequence:number}>();
    const input=useRef<HTMLInputElement|null>(null),form=useRef<HTMLFormElement|null>(null),bind=useDraftForm(!jobId&&Boolean(file||resource||batch));
    const descriptor=formats.data?.data.find(f=>f.kind===kind&&f.formatId===formatId),busy=upload.pending||previewCommand.pending||bank.pending||cod.pending;
    const blocked=upload.unresolved||previewCommand.unresolved||bank.unresolved||cod.unresolved;
    const valid=Boolean(descriptor&&file&&descriptor.resourceOptions.some(r=>r.id===resource)&&batch.trim()&&codePointLength(batch)<=200&&file.size>0&&file.size<=descriptor.maxBytes&&['text/csv','application/vnd.ms-excel'].includes(file.type));
    const clearPreview=()=>{setPreview(null);setError('');};
    const prepare=async()=>{
        if(!valid||!file||!descriptor||busy||blocked){setError('Chọn CSV đúng loại/dung lượng, tài khoản hoặc đơn vị vận chuyển và mã đợt 1–200 ký tự.');return;}
        try {let id=fileId;if(!id){const fd=new FormData();fd.append('purpose',kind==='bank'?'bank_statement':'cod_statement');fd.append('resourceId',resource);fd.append('file',file);const result=await upload.execute({form:fd});if(result.data.status!=='ready'){setError('Tệp chưa qua kiểm tra; chưa được xem trước hoặc nhập.');return;}id=result.data.id;setFileId(id);}
            const result=await previewCommand.execute({body:{fileId:id,accountOrCarrierId:resource,formatId,sourceBatchId:batch}});setPreview(result.data);setError('');
        }catch{/* Command notice retains unknown/conflict; uploaded file remains available for retry. */}
    };
    const commit=async()=>{if(!preview||!preview.validRows||busy||blocked)return;try {const body={fileId:preview.fileId,accountOrCarrierId:preview.accountOrCarrierId,formatId:preview.formatId,sourceBatchId:preview.sourceBatchId,validationToken:preview.validationToken};const result=kind==='bank'?await bank.execute({body}):await cod.execute({body});setJob(result.data.id);if(form.current)markDraftClean(form.current);setDraftCommit(p=>({scope:null,sequence:(p?.sequence||0)+1}));}catch{/* API revalidates preview bindings, references and source uniqueness. */}};
    return <EditDialog open title="Nhập bảng đối soát" onClose={onClose} busy={busy} draftCommit={draftCommit} actions={jobId?<RouteLink to={`/s/${shop.id}/jobs/${jobId}`}>Xem kết quả nhập</RouteLink>:preview?<Button variant="contained" disabled={busy||blocked||preview.validRows===0} onClick={()=>void commit()}>Nhập các dòng hợp lệ</Button>:<Button type="submit" form="statement-import" variant="contained" disabled={busy||blocked} >Xem trước bảng đối soát</Button>}>
        <ErrorNotice error={upload.error||previewCommand.error||bank.error||cod.error}/>{error&&<Alert severity="error">{error}</Alert>}
        {jobId?<Alert severity="success" role="status">Đã nhận kết quả nhập. Đối soát và ghi sổ vẫn cần thực hiện theo chứng từ; kiểm chi tiết dòng lỗi tại kết quả nhập.</Alert>:<QueryState query={formats}><FormFields component="form" id="statement-import" noValidate ref={node=>{form.current=node;bind(node);}} data-draft-clean={jobId?'true':undefined} onSubmit={e=>{e.preventDefault();void prepare();}}>
            <TextField select label="Loại bảng" value={kind} onChange={e=>{setKind(e.target.value==='cod'?'cod':'bank');setResource('');setFileId('');clearPreview();}}><MenuItem value="bank">Ngân hàng</MenuItem><MenuItem value="cod">COD</MenuItem></TextField>
            <TextField select label="Định dạng CSV" value={formatId} onChange={e=>{setFormat(e.target.value);clearPreview();}}>{formats.data?.data.filter(f=>f.kind===kind).map(f=><MenuItem key={f.id} value={f.formatId}>{f.name}</MenuItem>)}</TextField>
            <TextField select label="Tài khoản / đơn vị vận chuyển" value={resource} onChange={e=>{setResource(e.target.value);setFileId('');clearPreview();}}><MenuItem value="">Chọn nguồn đối soát</MenuItem>{descriptor?.resourceOptions.map(r=><MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>)}</TextField>
            <Button variant="outlined" onClick={()=>input.current?.click()}>{file?file.name:'Chọn CSV'}</Button><input ref={input} hidden type="file" accept=".csv,text/csv" aria-label="Tệp CSV" onChange={e=>{setFile(e.target.files?.[0]||null);setFileId('');clearPreview();}}/>
            {descriptor&&<Alert severity="info">CSV tối đa {descriptor.maxBytes} byte / {descriptor.maxRows} dòng. Cột bắt buộc: {descriptor.requiredColumns.join(', ')}. <a href={`/samples/${kind==='bank'?'bank-transactions':'cod-settlements'}.csv`} download>Tải CSV mẫu</a></Alert>}
            <TextField label="Mã đợt nhập duy nhất" value={batch} onChange={e=>{setBatch(e.target.value);clearPreview();}} helperText="1–200 ký tự. Nguồn lặp sẽ có lỗi theo từng dòng, không tạo tiền hoặc chứng từ trùng."/>
            {preview&&<><Alert severity={preview.invalidRows?'warning':'success'}>{preview.validRows} dòng hợp lệ · {preview.invalidRows} dòng lỗi. Kiểm lại trước khi nhập; token xem trước hết hạn lúc {dateTime(preview.expiresAt,shop.timezone)}.</Alert><DataTable label="Xem trước bảng đối soát" rows={preview.rows} rowKey={r=>String(r.row)} columns={[{key:'row',label:'Dòng CSV',render:r=>r.row},{key:'values',label:'Dữ liệu',render:r=>Object.entries(r.values).map(([key,value])=>`${key}: ${value}`).join(' · ')},{key:'errors',label:'Kiểm dữ liệu',render:r=>r.errors.join('; ')||'Hợp lệ'}]}/><Button onClick={()=>void prepare()} disabled={busy||blocked}>Kiểm tra lại CSV</Button></>}
        </FormFields></QueryState>}
    </EditDialog>;
}
