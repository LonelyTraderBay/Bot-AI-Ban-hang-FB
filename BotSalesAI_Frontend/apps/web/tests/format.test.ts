import {describe,it,expect} from 'vitest';
import {formatMoney,safeInternalPath,csvCell} from '../src/shared/model/format';
import {assertSchema} from '../src/shared/api/validation';
import {operationUrl} from '../src/shared/api/client';
describe('Frontend boundary helpers',()=>{
 it('formats exact amounts without floating point rounding',()=>expect(formatMoney({amount:'9007199254740993.1250',currency:'VND'})).toBe('9.007.199.254.740.993,125 ₫'));
 it('does not turn missing amounts into zero',()=>expect(formatMoney(null)).toBe('Chưa có dữ liệu'));
 it.each(['//evil.example','/\\evil.example','https://evil.example'])('rejects external return path %s',value=>expect(safeInternalPath(value)).toBe('/workspaces'));
 it('quotes spreadsheet formula cells',()=>expect(csvCell('=1+1')).toBe('"\'=1+1"'));
 it('rejects malformed amount contracts',()=>expect(()=>assertSchema('Money',{amount:12,currency:'VND'})).toThrow());
 it('encodes resource IDs instead of path traversal',()=>expect(operationUrl('getProduct',{shopId:'a',productId:'../b'})).toContain('..%2Fb'));
});
