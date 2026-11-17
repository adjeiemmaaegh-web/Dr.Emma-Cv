/* Ledger E29: only static public application shell cached. Never cache CVs,
 * imported files, provider requests, downloads, user content or remote origins. */
'use strict';
const CACHE='HOSTED_SHELL_VERSION';
const PUBLIC_SHELL=['/index.html','/site.webmanifest','/favicon.svg'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  try{const cache=await caches.open(CACHE);await cache.addAll(PUBLIC_SHELL)}
  catch{ /* If offline cache fails, online mode still works */ }
  // Updates wait until a foreground client explicitly approves activation.
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())
   if(/^ledger-e(?:29|30|31)-[a-f0-9]{14}$/.test(key)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const response=await fetch(req);
    if(response.ok){
     try{await (await caches.open(CACHE)).put('/index.html',response.clone())}catch{}
    }
    return response;
   }catch{return await caches.match('/index.html')||Response.error()}
  })());
  return;
 }
 if(['/site.webmanifest','/favicon.svg'].includes(url.pathname)){
  event.respondWith((async()=>await caches.match(req)||fetch(req))());
 }
});