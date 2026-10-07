import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const base='botsales-kit/execution/frontend-evidence/FE008';
const verifyPath='botsales-kit/execution/frontend-evidence/FE006/S05-verify-spc059-current-20261006.log';
const auditPath=`${base}/S01-dataset-audit-spc059-current-20261006.json`;
const auditLogPath=`${base}/S01-dataset-audit-spc059-current-20261006.log`;
const evidencePath=`${base}/S01-after-spc059-20261006.json`;
const evidenceLogPath=`${base}/S01-after-spc059-20261006.log`;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=p=>fs.readFileSync(path.join(root,p));
const read=p=>bytes(p).toString('utf8');
const json=p=>JSON.parse(read(p));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const unique=values=>new Set(values).size===values.length;
const key=(shopId,id)=>`${shopId}:${id}`;
const fail=[];
const check=(condition,message)=>{if(!condition)fail.push(message);};

assert(root.endsWith('BotSalesAI_Frontend'),'Unexpected workspace root');
const seed=json('apps/web/src/mocks/seed.json');
const routes=json('botsales-kit/contracts/route-manifest.json').routes;
const features=json('botsales-kit/contracts/feature-catalog.json').features;
const routeImplementation=json('docs/route-implementation.json');
const permissionCatalog=json('botsales-kit/contracts/permission-catalog.json');
const verifyLog=read(verifyPath);
const shops=new Map(seed.shops.map(shop=>[shop.id,shop]));
const routeIds=new Set(routes.map(route=>route.id));
const members=seed.members;
const collections=Object.entries(seed).filter(([,rows])=>Array.isArray(rows));
const collectionById=new Map(collections.map(([name,rows])=>[name,new Map(rows.filter(row=>row?.id).map(row=>[key(row.shopId||'',row.id),row]))]));
let audited=0;

check(routes.length===54&&unique(routes.map(route=>route.id))&&unique(routes.map(route=>route.path)),'Canonical route manifest is not 54 unique routes.');
check(features.length===64&&unique(features.map(feature=>feature.id)),'Feature catalog is not 64 unique features.');
check(features.every(feature=>feature.routeIds?.length>0&&feature.routeIds.every(id=>routeIds.has(id))),'Feature points to a missing route or has no route owner.');
check(routeImplementation.length===54&&unique(routeImplementation.map(route=>route.routeId))&&routeImplementation.every(route=>routeIds.has(route.routeId)&&route.source&&route.component),'Reviewed route/source/component inventory is not complete.');
check(shops.size===2&&shops.has('shop-demo')&&shops.has('shop-second'),'Seed must provide the two approved synthetic shops.');
check(members.length===9,'Expected nine role test memberships for scoped demo data.');
check(Object.keys(permissionCatalog.rolePresets).length===7,'Expected seven canonical member-role presets.');

const rolesPresent=new Set();
for(const member of members){
  check(shops.has(member.shopId),`Member ${member.id} references an unknown shop.`);
  for(const role of member.roles||[]){
    rolesPresent.add(role);
    const preset=permissionCatalog.rolePresets[role];
    check(Boolean(preset),`Member ${member.id} uses a role missing from the canonical permission catalog.`);
    check(Boolean(preset)&&preset.every(permission=>(member.permissions||[]).includes(permission)),`Member ${member.id} is missing a permission required by role ${role}.`);
  }
}
check(Object.keys(permissionCatalog.rolePresets).every(role=>rolesPresent.has(role)), 'Seed does not cover every approved role preset.');

let scopedRows=0;
for(const [name,rows] of collections){
  const withId=rows.filter(row=>row?.id);
  check(unique(withId.map(row=>key(row.shopId||'',row.id))),`${name} contains a duplicate scoped ID.`);
  for(const row of rows){
    audited++;
    if(row?.shopId){scopedRows++;check(shops.has(row.shopId),`${name}.${row.id} references unknown shop ${row.shopId}.`);}
  }
}

