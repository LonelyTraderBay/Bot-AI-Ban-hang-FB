import fs from 'node:fs';
import path from 'node:path';
const rows=JSON.parse(fs.readFileSync(new URL('ui-consumers.json',import.meta.url)));
const names={
 BotConfigPage:['Lịch sử cấu hình AI'],EvaluationsPage:['Lịch sử đánh giá AI'],AgentTeamPage:['Hạn mức của đội ngũ AI'],ImportResultPage:['Lỗi từng dòng trong tệp nhập'],ProductsPage:['Danh sách sản phẩm'],CategoriesPage:['Danh sách danh mục'],ServiceCasesPage:['Yêu cầu chăm sóc sau bán'],EntriesPage:['Chứng từ thu chi'],JournalsPage:['Danh sách bút toán','Các dòng của bút toán'],ReconciliationPage:['Giao dịch sao kê ngân hàng','Đợt đối soát COD','Hồ sơ ghép và đối chiếu'],DebtsPage:['Công nợ','Kỳ kế toán'],FulfillmentPage:['Công việc chuẩn bị đơn'],ShipmentsPage:['Danh sách vận đơn'],KnowledgePage:['Nguồn kiến thức cửa hàng'],KnowledgeDetailPage:['Lịch sử phiên bản kiến thức'],FeedbackPage:['Phản hồi cần duyệt'],DevicesPage:['Thiết bị nhận thông báo'],OperationsPage:['Công việc vận hành'],ApprovalsPage:['Yêu cầu phê duyệt'],OrdersPage:['Danh sách đơn hàng'],OrderDetailPage:['Sản phẩm trong đơn'],ReturnsPage:['Yêu cầu đổi trả'],SuppliersPage:['Nhà cung cấp','Báo giá sản phẩm'],ReplenishmentPage:['Đề nghị nhập hàng','Chính sách bổ sung hàng'],PurchasesPage:['Đơn mua hàng'],PurchaseDialog:['Sản phẩm trong đơn mua'],ReceiptsPage:['Phiếu nhận hàng','Các dòng kiểm nhận'],TeamPage:['Nhân sự và quyền truy cập'],AuditPage:['Nhật ký hoạt động'],PrivacyPage:['Yêu cầu quyền riêng tư'],JobPage:['Lỗi công việc nền'],
};
const edits=new Map(),counters={};
for(const row of rows.filter(row=>row.component==='DataTable'&&!row.label)){
 const index=counters[row.owner]||0;const label=names[row.owner]?.[index];if(!label)throw Error('Unclassified table '+row.file+':'+row.line);
 counters[row.owner]=index+1;
 const s=fs.readFileSync(row.file,'utf8');if(s.slice(row.offset-9,row.offset)!=='DataTable')throw Error('Stale offset '+row.file);
 const changes=edits.get(row.file)||[];changes.push({offset:row.offset,text:' label="'+label+'"'});edits.set(row.file,changes);
}
for(const [file,changes] of edits){let s=fs.readFileSync(file,'utf8');for(const change of changes.sort((a,b)=>b.offset-a.offset))s=s.slice(0,change.offset)+change.text+s.slice(change.offset);fs.writeFileSync(file,s);}

