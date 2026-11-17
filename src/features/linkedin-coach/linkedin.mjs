/**
 * Group D Stage 16: LinkedIn coach. Works ONLY on text the user pastes or on their official LinkedIn data export (CSV).
 * No scraping, no URL fetching, no network. Suggestions are built from the verified CV (cited) and are never applied automatically.
 */
import {contractError} from '../../contracts/platform.mjs';
import {unzipEntries,bytesToText} from '../documents/zip.mjs';
import {plainText} from '../intelligence/text.mjs';
import {detectUnsupportedClaims} from '../intelligence/claims.mjs';
export const LINKEDIN_LIMITS=Object.freeze({headline:220,about:2600,note:'Limits are as last known; verify against LinkedIn before relying on them.'});
const s=v=>typeof v==='string'?v.trim():'';
/** Minimal RFC 4180 parser (quotes, escaped quotes, CRLF, embedded newlines). */
export function parseCsv(text){
 const rows=[];let row=[],cell='',q=false;
 const t=String(text).replace(/^﻿/,'');
 if(t.length>4*1024*1024)throw contractError('INVALID','CSV exceeds the local import limit');
 for(let i=0;i<t.length;i++){
  const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=c;}
  else if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(x=>x!==''))rows.push(row);if(rows.length>30000)throw contractError('INVALID','Too many CSV rows');row=[];}
  else cell+=c;
 }
 row.push(cell);if(row.some(x=>x!==''))rows.push(row);
 if(q)throw contractError('INVALID','CSV has an unterminated quote');
 return rows;
}
function table(text){const r=parseCsv(text);if(r.length<1)return [];const h=r[0].map(x=>x.trim().toLowerCase());return r.slice(1).map(c=>Object.fromEntries(h.map((k,i)=>[k,(c[i]||'').trim()])));}
/** Official export: Profile.csv and Positions.csv (matched by header name; unknown columns ignored). */
/** Only user-selected LinkedIn export data is processed; messages/connections are ignored. */
export function fromOfficialExport({profileCsv='',positionsCsv='',skillsCsv='',educationCsv='',certificationsCsv='',projectsCsv=''}={}){
 const p=table(profileCsv)[0]||{};
 const rows=(text)=>text?table(text):[];
 const val=(r,...keys)=>keys.map(k=>r[k]||'').find(Boolean)||'';
 const positions=rows(positionsCsv).map(r=>({
  title:val(r,'title','position'),company:val(r,'company name','company'),
  description:val(r,'description'),location:val(r,'location'),
  start:val(r,'started on','start date'),end:val(r,'finished on','end date')
 })).filter(p=>p.title||p.company);
 const skills=rows(skillsCsv).map(r=>val(r,'name','skill name','skill')).filter(Boolean);
 const education=rows(educationCsv).map(r=>({
  school:val(r,'school name','school'),degree:val(r,'degree name','degree'),
  field:val(r,'notes','field of study','field'),start:val(r,'start date','started on'),
  end:val(r,'end date','finished on')
 })).filter(x=>x.school||x.degree);
 const certifications=rows(certificationsCsv).map(r=>({
  name:val(r,'name','certification name','title'),authority:val(r,'authority','issuing organization','organization'),
  date:val(r,'started on','issue date','date')
 })).filter(x=>x.name);
 const projects=rows(projectsCsv).map(r=>({
  name:val(r,'name','title'),description:val(r,'description'),url:val(r,'url','project url')
 })).filter(x=>x.name);
 if(!p.headline&&!p.summary&&!positions.length&&!skills.length&&!education.length&&!certifications.length&&!projects.length)
  throw contractError('INVALID','No recognisable LinkedIn profile data in the selected export files.');
 return {source:'official-export',headline:p.headline||'',about:p.summary||'',positions,skills:[...new Set(skills)],
  education,certifications,projects,profileName:[p['first name'],p['last name']].filter(Boolean).join(' ').trim(),
  coverage:{headline:!!p.headline,about:!!p.summary,positions:!!positionsCsv,skills:!!skillsCsv,
   education:!!educationCsv,certifications:!!certificationsCsv,projects:!!projectsCsv}};
}
/** Import selected official archive locally. Never opens a URL, reads connections/messages, or uploads data. */
export async function fromOfficialZip(bytes,{inflate}={}){
 if(!(bytes instanceof Uint8Array)||bytes.length>24*1024*1024)throw contractError('INVALID','Select a LinkedIn ZIP under 24 MB');
 const allowed=new Map([['profile.csv','profileCsv'],['positions.csv','positionsCsv'],['skills.csv','skillsCsv'],
  ['education.csv','educationCsv'],['certifications.csv','certificationsCsv'],['projects.csv','projectsCsv']]);
 const files=await unzipEntries(bytes,{inflate,want:name=>{
  const base=name.split('/').pop().toLowerCase();
  return allowed.has(base)&&!name.split('/').includes('..');
 },limits:{maxEntries:1000,maxEntryBytes:4*1024*1024,maxTotalBytes:12*1024*1024}});
 const input={};for(const [name,data] of files){
  const field=allowed.get(name.split('/').pop().toLowerCase());
  if(input[field]!==undefined)throw contractError('INVALID','Duplicate LinkedIn '+field+' files; select unambiguous source data');
  input[field]=bytesToText(data);
 }
 return fromOfficialExport(input);
}
const RANGE=/((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(present|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2})/i;
/** Pasted profile text: sections headed Headline/About/Experience. */
export function fromPastedText(text){
 const t=String(text||'');
 if(!t.trim())throw contractError('INVALID','Paste your profile text');
 if(/^\s*https?:\/\/\S+\s*$/i.test(t))throw contractError('INVALID','Paste the profile text itself. This tool never fetches web pages.');
 if(t.length>60000)throw contractError('INVALID','Text is too long');
 const lines=t.split(/\r?\n/).map(l=>l.trim());
 let mode='headline',headline='',about=[];const exp=[];
 for(const l of lines){
  if(/^(about|summary)$/i.test(l)){mode='about';continue;}
  if(/^experience$/i.test(l)){mode='exp';continue;}
  if(/^(education|skills|licenses.*|certifications|projects|languages|recommendations)$/i.test(l)){mode='other';continue;}
  if(!l)continue;
  if(mode==='headline'&&!headline)headline=l;
  else if(mode==='about')about.push(l);
  else if(mode==='exp')exp.push(l);
 }
 const positions=[];
 for(let i=0;i<exp.length;i++){
  const m=exp[i].match(RANGE);
  if(m&&i>=1){
   const company=(exp[i-1]||'').split('·')[0].trim(),title=i>=2?exp[i-2]:'';
   const sw=(m[1]||'')+m[2],en=m[3];
   const desc=[];while(i+1<exp.length&&!RANGE.test(exp[i+1])&&!(exp[i+3]&&RANGE.test(exp[i+3]))){desc.push(exp[++i]);} // next role = title, company, dates
   positions.push({title:title||exp[i-1],company,start:sw.trim(),end:/present/i.test(en)?'':en.trim(),description:desc.join('\n')});
  }
 }
 return {source:'pasted',headline,about:about.join('\n'),positions};
}
const norm=x=>s(x).toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\b(ltd|limited|inc|llc|plc|co|corp|corporation)\b/g,'').replace(/\s+/g,' ').trim();
const year=v=>{const m=String(v||'').match(/(?:19|20)\d{2}/);return m?+m[0]:null;};
/** Month precision is compared only when both sources actually specify a month. */
function partialDate(value){
 const raw=s(value).toLowerCase();if(!raw)return null;
 const y=year(raw);if(!y)return null;
 const names=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const word=raw.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i);
 if(word)return {year:y,month:names.indexOf(word[1].toLowerCase())+1};
 const first=raw.match(/^(0?[1-9]|1[0-2])[/.-](?:19|20)\d{2}$/);
 if(first)return {year:y,month:+first[1]};
 const second=raw.match(/^(?:19|20)\d{2}[/.-](0?[1-9]|1[0-2])(?:[/.-]\d{1,2})?$/);
 return {year:y,month:second?+second[1]:null};
}
/** Consistency between LinkedIn and the CV (read-only). */
export function compareWithCv(linkedin,document){
 const out=[],cv=document.experience||[];
 if(linkedin.coverage?.positions===false)return out;
 const {roles,used,reserved}=matchedRoles(linkedin,document);
 for(const {linkedin:p,cv:e,index:i,ambiguous,possibleCvPaths} of roles){
  if(ambiguous){
   out.push({kind:'role-ambiguous',severity:'warning',message:'Multiple CV roles at '+p.company+' could correspond to LinkedIn "'+p.title+'". Verify the specific employer, role and dates before matching.',citations:possibleCvPaths});
   continue;
  }
  if(i<0){out.push({kind:'linkedin-only',severity:'info',message:'"'+p.title+'" at '+p.company+' is on LinkedIn but not on your CV.',citations:[]});continue;}
  const path='experience['+(e.id??i)+']';
  if(norm(e.title)!==norm(p.title))out.push({kind:'title-differs',severity:'warning',message:'Title differs for '+p.company+': LinkedIn "'+p.title+'" vs CV "'+e.title+'". Decide which is accurate.',citations:[path+'.title']});
  const a=year(e.start),b=year(p.start);
  if(a&&b&&a!==b)out.push({kind:'start-differs',severity:'warning',message:'Start year differs for '+p.company+': LinkedIn '+b+' vs CV '+a+'.',citations:[path+'.start']});
  else if(a&&b&&a===b){
   const cvDate=partialDate(e.start),liDate=partialDate(p.start);
   if(cvDate?.month&&liDate?.month&&cvDate.month!==liDate.month)
    out.push({kind:'start-month-differs',severity:'warning',message:'Start month differs for '+p.title+' at '+p.company+'.',citations:[path+'.start']});
  }
 }
 cv.forEach((e,k)=>{if(!used.has(k)&&!reserved.has(k)&&s(e.employer))out.push({kind:'cv-only',severity:'info',message:'"'+e.title+'" at '+e.employer+' is on your CV but not in the supplied LinkedIn positions.',citations:['experience['+(e.id??k)+']']});});
 return out;
}
/** Editable suggestions, built only from the CV. Each cites its sources and passes the unsupported-claim guard. */
export function suggestProfileText(linkedin,document){
 const src=plainText(document),sugg=[],skills=(document.skills||[]).map(x=>s(x.name)).filter(Boolean);
 const title=s(document.personalInfo?.title);
 const mk=(path,before,after,explanation,citations)=>{
  const issues=detectUnsupportedClaims(after,src);
  return {id:'li-'+path.replace(/\W+/g,'-'),path,before,after,explanation,citations,evidenceIds:[],unsupportedFact:issues.length>0,issues,status:'proposed'};
 };
 if(title){
  const after=[title,...skills.slice(0,3)].join(' | ');
  if(after!==linkedin.headline)sugg.push(mk('headline',linkedin.headline,after.slice(0,LINKEDIN_LIMITS.headline),'Your CV title plus your first listed skills. Edit freely.',['personalInfo.title',...skills.slice(0,3).map((_,i)=>'skills['+i+']')]));
 }
 if(s(document.summary)&&!s(linkedin.about))sugg.push(mk('about','',document.summary.slice(0,LINKEDIN_LIMITS.about),'Starts from your CV summary. LinkedIn "About" often reads better in the first person; adapt it yourself.',['summary']));
 for(const {linkedin:p,cv:e,index} of matchedRoles(linkedin,document).roles){
  if(s(p.description)||!e)continue;
  const bullets=[...String(e.description||'').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>m[1].replace(/<[^>]*>/g,'').trim()).filter(Boolean);
  if(bullets.length){
   const after=bullets.map(b=>'• '+b).join('\n');
   sugg.push(mk('position:'+p.company+':'+p.title,'',after,
    'Only existing CV bullets for this matched role; verify wording before copying.',['experience['+(e.id??index)+'].description']));
  }
 }
 return sugg;
}

