/**
 * Stage A1 isolated route adapter. Existing monolithic CV editor stays untouched.
 * Feature teams mount only in their assigned slot; navigation is serialized.
 */
export function createFrontendComposition({registry,host,routes,services={}}={}){
 if(!registry||typeof registry.mount!=='function'||typeof registry.unmount!=='function'||
    !host||!host.ownerDocument||typeof host.append!=='function')
  throw new TypeError('A feature registry and DOM host are required');
 if(!routes||typeof routes!=='object'||Array.isArray(routes))
  throw new TypeError('Routes must be a path-to-feature mapping');
 const routeMap=new Map(Object.entries(routes));
 for(const [path,id] of routeMap){
  if(!/^\/[a-z0-9/-]*$/.test(path)||typeof id!=='string'||!registry.isRegistered(id))
   throw new TypeError('Invalid or unregistered route: '+path);
 }
 let current=null,disposed=false,queue=Promise.resolve();
 function serial(operation){
  const pending=queue.then(operation);
  queue=pending.catch(()=>{});
  return pending;
 }
 function navigate(path){
  return serial(async()=>{
   if(disposed)throw new Error('Composition has been disposed');
   const featureId=routeMap.get(path);
   if(!featureId)throw new Error('Unknown route: '+path);
   if(current?.path===path)return Object.freeze({path,featureId});
   if(current){
    await registry.unmount(current.featureId);
    current.slot.remove();current=null;
   }
   const slot=host.ownerDocument.createElement('section');
   slot.className='ledger-route-slot';
   slot.setAttribute('data-ledger-route',path);
   slot.tabIndex=-1;host.append(slot);
   try{
    await registry.mount(featureId,{host:slot,services});
    current={path,featureId,slot};slot.focus();
    return Object.freeze({path,featureId});
   }catch(error){slot.remove();throw error}
  });
 }
 function dispose(){
  return serial(async()=>{
   if(disposed)return;
   if(current){
    // Do not mark disposed until cleanup succeeds. A failing feature cleanup
    // leaves the route attached so the caller can retry and recover safely.
    await registry.unmount(current.featureId);
    current.slot.remove();current=null;
   }
   disposed=true;
  });
 }
 return Object.freeze({navigate,currentRoute:()=>current?.path??null,dispose});
}