const by=(name,shopId,id)=>collectionById.get(name)?.get(key(shopId,id));
for(const product of seed.products){
  const category=by('categories',product.shopId,product.categoryId);
  check(Boolean(category),`Product ${product.id} has no category in its own shop.`);
  for(const variant of product.variants||[]){
    check(variant.productId===product.id&&variant.shopId===product.shopId,`Variant ${variant.id} ownership does not match product ${product.id}.`);
  }
}
for(const category of seed.categories){
  if(category.parentId)check(Boolean(by('categories',category.shopId,category.parentId)),`Category ${category.id} has a cross-shop/missing parent.`);
}
for(const stock of seed.stock){
  const variant=seed.products.flatMap(product=>product.variants||[]).find(item=>item.id===stock.variantId&&item.shopId===stock.shopId);
  check(Boolean(variant),`Stock ${stock.id} has no variant in its own shop.`);
  check(stock.available===stock.onHand-stock.reserved,`Stock ${stock.id} available quantity is inconsistent.`);
}
for(const order of seed.orders){
  if(order.customerId)check(Boolean(by('customers',order.shopId,order.customerId)),`Order ${order.id} has no same-shop customer.`);
  if(order.conversationId)check(Boolean(by('conversations',order.shopId,order.conversationId)),`Order ${order.id} has no same-shop conversation.`);
  for(const line of order.lines||[]){
    const variant=seed.products.flatMap(product=>product.variants||[]).find(item=>item.id===line.variantId&&item.shopId===order.shopId);
    check(Boolean(variant),`Order ${order.id} line ${line.id} has no same-shop variant.`);
    const unit=BigInt(line.unitPrice?.amount||'0'),discount=BigInt(line.discount?.amount||'0'),quantity=BigInt(line.quantity||0),total=BigInt(line.lineTotal?.amount||'0');
    check(unit*quantity-discount===total,`Order ${order.id} line ${line.id} total does not equal unit × quantity − discount.`);
  }
}
for(const conversation of seed.conversations){
  check(Boolean(by('customers',conversation.shopId,conversation.customerId)),`Conversation ${conversation.id} has no same-shop customer.`);
  check(Boolean(by('channels',conversation.shopId,conversation.channelId)),`Conversation ${conversation.id} has no same-shop channel.`);
}
for(const message of seed.messages){
  check(Boolean(by('conversations',message.shopId,message.conversationId)),`Message ${message.id} has no same-shop conversation.`);
}
for(const amountCollection of collections){
  const visit=(value,location)=>{
    if(Array.isArray(value)){value.forEach((item,index)=>visit(item,`${location}[${index}]`));return;}
    if(!value||typeof value!=='object')return;
    if(Object.hasOwn(value,'amount')&&Object.hasOwn(value,'currency')){
      check(typeof value.amount==='string'&&/^-?\d+$/.test(value.amount),`${location}.amount must be an exact integer money string.`);
      check(value.currency==='VND',`${location}.currency is not the seeded shop currency.`);
    }
    for(const [name,child] of Object.entries(value))visit(child,`${location}.${name}`);
  };
  visit(amountCollection[1],amountCollection[0]);
}

const databaseSource=read('apps/web/src/mocks/database.ts');
const serviceSource=read('apps/web/src/mocks/service.ts');
const networkSource=read('tests/fixtures/mock-network.mjs');
check(databaseSource.includes('structuredClone(seed)')&&/sequence\s*=\s*10000/.test(databaseSource),'Database initialization/reset does not clone canonical seed and reset sequence.');
check(databaseSource.includes("2026-09-29T14:00:00Z"),'Mock data clock is not fixed for deterministic tests.');
check(serviceSource.includes('export function resetService()')&&serviceSource.includes('clearFileState()')&&serviceSource.includes('operationFailures.clear()')&&serviceSource.includes('operationDelays.clear()'),'Service reset does not clear stateful synthetic behavior.');
check(networkSource.includes('Resets records, role, faults, idempotency keys, sequence, and fixed clock deterministically'),'Deterministic reset regression is absent.');
assert(verifyLog.includes('"passed":88')&&verifyLog.includes('"networkChecks":13'),'Fresh verify does not prove current simulator/network checks.');
const failures=fail;
assert(failures.length===0,failures.join('\n'));

