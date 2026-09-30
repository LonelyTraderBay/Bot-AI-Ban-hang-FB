/* Push-only worker. Never cache customer data, tokens, API responses or HTML. */
self.addEventListener('push',event=>{
 let payload;try{payload=event.data?.json();}catch{return;}
 if(!payload||typeof payload.title!=='string')return;
 const path=typeof payload.path==='string'&&/^\/s\/[A-Za-z0-9_-]+\/(orders|notifications|operations)(\/|$)/.test(payload.path)?payload.path:'/workspaces';
 event.waitUntil(self.registration.showNotification(payload.title.slice(0,120),{body:typeof payload.safeBody==='string'?payload.safeBody.slice(0,180):'Mở ứng dụng để xem.',tag:typeof payload.eventId==='string'?payload.eventId:undefined,data:{path}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const path=event.notification.data?.path||'/workspaces';const target=new URL(path,self.location.origin);
 if(target.origin!==self.location.origin)return;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{const existing=windows.find(w=>new URL(w.url).origin===self.location.origin);if(existing){await existing.navigate(target.href);await existing.focus();}else await clients.openWindow(target.href);}));
});
