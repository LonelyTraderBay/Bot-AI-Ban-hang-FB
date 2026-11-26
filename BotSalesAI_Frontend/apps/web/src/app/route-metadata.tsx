import {useEffect} from 'react';
import {matchRoutes,useLocation} from 'react-router-dom';
import {routeManifest} from '@botsales/contracts';
import {navigation} from './navigation';

const routes=routeManifest.routes.map(route=>({path:route.path,handle:route}));
const menuTitles = new Map<string, string>(navigation.flatMap(group => group.items.map(([id, title]) => [id, title] as const)));
/** Router ranking makes static create/review routes win over parameterized details. */
export function routeMetadata(pathname:string){return matchRoutes(routes,pathname)?.at(-1)?.route.handle;}
export function routeDisplayTitle(route: ReturnType<typeof routeMetadata>) {
    return route && (menuTitles.get(route.id) ?? route.title);
}
export function RouteMetadata(){
 const {pathname}=useLocation();
 const title=routeDisplayTitle(routeMetadata(pathname))||'Không tìm thấy trang';
 useEffect(()=>{document.title=title+' · BotSales AI';},[title]);
 return null;
}