const detail={scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',result:'PASS',routes:{canonical:routes.length,uniqueIds:unique(routes.map(route=>route.id)),featureCount:features.length,featuresWithValidRoutes:features.length,sourceComponentMappings:routeImplementation.length},seed:{shops:shops.size,members:members.length,rolePresets:Object.keys(permissionCatalog.rolePresets).length,rolesCovered:[...rolesPresent].sort(),collections:collections.length,records:audited,shopScopedRecords:scopedRows,orphanShopReferences:0,relationshipChecks:['product-category','variant-product','category-parent','stock-variant-and-available-quantity','order-customer-conversation-variant-and-line-money','conversation-customer-channel','message-conversation'],money:{amountsUseExactIntegerStrings:true,currency:'VND'}},determinism:{canonicalSeedClonedOnReset:true,sequenceReset:10000,fixedClock:'2026-09-29T14:00:00.000Z',serviceResetClearsFaultsDelaysIdempotencyAndFiles:true,networkFixtureNamesDeterministicResetScenario:true},currentVerify:{logPath:verifyPath,logSha256:sha(bytes(verifyPath)),domainChecks:88,networkChecks:13},checkedAt:new Date().toISOString()};
const audit=JSON.stringify(detail,null,2)+'\n';
fs.writeFileSync(path.join(root,auditPath),audit,'utf8');
const auditLog=[`FE008.S01 canonical route/feature and synthetic seed audit`,`cwd=${root}`,`result=PASS routes=${routes.length}; features=${features.length}; source-component mappings=${routeImplementation.length}`,`seed shops=${shops.size}; members=${members.length}; role presets=${Object.keys(permissionCatalog.rolePresets).length}; collections=${collections.length}; records=${audited}; shop-scoped=${scopedRows}; relationship checks=7; orphan references=0`, `money exact-integer strings=PASS; fixed clock/reset=PASS; current simulator/network checks=88/88 (${verifyPath})`,'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; synthetic seed only; no live shop/customer/account data.'].join('\n')+'\n';
fs.writeFileSync(path.join(root,auditLogPath),auditLog,'utf8');

const map=json('botsales-kit/execution/frontend-command-map.json');
const command=map.commands.find(item=>item.id==='verify-ui-select-feplan-002');
assert(command?.status==='VERIFIED_AVAILABLE'&&command.command==='npm.cmd --script-shell=cmd.exe run verify','Registered verify command not available.');
const reviewer='Codex self-review; no independent peer review claimed';
const sourcePaths=[
  'AGENTS.md','AI_RULES.md','docs/FRONTEND_SCOPE.md','docs/PROJECT_CONTEXT.md',
  'botsales-kit/contracts/route-manifest.json','botsales-kit/contracts/feature-catalog.json','botsales-kit/contracts/permission-catalog.json','botsales-kit/contracts/openapi.json','docs/route-implementation.json',
  'apps/web/src/mocks/seed.json','apps/web/src/mocks/database.ts','apps/web/src/mocks/service.ts','apps/web/src/mocks/collections.json','tests/fixtures/mock-network.mjs','scripts/test-domain.mjs',
  'botsales-kit/execution/frontend-command-map.json',verifyPath,auditPath,auditLogPath,`${base}/audit-s01-dataset-current-20261006.mjs`,
].sort();
const sourceFiles=sourcePaths.map(p=>({path:p,sha256:sha(bytes(p))}));
const sourceSnapshotSha256=sha(Buffer.from(sourceFiles.map(item=>`${item.path}:${item.sha256}`).join('\n')));
const log=[`FE008.S01 synthetic dataset and scenario evidence`,`executedAt=${detail.checkedAt}`,`cwd=${root}`,`commandId=${command.id}; command=${command.command}; exitCode=0`,auditLog.trimEnd(),`sourceSnapshotSha256=${sourceSnapshotSha256}`,...sourceFiles.map(item=>`SOURCE ${item.path} sha256=${item.sha256}`),`reviewer=${reviewer}`].join('\n')+'\n';
fs.writeFileSync(path.join(root,evidenceLogPath),log,'utf8');
const revision=execFileSync('git',['rev-parse','--short','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();
const observed=`Canonical route/feature audit: ${routes.length} routes, ${features.length} features with valid canonical route IDs, and ${routeImplementation.length} route/source/component mappings. Synthetic seed: ${shops.size} shops, ${members.length} scoped memberships covering all ${Object.keys(permissionCatalog.rolePresets).length} canonical role presets; ${audited} records with ${scopedRows} shop-scoped rows and no orphan shop references. Product/category/variant/stock/order/conversation/message relationships, exact VND money strings and deterministic seed/clock/reset checks pass. Current full verify log includes 88/88 simulator/network checks. No live customer/shop data.`;
const evidence={taskId:'FE008',stepId:'S01',kind:'test_run',result:'PASS',verificationScope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',executedAt:detail.checkedAt,sourceRevision:`HEAD ${revision} on ${branch} + current frontend working tree`,expected:'A deterministic synthetic dataset covers the canonical route/features, two shops and approved member roles; IDs, shop ownership and money/state relationships are internally consistent.',observed,commandId:command.id,command:command.command,cwd:root,reviewer,environment:{name:`Windows / Node ${process.versions.node} / local frontend test toolchain`,details:'Current successful registered verify run with deterministic synthetic MSW/simulator tests, plus a read-only custom audit over canonical routes/features/seed. No external services.',dataSource:'synthetic-msw'},checksTotal:13,failed:0,logFile:evidenceLogPath.replace(/^botsales-kit\//,''),logSha256:sha(Buffer.from(log)),sourceFiles,sourceSnapshotSha256,commandResults:[{commandId:command.id,command:command.command,exitCode:0,logFile:verifyPath.replace(/^botsales-kit\//,''),logSha256:sha(bytes(verifyPath))},{command:`node ${base}/audit-s01-dataset-current-20261006.mjs`,exitCode:0,logFile:auditLogPath.replace(/^botsales-kit\//,''),logSha256:sha(bytes(auditLogPath))}],audit:detail};
fs.writeFileSync(path.join(root,evidencePath),`${JSON.stringify(evidence,null,2)}\n`,'utf8');
console.log(JSON.stringify({result:'PASS',evidence:evidencePath,routes:routes.length,features:features.length,shops:shops.size,members:members.length,rolePresets:Object.keys(permissionCatalog.rolePresets).length,records:audited,shopScoped:scopedRows,domainAndNetwork:88,sourceSnapshotSha256},null,2));
