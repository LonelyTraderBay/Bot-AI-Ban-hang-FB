import {useEffect} from 'react';
import {matchRoutes,useLocation} from 'react-router-dom';
import {routeManifest} from '@botsales/contracts';

const routes=routeManifest.routes.map(route=>({path:route.path,handle:route}));
/** Router ranking makes static create/review routes win over parameterized details. */
export function routeMetadata(pathname:string){return matchRoutes(routes,pathname)?.at(-1)?.route.handle;}
export function RouteMetadata(){
 const {pathname}=useLocation();
 const title=routeMetadata(pathname)?.title||'Không tìm thấy trang';
 useEffect(()=>{document.title=title+' · BotSales AI';},[title]);
 return null;
}
