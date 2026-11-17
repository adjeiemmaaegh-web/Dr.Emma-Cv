/**
 * Group C Stage 12: provider-independent, strictly opt-in AI port.
 * - Nothing is sent unless the caller passes a single-use consent bound to the exact prepared request.
 * - The API key lives only in this closure: never serialised, logged, stored or returned.
 * - Replies are converted to SuggestionPatch objects flagged for unsupported facts; they are never applied here.
 */
import {detectUnsupportedClaims} from '../intelligence/claims.mjs';
import {contractError} from '../../contracts/platform.mjs';
let n=0;
export function createAiPort({provider,endpointHost,allowedHosts,send}){
 if(!provider||typeof send!=='function'||!Array.isArray(allowedHosts)||!allowedHosts.length)
  throw contractError('INVALID','Provider, transport and explicit HTTPS host allowlist required');
 let url;
 try{url=new URL(endpointHost)}catch{throw contractError('INVALID','AI endpoint must be an absolute HTTPS URL')}
 const accepted=allowedHosts.every(h=>typeof h==='string'&&/^[a-z0-9.-]+(?::443)?$/i.test(h))&&
  allowedHosts.some(h=>url.host.toLowerCase()===h.toLowerCase());
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||
   !accepted||url.hostname==='localhost'||/^(127\\.|10\\.|192\\.168\\.|169\\.254\\.|172\\.(?:1[6-9]|2\\d|3[01])\\.)/.test(url.hostname))
  throw contractError('INVALID','AI endpoint is not an explicitly permitted public HTTPS host');
 let key=null;const used=new Set(),prepared=new Map();
 const redact=t=>key?String(t).split(key).join('[redacted]'):String(t);
 const api={
  setKey(k){if(typeof k!=='string'||k.length<8)throw contractError('INVALID','API key looks invalid');key=k;},
  clearKey(){key=null;},
  hasKey:()=>key!==null,
  toJSON:()=>({provider,hasKey:key!==null}),
  /** Returns exactly what would leave the device, for the user to read before consenting. */
  prepare({task,text,context=''}){
   if(typeof text!=='string'||!text.trim())throw contractError('INVALID','Text required');
   const id='ai'+(++n)+Math.random().toString(36).slice(2,8);
   const body={task,input:text,context};
   prepared.set(id,body);
   return Object.freeze({id,disclosure:{provider,host:endpointHost,willSend:JSON.stringify(body),notice:'This text will be sent to '+endpointHost+' if you approve.'}});
  },
  async execute(request,{consent,signal}={}){
   const body=prepared.get(request?.id);
   if(!body)throw contractError('INVALID','Unknown or expired request');
   if(!consent||consent.acknowledged!==true||consent.requestId!==request.id||used.has(request.id))
    throw contractError('UNCONFIRMED','Explicit one-time consent for this exact request is required');
   if(!key)throw contractError('UNAVAILABLE','No API key set for this session');
   used.add(request.id);prepared.delete(request.id);
   try{return await send({host:endpointHost,key,body,signal});}
   catch(e){throw Object.assign(new Error(redact(e&&e.message||'AI request failed')),{code:'UNAVAILABLE'});}
  },
  toSuggestion({path,before,after,sourceText,explanation='AI-proposed rewrite'}){
   const issues=detectUnsupportedClaims(after,sourceText);
   return {id:'ai-'+path.replace(/\W+/g,'-'),path,before,after,explanation,evidenceIds:[],unsupportedFact:issues.length>0,issues,status:'proposed',source:'ai'};
  }
 };
 return Object.freeze(api);
}