function edit(file,old,replacement,count=1){let s=fs.readFileSync(file,'utf8');if(s.split(old).length-1!==count)throw Error('Mismatched edit '+file+' '+old.slice(0,80));s=s.replaceAll(old,replacement);fs.writeFileSync(file,s);}
const shell='apps/web/src/app/Shell.tsx';
edit(shell,"import { useEffect, useState } from 'react';","import { useEffect, useRef, useState } from 'react';\nimport {routeMetadata} from './route-metadata';\nimport {label} from '../shared/model/labels';");
edit(shell,"    const [search, setSearch] = useState('');","    const [search, setSearch] = useState('');\n    const searchInput = useRef<HTMLInputElement>(null);\n    const clearSearch = () => {setSearch('');searchInput.current?.focus();};");
edit(shell,"const currentRoute = [...routeManifest.routes].sort((a, b) => b.path.length - a.path.length).find(r => new RegExp('^' + r.path.replace(/:[^/]+/g, '[^/]+') + '$').test(location.pathname));","const currentRoute = routeMetadata(location.pathname);");
edit(shell,"    const menu = <Box", "    const matchingNavigation = navigation.map(group => ({...group,items:group.items.filter(([id,title])=>hasPermission(id)&&title.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')))}));\n    const menu = <Box");
edit(shell,"navigation.map(group => { const items = group.items.filter(([id, title]) => hasPermission(id) && (!search || title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))));", "matchingNavigation.map(group => { const items = group.items;");
edit(shell,'})}</Box>\n  <Divider />','})}{search.trim() && !matchingNavigation.some(group => group.items.length) && <Alert severity="info" action={<Button onClick={clearSearch}>Xóa tìm kiếm</Button>}>Không tìm thấy màn hình phù hợp.</Alert>}</Box>\n  <Divider />');
edit(shell,'<TextField size="small" value={search}', '<TextField inputRef={searchInput} size="small" value={search}');
edit(shell,'}}/><Chip aria-label={__MOCK__',"}}/>{search && <IconButton aria-label=\"Xóa tìm màn hình\" onClick={clearSearch}><CloseRounded/></IconButton>}<Chip aria-label={__MOCK__");
edit(shell,"import SearchRounded from '@mui/icons-material/SearchRounded';","import SearchRounded from '@mui/icons-material/SearchRounded';\nimport CloseRounded from '@mui/icons-material/CloseRounded';");
edit(shell,"{membership.roles.join(' · ')}","{membership.roles.map(role => label(role)).join(' · ')}");
edit(shell,'<Typography variant="body2" color="text.secondary" sx={{ display: { xs: \'none\', sm: \'block\' } }}>Không gian làm việc','<Typography component="nav" aria-label="Đường dẫn hiện tại" variant="body2" color="text.secondary" sx={{ display: { xs: \'none\', sm: \'block\' } }}>Không gian làm việc');

const sources={
 'workspace/index.tsx':[["?.roles.join(', ')","?.roles.map(role => businessLabel(role)).join(', ')"],['{job.kind}','{businessLabel(job.kind)}']],
 'customers/index.tsx':[['{order.orderState}','<Status value={order.orderState}/>']],
 'knowledge/index.tsx':[['render: r => r.sourceKind','render: r => businessLabel(r.sourceKind)']],
 'notifications/index.tsx':[['{n.channel} ·','{businessLabel(n.channel)} ·']],
 'inbox/conversation-components.tsx':[['{message.status}','{businessLabel(message.status, \'message\')}'],['label={`${reference.type} · ${reference.id}`}','label={`${businessLabel(reference.type)} · ${reference.id}`} title={reference.type}']],
 'operations/index.tsx':[['{entry.action}','{businessLabel(entry.action)}'],['{entry.resource.type} ·','{businessLabel(entry.resource.type)} · {entry.action} ·'],['{approval.status}','{businessLabel(approval.status)}'],['{approval.action}','{businessLabel(approval.action)}'],[": task.kind}",": businessLabel(task.kind)}"]],
 'finance/index.tsx':[['`${journal.sourceType} / ${journal.sourceId}`','`${businessLabel(journal.sourceType)} / ${journal.sourceId}`']],
};
for(const [module,changes] of Object.entries(sources)){
 const file='apps/web/src/modules/'+module;let s=fs.readFileSync(file,'utf8');s="import {label as businessLabel} from '@/shared/model/labels';\n"+s;fs.writeFileSync(file,s);for(const [from,to] of changes)edit(file,from,to);
}
const integration='apps/web/src/modules/integrations/index.tsx';
edit(integration,"import { useState } from 'react';","import { useState } from 'react';\nimport {capabilityName, label as businessLabel} from '@/shared/model/labels';");
edit(integration,'label={cap} key={cap}','label={capabilityName(cap)} title={cap} key={cap}');
edit(integration,'label={k}>{typeof v === \'string\' ? v : \'Chưa rõ\'}','label={capabilityName(k)}>{typeof v === \'string\' ? <Status value={v} domain="capability"/> : \'Chưa xác minh\'}');
console.log('C04 table identities:',Object.values(counters).reduce((a,b)=>a+b,0),'new labels; metadata and readable enums migrated');
