import {describe,it,expect} from 'vitest';
import {dateTime,formatMoney,safeInternalPath,csvCell,codePointLength,limitCodePoints} from '../src/shared/model/format';
import {assertSchema} from '../src/shared/api/validation';
import {operationUrl} from '../src/shared/api/client';
describe('Frontend boundary helpers',()=>{
 it('counts and limits Unicode code points consistently with customer and privacy contracts',()=>{
  expect(codePointLength('')).toBe(0);
  expect(codePointLength('Việt')).toBe(4);
  expect(codePointLength('😀')).toBe(1);
  expect(codePointLength('e\u0301')).toBe(2);
  expect(codePointLength('👨‍👩‍👧‍👦')).toBe(7);
  expect(limitCodePoints('😀Việt',2)).toBe('😀V');
  expect(limitCodePoints('e\u0301',1)).toBe('e');
  expect(limitCodePoints('😀',0)).toBe('');
  expect(()=>assertSchema('CustomerWritePatch',{notes:'😀'.repeat(4000)})).not.toThrow();
  expect(()=>assertSchema('CustomerWritePatch',{notes:'😀'.repeat(4001)})).toThrow();
  expect(()=>assertSchema('PrivacyPolicyWritePatch',{jurisdictionNote:'😀'.repeat(4)})).toThrow();
  expect(()=>assertSchema('PrivacyPolicyWritePatch',{jurisdictionNote:'😀'.repeat(5)})).not.toThrow();
  expect(()=>assertSchema('PrivacyPolicyWritePatch',{jurisdictionNote:'😀'.repeat(2000)})).not.toThrow();
  expect(()=>assertSchema('PrivacyPolicyWritePatch',{jurisdictionNote:'😀'.repeat(2001)})).toThrow();
 });
 it('formats the same instant using the required shop timezone',()=>{
  const instant='2026-09-29T20:30:00.000Z';
  expect(dateTime(instant,'UTC')).toBe('20:30 29/9/26');
  expect(dateTime(instant,'Asia/Vientiane')).toBe('03:30 30/9/26');
  expect(dateTime(instant,'America/Los_Angeles')).toBe('13:30 29/9/26');
 });
 it('formats exact amounts without floating point rounding',()=>expect(formatMoney({amount:'9007199254740993.1250',currency:'VND'})).toBe('9.007.199.254.740.993,125 ₫'));
 it('does not turn missing amounts into zero',()=>expect(formatMoney(null)).toBe('Chưa có dữ liệu'));
 it.each(['//evil.example','/\\evil.example','https://evil.example'])('rejects external return path %s',value=>expect(safeInternalPath(value)).toBe('/workspaces'));
 it('rejects NUL bytes in internal return paths',()=>expect(safeInternalPath('/products/\0bad')).toBe('/workspaces'));
 it('quotes spreadsheet formula cells',()=>expect(csvCell('=1+1')).toBe('"\'=1+1"'));
 it('rejects malformed amount contracts',()=>expect(()=>assertSchema('Money',{amount:12,currency:'VND'})).toThrow());
 it('accepts opaque contract IDs and rejects path traversal values',()=>{
  expect(operationUrl('getProduct',{shopId:'shop_1',productId:'product-2'})).toBe('/api/v2/shops/shop_1/products/product-2');
  expect(()=>operationUrl('getProduct',{shopId:'a',productId:'../b'})).toThrow('Tham số productId không đúng hợp đồng API');
 });
});
