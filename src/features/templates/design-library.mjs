/**
 * Local, reusable visual CV designs. Only presentation choices are stored:
 * never names, CV body text, contact details, or profile IDs.
 * Corrupted or unavailable storage fails closed rather than overwriting data.
 */
import {normalizeAppearance} from './registry.mjs';
export const DESIGN_KEY='ledger_workspace_cv_designs_v1';
const MAX_DESIGNS=20;
const KEYS=['template','color','font','fontSize','spacing','margins','paper','headerStyle','columns','photo',
 'sectionOrder','enabledSections','bodySize','leading','sectionGap','marginSize','headerScale','ruleStyle'];
const clone=o=>JSON.parse(JSON.stringify(o));
export function designAppearance(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid design');
 const filtered={};
 for(const key of KEYS)if(Object.hasOwn(input,key))filtered[key]=clone(input[key]);
 const result=normalizeAppearance(filtered);
 if(result.errors.length)throw Error(result.errors.join('; '));
 return result.appearance;
}
export function readDesigns(storage){
 if(!storage||typeof storage.getItem!=='function')throw Error('Design storage is unavailable');
 const text=storage.getItem(DESIGN_KEY);
 if(text===null)return [];
 let parsed;
 try{parsed=JSON.parse(text)}catch{throw Error('Saved designs are unreadable; export or repair them before saving another design')}
 if(!parsed||parsed.version!==1||!Array.isArray(parsed.designs)||parsed.designs.length>MAX_DESIGNS)
  throw Error('Saved designs use an unsupported format; nothing was changed');
 const ids=new Set();
 return parsed.designs.map(d=>{
  if(!d||typeof d.id!=='string'||!/^[a-zA-Z0-9-]{1,70}$/.test(d.id)||ids.has(d.id)||
   typeof d.name!=='string'||d.name.length>80||!d.name.trim())
   throw Error('Saved designs are damaged; nothing was overwritten');
  ids.add(d.id);
  return {id:d.id,name:d.name,appearance:designAppearance(d.appearance)};
 });
}
function write(storage,designs){
 const payload=JSON.stringify({version:1,designs});
 storage.setItem(DESIGN_KEY,payload);
 // Some restricted storage implementations do not throw on failed writes.
 if(storage.getItem(DESIGN_KEY)!==payload)throw Error('Design storage did not confirm the saved data');
}
export function saveDesign(storage,name,appearance){
 const safeName=String(name??'').trim();
 if(!safeName||safeName.length>80)throw Error('Enter a design name (1–80 characters)');
 const designs=readDesigns(storage);
 if(designs.length>=MAX_DESIGNS)throw Error('Design library is full (20 designs). Remove one before saving');
 const id='d-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
 const item={id,name:safeName,appearance:designAppearance(appearance)};
 write(storage,[...designs,item]);return item;
}
export function removeDesign(storage,id){
 const designs=readDesigns(storage);
 if(!designs.some(d=>d.id===id))throw Error('Design not found');
 write(storage,designs.filter(d=>d.id!==id));
}

/** Portable design-only JSON; excludes document, profile and application data. */
export const DESIGN_EXPORT_FORMAT='ledger-cv-appearance-library';
export function exportDesigns(storage){
 return JSON.stringify({format:DESIGN_EXPORT_FORMAT,version:1,
  designs:readDesigns(storage).map(d=>({name:d.name,appearance:designAppearance(d.appearance)}))},null,2);
}
export function previewDesignImport(text){
 if(typeof text!=='string'||text.length>128000)throw Error('Design file must be a JSON document under 128 KB');
 let data;try{data=JSON.parse(text)}catch{throw Error('Design file is not valid JSON')}
 if(!data||Array.isArray(data)||typeof data!=='object'||data.format!==DESIGN_EXPORT_FORMAT||data.version!==1||
  !Array.isArray(data.designs)||data.designs.length<1||data.designs.length>MAX_DESIGNS ||
  Object.keys(data).some(k=>!['format','version','designs'].includes(k)))
  throw Error('Unsupported design-only export: no data was imported');
 const names=new Set();
 const designs=data.designs.map(entry=>{
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||
   Object.keys(entry).some(k=>!['name','appearance'].includes(k))||
   typeof entry.name!=='string'||!entry.name.trim()||entry.name.length>80)
   throw Error('Invalid design in export');
  const name=entry.name.trim(),key=name.toLocaleLowerCase('en');
  if(names.has(key))throw Error('Duplicate design names in export');
  names.add(key);
  return {name,appearance:designAppearance(entry.appearance)};
 });
 return {count:designs.length,designs};
}
/** No writes occur until the user explicitly accepts the reviewed import. */
export function importDesigns(storage,text,{confirmed=false}={}){
 if(confirmed!==true)throw Error('Import requires explicit review and confirmation');
 const incoming=previewDesignImport(text),old=readDesigns(storage);
 if(old.length+incoming.count>MAX_DESIGNS)throw Error('Design library holds at most 20 designs; nothing was changed');
 const existing=new Set(old.map(d=>d.name.toLocaleLowerCase('en')));
 if(incoming.designs.some(d=>existing.has(d.name.toLocaleLowerCase('en'))))
  throw Error('A design with the same name already exists; nothing was overwritten');
 const next=[...old,...incoming.designs.map(d=>({
  id:'d-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),
  name:d.name,appearance:d.appearance
 }))];
 write(storage,next);return incoming.count;
}
