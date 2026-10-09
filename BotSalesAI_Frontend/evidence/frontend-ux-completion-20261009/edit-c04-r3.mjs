import fs from 'node:fs';
const pending=new Map();
function edit(file,old,replacement,count=1){let s=pending.get(file)||fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');if(s.split(old).length-1!==count)throw Error('Mismatched edit '+file+' '+old.slice(0,80)+' count='+(s.split(old).length-1));s=s.replaceAll(old,replacement);pending.set(file,s);}
edit('apps/web/src/modules/customers/index.tsx','{order.orderState}','{businessLabel(order.orderState)}',2);
const sources={
 'knowledge/index.tsx':[['render: r => r.sourceKind','render: r => businessLabel(r.sourceKind)']],
 'notifications/index.tsx':[['{n.channel} ·','{businessLabel(n.channel)} ·']],
 'inbox/conversation-components.tsx':[['{message.status}','{businessLabel(message.status, \'message\')}'],['label={`${reference.type} · ${reference.id}`}','label={`${businessLabel(reference.type)} · ${reference.id}`} title={reference.type}']],
 'operations/index.tsx':[['{entry.action}','{businessLabel(entry.action)}'],['{entry.resource.type} ·','{businessLabel(entry.resource.type)} · {entry.action} ·'],['{approval.status}','{businessLabel(approval.status)}'],['{approval.action}','{businessLabel(approval.action)}'],[": task.kind}",": businessLabel(task.kind)}"]],
 'finance/index.tsx':[['`${journal.sourceType} / ${journal.sourceId}`','`${businessLabel(journal.sourceType)} / ${journal.sourceId}`']],
};
for(const [module,changes] of Object.entries(sources)){
 const file='apps/web/src/modules/'+module;let s=pending.get(file)||fs.readFileSync(file,'utf8');s="import {label as businessLabel} from '@/shared/model/labels';\n"+s;pending.set(file,s);for(const [from,to] of changes)edit(file,from,to);
}
const integration='apps/web/src/modules/integrations/index.tsx';
edit(integration,"import { useState } from 'react';","import { useState } from 'react';\nimport {capabilityName} from '@/shared/model/labels';");
edit(integration,'label={cap} key={cap}','label={capabilityName(cap)} title={cap} key={cap}');
edit(integration,'label={k}>{typeof v === \'string\' ? v : \'Chưa rõ\'}','label={capabilityName(k)}>{typeof v === \'string\' ? <Status value={v} domain="capability"/> : \'Chưa xác minh\'}');
for(const [file,s] of pending)fs.writeFileSync(file,s);console.log('C04 remaining consumers updated');
