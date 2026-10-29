/** Stage 8 Stage-6 application data validator, with no browser or storage dependency. */
export const APPLICATION_STATUSES=Object.freeze(['Saved','Applied','Interview','Offer','Rejected','Withdrawn']);
const FIELDS=Object.freeze(['company','role','location','url','notes','date','status']);
export function validateLegacyApplications(value){
  if(!Array.isArray(value)||value.length>300)return false;
  const ids=new Set();
  for(const entry of value){
    if(entry===null||typeof entry!=='object'||Array.isArray(entry)||
      typeof entry.id!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(entry.id)||ids.has(entry.id))return false;
    ids.add(entry.id);
    for(const field of FIELDS){
      const text=entry[field];
      if(typeof text!=='string'||text.length>(field==='notes'?3000:field==='url'?1000:200))return false;
    }
    if(!APPLICATION_STATUSES.includes(entry.status))return false;
    if(entry.date&&!/^\d{4}-\d{2}-\d{2}$/.test(entry.date))return false;
    if(entry.url&&!/^https?:\/\//i.test(entry.url))return false;
  }
  return true;
}
