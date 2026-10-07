import fs from 'node:fs';
const root=process.cwd();
const read=(file)=>JSON.parse(fs.readFileSync(file,'utf8'));
const openapi=read('botsales-kit/contracts/openapi.json');
const routes=read('botsales-kit/contracts/route-manifest.json');
const permissions=fs.readFileSync('botsales-kit/contracts/permission-catalog.json','utf8');
const events=fs.readFileSync('botsales-kit/contracts/events.schema.json','utf8');
const schemas=openapi.components.schemas;
const operations=Object.values(openapi.paths).flatMap(path=>Object.values(path)).filter(operation=>operation&&typeof operation==='object'&&operation.operationId);
const ids=operations.map(operation=>operation.operationId);
const knowledge=schemas.Knowledge;
const checks={
  openapi31:openapi.openapi==='3.1.0',
  allOperationIdsUnique:ids.length===210&&new Set(ids).size===ids.length,
  canonicalRouteCount:routes.routes.length===54,
  moneyUsesDecimalString:schemas.Money.properties.amount.$ref.endsWith('/Decimal')&&schemas.Decimal.type==='string',
  idsAreStrings:schemas.Id.type==='string',
  nullableCustomerFieldsStayNullable:schemas.Customer.properties.phone.anyOf.some(x=>x.type==='null')&&schemas.Customer.properties.email.anyOf.some(x=>x.type==='null'),
  problemContractHasStructuredErrorFields:['status','code','requestId'].every(k=>schemas.Problem.required.includes(k)),
  publishPermissionExists:permissions.includes('knowledge.publish'),
  publishedEventExists:events.includes('knowledge.published'),
  knowledgeAllowedActionsAbsent:!Object.hasOwn(knowledge.properties,'allowedActions'),
};
const result={status:Object.values(checks).every(Boolean)?'PASS':'FAIL',scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',openapi:openapi.openapi,paths:Object.keys(openapi.paths).length,operations:ids.length,uniqueOperationIds:new Set(ids).size,routes:routes.routes.length,checks};
console.log(JSON.stringify(result,null,2));
if(result.status!=='PASS')process.exitCode=1;
