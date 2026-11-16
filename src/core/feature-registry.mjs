/**
 * Ledger frontend extension boundary. Pure runtime, no legacy DOM/storage access.
 * Groups B-E register feature modules; Group A owns the application composition root.
 */
const VALID_ID=/^[a-z][a-z0-9-]{1,63}$/;
const cloneMeta=feature=>Object.freeze({id:feature.id,dependencies:Object.freeze([...feature.dependencies])});
export function createFeatureRegistry(){
 const defined=new Map();
 const active=new Map();
 const pending=new Set();
 function register(input){
  if(!input||typeof input!=='object'||!VALID_ID.test(input.id)||typeof input.mount!=='function')
   throw new TypeError('Feature requires a valid id and mount function');
  if(defined.has(input.id))throw new Error('Duplicate feature: '+input.id);
  const dependencies=[...new Set(input.dependencies||[])];
  if(!Array.isArray(input.dependencies||[])||dependencies.some(id=>!VALID_ID.test(id)||id===input.id))
   throw new TypeError('Invalid feature dependencies');
  defined.set(input.id,Object.freeze({id:input.id,dependencies,mount:input.mount}));
  return Object.freeze({id:input.id});
 }
 async function mount(id,{host,services={}}={}){
  const feature=defined.get(id);
  if(!feature)throw new Error('Unknown feature: '+id);
  if(active.has(id)||pending.has(id))throw new Error('Feature already mounted or pending: '+id);
  if(!host || typeof host!=='object')throw new TypeError('Host is required');
  for(const dep of feature.dependencies)if(!active.has(dep))throw new Error('Missing mounted dependency: '+dep);
  pending.add(id);
  try{
   const result=await feature.mount(Object.freeze({host,services}));
   const cleanup=typeof result==='function'?result:result&&typeof result.dispose==='function'?()=>result.dispose():null;
   if(result!==undefined&&result!==null&&!cleanup)throw new TypeError('Mount must return a cleanup function, disposable, or nothing');
   active.set(id,cleanup);
   return Object.freeze({id,status:'mounted'});
  }finally{pending.delete(id)}
 }
 async function unmount(id){
  if(!active.has(id))return false;
  if([...active.keys()].some(other=>other!==id&&defined.get(other).dependencies.includes(id)))
   throw new Error('Unmount dependents first: '+id);
  const cleanup=active.get(id);
  if(cleanup)await cleanup();
  active.delete(id);
  return true;
 }
 return Object.freeze({
  register,mount,unmount,
  list:()=>Object.freeze([...defined.values()].map(cloneMeta)),
  isMounted:id=>active.has(id),
  isRegistered:id=>defined.has(id)
 });
}
