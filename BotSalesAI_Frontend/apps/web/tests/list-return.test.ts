import {describe,it,expect} from 'vitest';
import {listReturnState,resolveListReturn} from '../src/shared/model/list-return';
describe('scoped list return',()=>{
 it('preserves committed contract filters and cursor',()=>{const state=listReturnState('/s/a/products','?q=AO-002&status=active&cursor=next&unsafe=secret','/s/a/products/p1');expect(resolveListReturn(state,'/s/a/products')).toBe('/s/a/products?q=AO-002&status=active&cursor=next');});
 it('rejects cross-shop, arbitrary destinations and malformed state',()=>{expect(listReturnState('/s/a/products','?q=x','/s/b/products/p1')).toBeUndefined();for(const state of [null,{}, {listReturn:{pathname:'https://other.invalid',search:'?q=x'}},{listReturn:{pathname:'/s/a/products',search:42}}])expect(resolveListReturn(state,'/s/b/products')).toBe('/s/b/products');});
 it('direct detail routes have a predictable list fallback',()=>expect(resolveListReturn(undefined,'/s/a/orders')).toBe('/s/a/orders'));
});
