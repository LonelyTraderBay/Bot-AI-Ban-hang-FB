import fs from 'node:fs';
function edit(file,old,replacement,count=1){let s=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');if(s.split(old).length-1!==count)throw Error('Mismatched edit '+file+' '+old.slice(0,80));s=s.replaceAll(old,replacement);fs.writeFileSync(file,s);}
const shell='apps/web/src/app/Shell.tsx';
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
edit(integration,"import { useState } from 'react';","import { useState } from 'react';\nimport {capabilityName} from '@/shared/model/labels';");
edit(integration,'label={cap} key={cap}','label={capabilityName(cap)} title={cap} key={cap}');
edit(integration,'label={k}>{typeof v === \'string\' ? v : \'Chưa rõ\'}','label={capabilityName(k)}>{typeof v === \'string\' ? <Status value={v} domain="capability"/> : \'Chưa xác minh\'}');
console.log('C04 resumed remaining consumer edits');
