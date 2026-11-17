/**
 * Group B Stage 8: structured, review-first import. Nothing here writes to a profile or storage.
 * Output is an `ImportReview` (Group A contract): the caller must obtain explicit user confirmation.
 */
import {createCareerProfile,blankCareerDocument} from '../../domain/profile/career-profile.mjs';
import {contractError,cloneData} from '../../contracts/platform.mjs';
export const IMPORT_LIMITS=Object.freeze({maxChars:200000,maxLines:5000});
const SECTION_RX=[
 ['summary',/^(professional\s+)?(summary|profile|about( me)?|objective|personal statement)$/i],
 ['experience',/^((work|professional|employment)\s+)?(experience|history)|^employment$/i],
 ['education',/^education( and training)?$|^academic background$/i],
 ['skills',/^((key|core|technical)\s+)?skills$|^competenc(y|ies)$/i],
 ['certifications',/^(certifications?|licen[cs]es?|certificates)$/i],
 ['languages',/^languages$/i],['projects',/^projects$/i],
 ['accomplishments',/^(achievements?|accomplishments?|awards)$/i],
 ['hobbies',/^(interests|hobbies)$/i],['references',/^references$/i]
];
const MONTH='(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+';
const DATE=`(?:(?:${MONTH})?(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])[\\/-](?:19|20)\\d{2}|(?:19|20)\\d{2}[\\/-](?:0?[1-9]|1[0-2]))`;
const RANGE=new RegExp(`(${DATE})\\s*(?:-|–|—|to)\\s*(${DATE}|present|current|now)`,'i');
const EMAIL=/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,PHONE=/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3}[\s.-]?\d{3,4}\b/;
const LINKEDIN=/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s|,]+/i;
const BULLET=/^\s*(?:[•●▪◦*\-–]|\d+[.)])\s+/;
const CTRL=new RegExp('['+[[0,8],[11,12],[14,31],[0x200b,0x200f],[0x2028,0x2029],[0xfeff,0xfeff]].map(([a,b])=>String.fromCharCode(92)+'u'+a.toString(16).padStart(4,'0')+'-'+String.fromCharCode(92)+'u'+b.toString(16).padStart(4,'0')).join('')+']','g');
const cleanLine=l=>l.replace(CTRL,'').replace(/\t+/g,'  ').trimEnd();
export function parseResumeText(raw){
 if(typeof raw!=='string')throw contractError('INVALID','Text required');
 const warnings=[];let text=raw,truncated=false;
 if(text.length>IMPORT_LIMITS.maxChars){truncated=true;text=text.slice(0,IMPORT_LIMITS.maxChars);warnings.push('Input was longer than '+IMPORT_LIMITS.maxChars+' characters; the remainder was NOT imported.');}
 let lines=text.split(/\r?\n/).map(cleanLine);
 if(lines.length>IMPORT_LIMITS.maxLines){truncated=true;lines=lines.slice(0,IMPORT_LIMITS.maxLines);warnings.push('Too many lines; the remainder was NOT imported.');}
 const doc=blankCareerDocument(),items=[],uncertain=[];
 const add=(path,value,line,isUncertain)=>{items.push({path,value,sourceLine:line,uncertain:!!isUncertain});};
 let i=0;while(i<lines.length&&!lines[i].trim())i++;
 const head=[];
 let section=null,sectionLine=0;const buckets={};
 for(let n=i;n<lines.length;n++){
  const l=lines[n].trim();
  if(!l)continue;
  const key=l.length<40?SECTION_RX.find(([,rx])=>rx.test(l.replace(/[:\s]+$/,'')))?.[0]:null;
  if(key){section=key;sectionLine=n+1;buckets[key]??=[];continue;}
  if(!section){head.push([l,n+1]);continue;}
  buckets[section].push([l,n+1]);
 }
 const p=doc.personalInfo,consumedHead=new Set();
 const nameLine=head.find(([l])=>!EMAIL.test(l)&&!LINKEDIN.test(l)&&!/\d{4,}/.test(l)&&l.split(/\s+/).length<=5);
 if(nameLine){const parts=nameLine[0].replace(/[,|]/g,' ').trim().split(/\s+/);
  p.firstName=parts[0];p.lastName=parts.slice(1).join(' ');add('personalInfo.name',nameLine[0],nameLine[1],parts.length<2||parts.length>4);consumedHead.add(nameLine[1]);}
 else warnings.push('No name line found.');
 for(const [l,n] of head){
  const e=l.match(EMAIL);if(e&&!p.email){p.email=e[0];add('personalInfo.email',e[0],n);consumedHead.add(n);}
  const li=l.match(LINKEDIN);if(li&&!p.linkedin){p.linkedin=li[0];add('personalInfo.linkedin',li[0],n);consumedHead.add(n);}
  const ph=l.replace(EMAIL,'').replace(LINKEDIN,'').match(PHONE);if(ph&&!p.phone&&ph[0].replace(/\D/g,'').length>=8){p.phone=ph[0].trim();add('personalInfo.phone',p.phone,n,true);consumedHead.add(n);}
  if(nameLine&&l!==nameLine[0]&&!p.title&&!e&&!li&&!ph&&l.length<80){p.title=l;add('personalInfo.title',l,n,true);consumedHead.add(n);}
 }
 if(!p.email)warnings.push('No email address found.');
 if(buckets.summary?.length){doc.summary=buckets.summary.map(x=>x[0]).join(' ');add('summary',doc.summary,buckets.summary[0][1]);}
 for(const k of ['hobbies','references'])if(buckets[k]?.length){doc[k]=buckets[k].map(x=>x[0]).join('\n');add(k,doc[k],buckets[k][0][1]);}
 // experience / education: a dated line starts an entry; bullets and prose attach to it.
 const unmappedSourceLines=head.filter(([,n])=>!consumedHead.has(n)).map(([text,sourceLine])=>({text,sourceLine,reason:'Header detail was not mapped to a structured CV field'}));
 if(unmappedSourceLines.length)warnings.push(unmappedSourceLines.length+' header line(s) require manual reconstruction; the original source remains available.');
 const entries=(rows,kind)=>{
  const out=[];let cur=null;
  for(let k=0;k<rows.length;k++){
   const [l,n]=rows[k],m=l.match(RANGE),isBullet=BULLET.test(l);
   if(m&&!isBullet){
    const rest=l.replace(RANGE,'').replace(/[|,\u2013\u2014-]\s*$/,'').replace(/^[|,\u2013\u2014-]\s*/,'').trim();
    const dates={start:m[1],end:/present|current|now/i.test(m[2])?'':m[2],current:/present|current|now/i.test(m[2])};
    if(cur&&!cur.start&&!cur.desc.length){Object.assign(cur,dates);if(rest&&!cur.second)cur.second=rest;continue;} // title line, then its dates
    cur={...dates,headline:rest,desc:[],line:n};out.push(cur);continue;
   }
   const nextIsDate=k+1<rows.length&&RANGE.test(rows[k+1][0])&&!BULLET.test(rows[k+1][0]);
   if(!isBullet&&cur&&!cur.headline&&cur.desc.length)cur=null; // preserve orphan bullets separately; do not attach a subsequent role heading to them
   if(!isBullet&&nextIsDate&&cur&&!cur.start&&!cur.second&&!cur.desc.length){cur.second=l;continue;}
   if(!isBullet&&(!cur||nextIsDate&&l.length<100)){cur={start:'',end:'',current:false,headline:l,desc:[],line:n};out.push(cur);continue;}
   if(isBullet){if(!cur){cur={start:'',end:'',current:false,headline:'',desc:[],line:n};out.push(cur);}cur.desc.push({b:true,t:l.replace(BULLET,'')});}
   else if(!cur.headline)cur.headline=l;
   else if(kind==='experience'&&!cur.second&&!cur.desc.length&&l.length<80)cur.second=l;
   else cur.desc.push({b:false,t:l});
  }
  return out;
 };
 const html=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const descHtml=d=>{const bl=d.filter(x=>x.b),pr=d.filter(x=>!x.b);
  return (pr.length?'<p>'+html(pr.map(x=>x.t).join(' '))+'</p>':'')+(bl.length?'<ul>'+bl.map(x=>'<li>'+html(x.t)+'</li>').join('')+'</ul>':'');};
 const splitHead=h=>{const m=h.split(/\s+(?:at|@)\s+|\s+[\u2013\u2014|-]\s+|,\s+/);return [m[0].trim(),m.slice(1).join(', ').trim()];};
 for(const e of entries(buckets.experience||[],'experience')){
  let [title,employer]=splitHead(e.headline||'');
  if(!employer&&e.second)employer=e.second;
  const entry={title,employer,location:'',start:e.start,end:e.end,current:e.current,description:descHtml(e.desc)};
  const unsure=!title||!employer||!e.start;
  doc.experience.push(entry);add('experience['+(doc.experience.length-1)+']',entry,e.line,unsure);
  if(unsure)uncertain.push('Experience at line '+e.line+' is missing a title, employer or start date.');
 }
 for(const e of entries(buckets.education||[],'education')){
  const [degree,school]=splitHead(e.headline||'');
  const entry={degree,school:school||e.second||'',start:e.start,end:e.end,description:descHtml(e.desc)};
  doc.education.push(entry);add('education['+(doc.education.length-1)+']',entry,e.line,!degree||!entry.school);
 }
 if(buckets.skills?.length){
  const names=buckets.skills.flatMap(([l])=>l.replace(BULLET,'').split(/[,;|•]/)).map(s=>s.trim()).filter(s=>s&&s.length<60);
  doc.skills=[...new Set(names)].map(name=>({name,level:3}));add('skills',doc.skills,buckets.skills[0][1]);
 }
 for(const k of ['certifications','languages','projects','accomplishments']){
  if(buckets[k]?.length){doc[k]=buckets[k].map(([l])=>({name:l.replace(BULLET,''),title:l.replace(BULLET,''),description:''}));add(k,doc[k],buckets[k][0][1]);}
 }
 if(!doc.experience.length&&!doc.education.length&&!doc.skills.length)warnings.push('No experience, education or skills sections were recognised; review the source text manually.');
 for(const u of uncertain)warnings.push(u);
 return {document:doc,items,warnings,sourceText:text,unmappedSourceLines,truncated};
}
/** Build the contract-level ImportReview. proposed is NOT saved and carries no verified claims. */
export function createImportReview(parsed,{idFactory,now=new Date().toISOString(),sourceName}={}){
 if(!parsed||!parsed.document)throw contractError('INVALID','Parsed content required');
 const hasContent=parsed.items.length>0&&!parsed.truncated;
 const mk=idFactory?{idFactory}:{};
 const proposed=hasContent?createCareerProfile({displayName:'Imported CV',document:parsed.document,now,...mk}):null;
 return {status:hasContent?'review-required':'blocked',warnings:[...parsed.warnings,...(parsed.truncated?['Import blocked: source text was truncated. Use a smaller complete document; partial CV facts were NOT approved.']:[])],proposed,requiresUserConfirmation:true,
  items:parsed.items.map(x=>({...x,decision:'pending'})),sourceName,sourceText:parsed.sourceText,
  unmappedSourceLines:parsed.unmappedSourceLines||[]};
}
/**
 * Apply per-item decisions and an explicit confirmation. Rejected/pending items are omitted;
 * accepted claims are recorded as document-sourced evidence with verifiedByUser=false.
 */