/** Matched by employer+role first, then employer; one CV role is never matched twice. */
/**
 * Conservative one-to-one role matching.
 * A shared employer is NOT sufficient to join two different jobs where multiple
 * roles exist. Ambiguous records are reported for review rather than assigned.
 */
function matchedRoles(linkedin,document){
 const cv=document.experience||[],used=new Set(),reserved=new Set(),result=[];
 for(const p of linkedin.positions||[]){
  const company=norm(p.company),title=norm(p.title);
  if(!company){result.push({linkedin:p,cv:null,index:-1,ambiguous:false});continue;}
  const candidates=cv.map((e,i)=>({e,i})).filter(({e,i})=>!used.has(i)&&norm(e.employer)===company);
  const exact=title?candidates.filter(({e})=>norm(e.title)===title):[];
  let choice=null;
  if(exact.length===1)choice=exact[0];
  else if(exact.length>1){
   const start=year(p.start);
   const dated=exact.filter(({e})=>start&&year(e.start)===start);
   if(dated.length===1)choice=dated[0];
  }else if(candidates.length===1){
   choice=candidates[0]; // a single employer match is reviewable, including title variations
  }else if(candidates.length>1){
   const start=year(p.start);
   const dated=candidates.filter(({e})=>start&&year(e.start)===start);
   if(dated.length===1)choice=dated[0];
  }
  if(choice){used.add(choice.i);result.push({linkedin:p,cv:choice.e,index:choice.i,ambiguous:false});}
  else{
   if(candidates.length>1)candidates.forEach(x=>reserved.add(x.i));
   result.push({linkedin:p,cv:null,index:-1,ambiguous:candidates.length>1,possibleCvPaths:candidates.map(x=>'experience['+(x.e.id??x.i)+']')});
  }
 }
 return {roles:result,used,reserved};
}
const stripped=x=>plainText({summary:String(x||'')}).trim();
const words=x=>new Set(norm(x).split(' ').filter(w=>w.length>=4));
function textDifference(a,b){
 const aa=words(stripped(a)),bb=words(stripped(b));
 return aa.size>0&&bb.size>0&&[...aa].filter(x=>bb.has(x)).length/Math.max(aa.size,bb.size)<0.32;
}
/** Extra comparison layers do not infer that absent export sections are empty on LinkedIn. */
export function compareLinkedInDetails(linkedin,document){
 const out=[], cvSkills=(document.skills||[]).map(x=>s(x.name)).filter(Boolean);
 const linkedSkills=Array.isArray(linkedin.skills)&&linkedin.coverage?.skills!==false?linkedin.skills.map(s).filter(Boolean):null;
 const issue=(kind,severity,message,citations=[],source='comparison')=>out.push({kind,severity,message,citations,source});
 if(linkedSkills){
  const have=new Set(linkedSkills.map(norm)),wanted=new Set(cvSkills.map(norm));
  for(let i=0;i<cvSkills.length;i++)if(!have.has(norm(cvSkills[i])))issue('skill-cv-only','info','Skill recorded on CV but not in the provided LinkedIn skills: '+cvSkills[i],['skills['+i+']']);
  for(const skill of linkedSkills)if(!wanted.has(norm(skill)))issue('skill-linkedin-only','info','LinkedIn skill is not explicitly listed on the CV: '+skill);
 }
 if(Array.isArray(linkedin.education)&&linkedin.coverage?.education!==false){
  const cv=document.education||[],seen=new Set();
  for(const ed of linkedin.education){
   const ix=cv.findIndex((x,i)=>!seen.has(i)&&norm(x.school)===norm(ed.school)&&!!norm(x.school));
   if(ix<0){issue('education-linkedin-only','info','Education on LinkedIn is absent from the CV: '+ed.school);continue;}
   seen.add(ix);
   if(ed.degree&&cv[ix].degree&&norm(ed.degree)!==norm(cv[ix].degree))
    issue('education-degree-differs','warning','Degree differs at '+ed.school+'. Check the source records.',['education['+(cv[ix].id??ix)+'].degree']);
  }
  cv.forEach((ed,i)=>{if(!seen.has(i)&&s(ed.school))issue('education-cv-only','info','Education on the CV is absent from the provided LinkedIn data: '+ed.school,['education['+(ed.id??i)+']']);});
 }
 if(Array.isArray(linkedin.certifications)&&linkedin.coverage?.certifications!==false){
  const cv=document.certifications||[],have=new Set(linkedin.certifications.map(x=>norm(x.name)));
  cv.forEach((x,i)=>{if(x.name&&!have.has(norm(x.name)))issue('certification-cv-only','info','CV certification missing from the provided LinkedIn certifications: '+x.name,['certifications['+(x.id??i)+']']);});
 }
 if(s(document.summary)&&!s(linkedin.about))issue('about-missing','info','LinkedIn About text is missing from the supplied profile.',['summary']);
 else if(s(document.summary)&&s(linkedin.about)&&textDifference(document.summary,linkedin.about))
  issue('about-differs','info','LinkedIn About and the CV summary emphasize different content; review their accuracy.',['summary']);
 for(const {linkedin:p,cv:e,index} of matchedRoles(linkedin,document).roles){
  if(!e)continue;
  const path='experience['+(e.id??index)+']';
  if(year(p.end)!==year(e.end)&&(year(p.end)||year(e.end)))
   issue('end-differs','warning','End date differs for '+p.company+' / '+p.title+'.',[''+path+'.end']);
  else if(year(p.end)&&year(e.end)){
   const cvEnd=partialDate(e.end),liEnd=partialDate(p.end);
   if(cvEnd?.month&&liEnd?.month&&cvEnd.month!==liEnd.month)
    issue('end-month-differs','warning','End month differs for '+p.title+' at '+p.company+'.',[path+'.end']);
  }
  if(p.location&&e.location&&norm(p.location)!==norm(e.location))
   issue('location-differs','info','Location differs for '+p.company+' / '+p.title+'.',[path+'.location']);
  if(!s(p.description)&&stripped(e.description))
   issue('description-missing','info','LinkedIn description is empty for '+p.title+' at '+p.company+'.',[path+'.description']);
  else if(p.description&&e.description&&textDifference(p.description,e.description))
   issue('description-differs','info','Experience descriptions emphasize different details for '+p.title+' at '+p.company+'.',[path+'.description']);
 }
 return out;
}
function moreSuggestions(linkedin,document){
 const source=plainText(document),out=[],cv=(document.skills||[]).map(x=>s(x.name)).filter(Boolean);
 const linked=new Set((linkedin.skills||[]).map(norm));
 if(Array.isArray(linkedin.skills)&&linkedin.coverage?.skills!==false){
  const add=cv.map((v,i)=>({value:v,i})).filter(x=>!linked.has(norm(x.value)));
  if(add.length){
   const after=add.map(x=>x.value).join(', ');
   const issues=detectUnsupportedClaims(after,source);
   if(!issues.length)out.push({id:'li-skills-review',path:'skills',before:(linkedin.skills||[]).join(', '),after,
    explanation:'These skills already appear on your CV; confirm each before adding to LinkedIn.',
    citations:add.map(x=>'skills['+x.i+']'),evidenceIds:[],unsupportedFact:false,issues:[],status:'proposed'});
  }
 }
 if(s(linkedin.about)&&s(linkedin.about).length<90&&s(document.summary)){
  const after=s(document.summary).slice(0,LINKEDIN_LIMITS.about),issues=detectUnsupportedClaims(after,source);
  if(!issues.length)out.push({id:'li-about-expanded',path:'about-expanded',before:linkedin.about,after,
   explanation:'Your current About is brief; this is an alternate source-grounded CV summary, not an automatic replacement.',
   citations:['summary'],evidenceIds:[],unsupportedFact:false,issues:[],status:'proposed'});
 }
 return out;
}
export function linkedinActionPlan(linkedin,document){
 const findings=[...lengthChecks(linkedin),...compareWithCv(linkedin,document),...compareLinkedInDetails(linkedin,document)];
 const priority=f=>f.severity==='warning'?1:f.kind.includes('missing')?2:3;
 return findings.map((f,i)=>({...f,id:'li-action-'+i,priority:priority(f),
  requiresReview:true,action:f.kind.includes('differs')?'Verify both sources and correct the inaccurate entry.':
   'Review the source material before deciding whether to add or change anything.'}))
  .sort((a,b)=>a.priority-b.priority);
}

export function lengthChecks(linkedin){
 const out=[];
 if(linkedin.headline.length>LINKEDIN_LIMITS.headline)out.push({kind:'headline-length',severity:'warning',message:'Headline is '+linkedin.headline.length+' characters (limit '+LINKEDIN_LIMITS.headline+').'});
 if(linkedin.about.length>LINKEDIN_LIMITS.about)out.push({kind:'about-length',severity:'warning',message:'About is '+linkedin.about.length+' characters (limit '+LINKEDIN_LIMITS.about+').'});
 if(!s(linkedin.headline))out.push({kind:'no-headline',severity:'info',message:'No headline found.'});
 return out;
}
export function coachLinkedIn(linkedin,document){
 return {source:linkedin.source,findings:[...lengthChecks(linkedin),...compareWithCv(linkedin,document),...compareLinkedInDetails(linkedin,document)],suggestions:[...suggestProfileText(linkedin,document),...moreSuggestions(linkedin,document)],actionPlan:linkedinActionPlan(linkedin,document),
  notice:'Built only from what you pasted or exported and from your CV. Nothing was fetched from LinkedIn and nothing is changed until you copy it yourself.'};
}
