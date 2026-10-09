/** DEV/TEST ONLY. Empty books retain canonical masters, never fabricate an opening journal. */
import {db,all,insert,rows,str,now,money} from './database';
export function loadEmptyManagementDataset() {
    const shop=all('shops','shop-demo')[0];
    if(!shop)throw new Error('Shop mẫu không tồn tại.');
    const currency=str(shop.currency);
    const keep=new Set(['shops','members','accounts','warehouses','periods','products','customers','addresses','suppliers','offers','bots','privacyPolicies','notificationPolicies','conversations']);
    for(const collection of Object.keys(db))if(!keep.has(collection)){const records=db[collection];if(records)db[collection]=records.filter(r=>r.shopId!=='shop-demo');}
    for(const product of all('products','shop-demo'))for(const variant of rows(product.variants))for(const warehouse of all('warehouses','shop-demo').filter(w=>w.status==='active'))insert('stock','StockSnapshot','shop-demo',{variantId:variant.id,warehouseId:warehouse.id,sku:variant.sku,onHand:0,reserved:0,available:0,lowStockThreshold:0,unitCost:null,carryingValue:money(0n,currency),asOf:now()});
}