export function approveImportReview(review,{accepted,confirmed=false,idFactory,now=new Date().toISOString()}={}){
 if(confirmed!==true)throw contractError('UNCONFIRMED','Explicit user confirmation required');
 if(!review||review.status!=='review-required'||!review.proposed)throw contractError('INVALID','Nothing to import');
 const set=new Set(accepted||review.items.filter(i=>i.decision==='accept').map(i=>i.path));
 if(!set.size)throw contractError('INVALID','No items accepted');
 const doc=blankCareerDocument(),src=review.proposed.master.document;
 const personal={...doc.personalInfo};
 const keep=[];
 for(const it of review.items){
  if(!set.has(it.path))continue;keep.push(it);
  if(it.path==='personalInfo.name'){personal.firstName=src.personalInfo.firstName;personal.lastName=src.personalInfo.lastName;}
  else if(it.path.startsWith('personalInfo.'))personal[it.path.split('.')[1]]=src.personalInfo[it.path.split('.')[1]];
  else if(['summary','hobbies','references'].includes(it.path))doc[it.path]=src[it.path];
  else if(['skills','certifications','languages','projects','accomplishments'].includes(it.path))doc[it.path]=cloneData(src[it.path]);
  else{const m=it.path.match(/^(experience|education)\[(\d+)\]$/);if(m)doc[m[1]].push(cloneData(src[m[1]][+m[2]]));}
 }
 doc.personalInfo=personal;
 const profile=createCareerProfile({displayName:review.proposed.name,document:doc,now,...(idFactory?{idFactory}:{})});
 const mkId=idFactory||(()=> 'ledger_'+globalThis.crypto.randomUUID().replace(/-/g,''));
 profile.evidence=keep.filter(i=>i.path.startsWith('experience')||i.path.startsWith('education')).map(i=>({
  id:mkId(),source:'document',claim:(i.value.title||i.value.degree||'Entry')+' '+(i.value.employer||i.value.school||'')+' ('+(i.value.start||'?')+')',
  sourceRef:i.sourceRef||(review.sourceName||'import')+':line '+i.sourceLine,path:i.path,capturedAt:now,verifiedByUser:false}));
 return profile;
}
