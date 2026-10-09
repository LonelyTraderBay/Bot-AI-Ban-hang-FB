import {useLocation} from 'react-router-dom';
import {operations} from '@botsales/contracts';

const listOperations={products:'listProducts',customers:'listCustomers',orders:'listOrders',knowledge:'listKnowledge'} as const;
type ReturnContext={pathname:string;search:string};
function collection(pathname:string){const match=/^\/s\/([^/]+)\/(products|customers|orders|knowledge)$/.exec(pathname);return match?{shop:match[1],name:match[2] as keyof typeof listOperations}:null;}
function allowedSearch(pathname:string,search:string){const owner=collection(pathname);if(!owner||search.length>4096)return '';const allowed=new Set(operations[listOperations[owner.name]].queryParameters.map(p=>p.name));const output=new URLSearchParams();for(const [key,value] of new URLSearchParams(search))if(allowed.has(key))output.set(key,value);return output.size?'?'+output.toString():'';}

export function listReturnState(pathname:string,search:string,destination:string){
 const owner=collection(pathname);
 if(!owner||!destination.startsWith(pathname+'/'))return undefined;
 return {listReturn:{pathname,search:allowedSearch(pathname,search)}};
}
export function resolveListReturn(state:unknown,fallback:string){
 if(!state||typeof state!=='object'||!('listReturn' in state))return fallback;
 const context=state.listReturn as Partial<ReturnContext>|null;
 if(!context||context.pathname!==fallback||typeof context.search!=='string'||!collection(fallback))return fallback;
 return fallback+allowedSearch(fallback,context.search);
}
export function useListReturn(fallback:string){return resolveListReturn(useLocation().state,fallback);}
