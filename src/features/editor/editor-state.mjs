/**
 * Group B Stage 5: command-based CV editor model with undo/redo.
 * Pure and storage-free: persistence is the host's job (LocalRepositoryPort via Group A).
 * Invariants: commands never drop content silently; every change is undoable; document stays contract-valid.
 */
import {validLegacyDocument} from '../../domain/storage/legacy-shape.mjs';
import {normalizeAppearance} from '../templates/registry.mjs';
import {DEFAULT_SECTION_ORDER} from '../documents/layout.mjs';
const LISTS=['experience','education','skills','languages','certifications','projects','accomplishments','customSections'];
const TEXTS=['summary','hobbies','references'];
const clone=v=>JSON.parse(JSON.stringify(v));
const fail=(code,message)=>Object.assign(new Error(message),{code});
let seq=0;
const newId=()=>'i'+Date.now().toString(36)+(seq++).toString(36)+Math.random().toString(36).slice(2,6);
const ensureIds=doc=>{for(const k of LISTS)for(const it of doc[k])if(typeof it.id!=='string'||!it.id)it.id=newId();return doc;};
export function createEditor({document,appearance={},limit=100,onChange}={}){
 if(!validLegacyDocument(document))throw fail('INVALID','Invalid CV document');
 let state={document:ensureIds(clone(document)),appearance:normalizeAppearance(appearance).appearance};
 const past=[],future=[],listeners=new Set();if(onChange)listeners.add(onChange);
 let lastKey=null,saved=JSON.stringify(state);
 const emit=()=>{const snap=api.snapshot();for(const l of listeners)l(snap);};
 function commit(next,key){
  if(!validLegacyDocument(next.document))throw fail('INVALID','Command produced an invalid document');
  const same=JSON.stringify(next)===JSON.stringify(state);if(same)return api.snapshot();
  if(!(key&&key===lastKey)){past.push(state);if(past.length>limit)past.shift();}
  lastKey=key||null;future.length=0;state=next;emit();return api.snapshot();
 }
 const draft=()=>({document:clone(state.document),appearance:clone(state.appearance)});
 const list=(d,name)=>{if(!LISTS.includes(name))throw fail('INVALID','Unknown section '+name);return d.document[name];};
 const find=(arr,id)=>{const i=arr.findIndex(x=>x.id===id);if(i<0)throw fail('INVALID','Unknown item');return i;};
 const api={
  snapshot:()=>({document:clone(state.document),appearance:clone(state.appearance),canUndo:past.length>0,canRedo:future.length>0,dirty:JSON.stringify(state)!==saved}),
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  markSaved(acknowledged){
   // Acknowledge only the immutable snapshot that actually reached storage.
   saved=JSON.stringify(acknowledged?{document:acknowledged.document,appearance:acknowledged.appearance}:state);
   emit();
  },
  setPersonal(field,value){const d=draft();if(typeof field!=='string'||/^__|prototype|constructor/.test(field)||typeof value!=='string')throw fail('INVALID','Invalid personal field');
   d.document.personalInfo[field]=value;return commit(d,'p:'+field);},
  setText(field,value){if(!TEXTS.includes(field)||typeof value!=='string')throw fail('INVALID','Invalid text field');const d=draft();d.document[field]=value;return commit(d,'t:'+field);},
  addItem(section,item={}){const d=draft();const arr=list(d,section);const it={...clone(item),id:newId()};arr.push(it);commit(d);return it.id;},
  updateItem(section,id,patch){const d=draft(),arr=list(d,section),i=find(arr,id);
   for(const k of Object.keys(patch))if(k==='id'||/^__|prototype|constructor/.test(k))throw fail('INVALID','Protected field');
   arr[i]={...arr[i],...clone(patch)};return commit(d,'u:'+id+':'+Object.keys(patch).join());},
  removeItem(section,id){const d=draft(),arr=list(d,section);arr.splice(find(arr,id),1);return commit(d);},
  /** Keyboard-friendly alternative to drag and drop. delta -1 up, +1 down; clamped, no loss. */
  moveItem(section,id,delta){const d=draft(),arr=list(d,section),i=find(arr,id),j=Math.max(0,Math.min(arr.length-1,i+delta));
   if(i===j)return api.snapshot();const [it]=arr.splice(i,1);arr.splice(j,0,it);return commit(d);},
  moveSection(key,delta){const d=draft();const order=(Array.isArray(d.appearance.sectionOrder)?[...d.appearance.sectionOrder]:[...DEFAULT_SECTION_ORDER]);
   for(const k of DEFAULT_SECTION_ORDER)if(!order.includes(k))order.push(k);
   const i=order.indexOf(key);if(i<0)throw fail('INVALID','Unknown section');const j=Math.max(0,Math.min(order.length-1,i+delta));
   order.splice(i,1);order.splice(j,0,key);d.appearance.sectionOrder=order;return commit(d);},
  setAppearance(patch){const d=draft();const r=normalizeAppearance({...d.appearance,...patch});
   if(r.errors.length)throw fail('INVALID',r.errors.join('; '));d.appearance=r.appearance;return commit(d);},
  replaceAppearance(appearance){
   const d=draft(),r=normalizeAppearance(appearance);
   if(r.errors.length)throw fail('INVALID',r.errors.join('; '));
   d.appearance=r.appearance;return commit(d);
  },
  undo(){if(!past.length)return api.snapshot();future.push(state);state=past.pop();lastKey=null;emit();return api.snapshot();},
  redo(){if(!future.length)return api.snapshot();past.push(state);state=future.pop();lastKey=null;emit();return api.snapshot();}
 };
 return api;
}
