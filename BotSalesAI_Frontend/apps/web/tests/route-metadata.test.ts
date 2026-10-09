import {describe,it,expect} from 'vitest';
import {routeManifest} from '@botsales/contracts';
import {routeMetadata} from '../src/app/route-metadata';
describe('UX07 canonical route metadata',()=>{
 it('uses router ranking to distinguish static create/review pages from detail parameters',()=>{
  expect(routeMetadata('/s/demo/products/new')?.id).toBe('R10');
  expect(routeMetadata('/s/demo/products/p1')?.id).toBe('R11');
  expect(routeMetadata('/s/demo/knowledge/review')?.id).toBe('R25');
 });
 it('resolves every canonical route without putting object identities in tab titles',()=>{
  for(const route of routeManifest.routes){const pathname=route.path.replace(/:[^/]+/g,'synthetic-id');expect(routeMetadata(pathname)?.id).toBe(route.id);}
  expect(routeMetadata('/s/demo/products/sensitive-customer-name')?.title).toBe('Chi tiết sản phẩm');
  expect(routeMetadata('/unrecognized')).toBeUndefined();
 });
});
