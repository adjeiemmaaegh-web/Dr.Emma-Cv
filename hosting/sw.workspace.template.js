/* Public workspace shell only. Never cache user CVs, uploads, API calls or downloads. */
'use strict';
const CACHE='WORKSPACE_CACHE_KEY';
const SHELL=new Set(WORKSPACE_PUBLIC_ASSETS);
const isShell=u=>u.origin===self.location.origin&&SHELL.has(u.pathname);
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // Populate only source-controlled static shell assets. Missing resources
  // should not prevent the online app from loading.
  await Promise.all([...SHELL].map(async url=>{
   try{const res=await fetch(url,{cache:'no-cache'});if(res.ok)await cache.put(url,res)}
   catch{/* offline install; best effort */}
  }));
 })());
 // Deliberately do NOT call skipWaiting: Group E requires user approval.
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('ledger-workspace-')&&key!==CACHE)
   await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||req.headers.has('range'))return;
 const u=new URL(req.url);
 if(!isShell(u))return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const res=await fetch(req);
    if(res.ok)try{await (await caches.open(CACHE)).put('/index.html',res.clone())}catch{}
    return res;
   }catch{return (await caches.match('/index.html'))||Response.error()}
  })());
  return;
 }
 event.respondWith((async()=>{
  const cached=await caches.match(req,{ignoreSearch:true});
  if(cached)return cached;
  try{
   const res=await fetch(req);if(res.ok)try{await (await caches.open(CACHE)).put(u.pathname,res.clone())}catch{}
   return res;
  }catch{return Response.error()}
 })());
});
