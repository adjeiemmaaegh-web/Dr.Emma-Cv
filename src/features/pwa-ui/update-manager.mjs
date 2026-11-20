/**
 * Group E Stage 18: safe offline updates. A waiting service worker is only activated when the user agrees AND there is no unsaved work.
 * Requires Group A's worker to wait for {type:'SKIP_WAITING'} instead of calling skipWaiting() on install (see docs request).
 */
export function createUpdateManager({registration,hasUnsavedWork=()=>false,onChange=()=>{},reload=()=>globalThis.location?.reload(),serviceWorker=globalThis.navigator?.serviceWorker}={}){
 let state={status:'idle',blockedReason:null};
 const set=p=>{state={...state,...p};onChange({...state});};
 let reloading=false;
 const consider=()=>{if(state.status==='applying')return; if(registration?.waiting&&serviceWorker?.controller&&state.status!=='available')set({status:'available',blockedReason:null});};
 if(registration){
  consider();
  registration.addEventListener?.('updatefound',()=>{
   const w=registration.installing;
   w?.addEventListener('statechange',()=>{if(w.state==='installed')consider();});
  });
 }
 serviceWorker?.addEventListener?.('controllerchange',()=>{
  if(reloading||state.status!=='applying')return; // only reload for an update the user approved
  reloading=true;reload();
 });
 return {
  getState:()=>{consider();return {...state};},
  /** Returns {ok} or {ok:false,reason}; never reloads over unsaved work. */
  apply(){
   consider();
   if(state.status!=='available'||!registration?.waiting)return {ok:false,reason:'no-update'};
   if(hasUnsavedWork()){set({blockedReason:'unsaved'});return {ok:false,reason:'unsaved'};}
   set({status:'applying',blockedReason:null});
   registration.waiting.postMessage({type:'SKIP_WAITING'});
   return {ok:true};
  },
  later(){if(state.status==='available')set({status:'deferred'});},
  recheck(){return registration?.update?.().then(consider,()=>{});}
 };
}
