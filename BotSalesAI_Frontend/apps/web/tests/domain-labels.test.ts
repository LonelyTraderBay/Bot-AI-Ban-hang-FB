import {describe,it,expect} from 'vitest';
import {label} from '../src/shared/model/labels';
import schemas from '../../../packages/contracts/src/schemas.json';
describe('domain labels',()=>{
 it('separates stock receipt from finance receipt and period open from case open',()=>{
  expect(label('receipt','stockMovement')).toBe('Nhập kho');
  expect(label('receipt')).toBe('Phiếu thu');
  expect(label('open','accountingPeriod')).toBe('Đang mở');
  expect(label('open')).toBe('Đang xử lý');
 });
 it('uses operational warnings rather than a block for stock availability',()=>{
  expect(label('low_stock','stock')).toBe('Sắp hết hàng');
  expect(label('out_of_stock','stock')).toBe('Hết hàng');
  expect(label('in_stock','stock')).toBe('Còn hàng');
 });
 it('labels the canonical enums used for state/kind/status presentation',()=>{
  const domains={StockMovement:'stockMovement',AccountingPeriod:'accountingPeriod',ReturnCase:'return',Message:'message',ConsentChallenge:'consent',ConsentConfirmation:'consent',CustomerConsent:'consent'} as const;
  for(const [name,schema] of Object.entries(schemas.components.schemas)){
   const visit=(node:unknown)=>{
    if(!node||typeof node!=='object')return;
    const value=node as {properties?:Record<string,{enum?:string[]}>;allOf?:unknown[]};
    for(const [field,property] of Object.entries(value.properties||{}))if(['status','state','kind','orderState','fulfillmentState','paymentState'].includes(field)&&property.enum){
     for(const item of property.enum)expect(label(item,domains[name as keyof typeof domains]),name+'.'+field+':'+item).not.toBe('Chưa xác định');
    }
    value.allOf?.forEach(visit);
   };visit(schema);
  }
  expect(label('not-a-canonical-state')).toBe('Chưa xác định');
  expect(label('unknown','capability')).toBe('Chưa xác minh');
 });
});
