/** Group C Stage 10: locally parse pasted vacancy text into a JobTarget (Group A contract). Raw text is always kept. */
import {contractError} from '../../contracts/platform.mjs';
import {tokens,isStop} from '../intelligence/text.mjs';
const REQ_HEAD=/^(requirements?|essential|must[- ]have|what you('|’)?ll need|what we('|’)?re looking for|qualifications?|about you|skills and experience|you will have|minimum qualifications?)\b/i;
const PREF_HEAD=/^(preferred|desirable|nice[- ]to[- ]have|bonus|plus|it would be (great|a plus)|ideally|advantageous)\b/i;
const DUTY_HEAD=/^(responsibilities|duties|the role|what you('|’)?ll do|key responsibilities|about the role)\b/i;
const OTHER_HEAD=/^(benefits|what we offer|about us|the company|how to apply|salary|equal opportunit)/i;
const BULLET=/^\s*(?:[•●▪◦*\-–]|\d+[.)])\s+/;
const SENIORITY=[['executive',/\b(chief|director|vp|vice president|head of)\b/i],['senior',/\b(senior|lead|principal|staff)\b/i],['mid',/\b(mid[- ]level|intermediate)\b/i],['junior',/\b(junior|graduate|entry[- ]level|trainee|apprentice|intern)\b/i]];
export const JOB_LIMITS=Object.freeze({maxChars:60000});
const clean=l=>l.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();
export function parseJobText(raw,{id,role,employer,sourceUrl,idFactory}={}){
 if(typeof raw!=='string'||!raw.trim())throw contractError('INVALID','Job text required');
 const warnings=[];let text=raw;
 if(text.length>JOB_LIMITS.maxChars){text=text.slice(0,JOB_LIMITS.maxChars);warnings.push('Job text was truncated; the remainder was NOT analysed.');}
 const lines=text.split(/\r?\n/).map(clean).filter(Boolean);
 const mk=idFactory||(()=> 'req'+Math.random().toString(36).slice(2,10)+'x');
 let mode='unknown';const requirements=[],duties=[];
 for(const l of lines){
  const head=l.replace(/[:\s]+$/,'');
  if(!BULLET.test(l)&&head.length<60){
   if(PREF_HEAD.test(head)){mode='preferred';continue;}
   if(REQ_HEAD.test(head)){mode='required';continue;}
   if(DUTY_HEAD.test(head)){mode='duty';continue;}
   if(OTHER_HEAD.test(head)){mode='other';continue;}
  }
  if(mode==='other')continue;
  const body=l.replace(BULLET,'').trim();if(body.length<4)continue;
  if(mode==='duty'){duties.push(body);continue;}
  if(!BULLET.test(l)&&mode==='unknown')continue; // prose before any heading is context, not a requirement
  const inlinePref=/\b(preferred|desirable|nice to have|a plus|bonus|advantageous)\b/i.test(body);
  requirements.push({id:mk(),text:body,priority:inlinePref?'preferred':mode==='required'?'required':mode==='preferred'?'preferred':'unknown'});
 }
 if(!requirements.length)warnings.push('No requirement bullets were recognised; paste the requirements section with one requirement per line.');
 const first=lines[0]||'';
 const seniority=(SENIORITY.find(([,rx])=>rx.test(role||first))||[])[0]||null;
 const freq=new Map();for(const t of tokens(text)){if(t.length<3||isStop(t)||/^\d+$/.test(t))continue;freq.set(t,(freq.get(t)||0)+1);}
 const keywords=[...freq].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,25).map(([w])=>w);
 const years=[...text.matchAll(/(\d{1,2})\+?\s*(?:years?|yrs)/gi)].map(m=>+m[1]);
 return {job:{id:id||'job'+Math.random().toString(36).slice(2,10)+'x',role:role||first.slice(0,120),employer,originalText:text,sourceUrl,requirements},
  duties,keywords,seniority,yearsMentioned:years,warnings};
}
