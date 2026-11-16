/**
 * Group D Stage 16: LinkedIn coach. Works ONLY on text the user pastes or on their official LinkedIn data export (CSV).
 * No scraping, no URL fetching, no network. Suggestions are built from the verified CV (cited) and are never applied automatically.
 */
import {contractError} from '../../contracts/platform.mjs';
import {plainText} from '../intelligence/text.mjs';
import {detectUnsupportedClaims} from '../intelligence/claims.mjs';
export const LINKEDIN_LIMITS=Object.freeze({headline:220,about:2600,note:'Limits are as last known; verify against LinkedIn before relying on them.'});
const s=v=>typeof v==='string'?v.trim():'';
/** Minimal RFC 4180 parser (quotes, escaped quotes, CRLF, embedded newlines). */
export function parseCsv(text){
 const rows=[];let row=[],cell='',q=false;
 const t=String(text).replace(/^﻿/,'');
 for(let i=0;i<t.length;i++){
  const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=c;}
  else if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(x=>x!==''))rows.push(row);row=[];}
  else cell+=c;
 }
 row.push(cell);if(row.some(x=>x!==''))rows.push(row);
 if(q)throw contractError('INVALID','CSV has an unterminated quote');
 return rows;
}
function table(text){const r=parseCsv(text);if(r.length<1)return [];const h=r[0].map(x=>x.trim().toLowerCase());return r.slice(1).map(c=>Object.fromEntries(h.map((k,i)=>[k,(c[i]||'').trim()])));}
/** Official export: Profile.csv and Positions.csv (matched by header name; unknown columns ignored). */
export function fromOfficialExport({profileCsv='',positionsCsv=''}={}){
 const p=table(profileCsv)[0]||{};
 const positions=table(positionsCsv).map(r=>({title:r['title']||'',company:r['company name']||'',description:r['description']||'',location:r['location']||'',start:r['started on']||'',end:r['finished on']||''}));
 if(!p.headline&&!p.summary&&!positions.length)throw contractError('INVALID','No recognisable LinkedIn export data (expected Profile.csv / Positions.csv columns).');
 return {source:'official-export',headline:p['headline']||'',about:p['summary']||'',positions};
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
const year=v=>{const m=String(v||'').match(/(19|20)\d{2}/);return m?+m[0]:null;};
/** Consistency between LinkedIn and the CV (read-only). */
export function compareWithCv(linkedin,document){
 const out=[],cv=document.experience||[],used=new Set();
 for(const p of linkedin.positions){
  const i=cv.findIndex((e,k)=>!used.has(k)&&norm(e.employer)&&norm(e.employer)===norm(p.company));
  if(i<0){out.push({kind:'linkedin-only',severity:'info',message:'"'+p.title+'" at '+p.company+' is on LinkedIn but not on your CV.',citations:[]});continue;}
  used.add(i);const e=cv[i],path='experience['+(e.id??i)+']';
  if(norm(e.title)!==norm(p.title))out.push({kind:'title-differs',severity:'warning',message:'Title differs for '+p.company+': LinkedIn "'+p.title+'" vs CV "'+e.title+'". Decide which is accurate.',citations:[path+'.title']});
  const a=year(e.start),b=year(p.start);if(a&&b&&a!==b)out.push({kind:'start-differs',severity:'warning',message:'Start year differs for '+p.company+': LinkedIn '+b+' vs CV '+a+'.',citations:[path+'.start']});
 }
 cv.forEach((e,k)=>{if(!used.has(k)&&s(e.employer))out.push({kind:'cv-only',severity:'info',message:'"'+e.title+'" at '+e.employer+' is on your CV but not on LinkedIn.',citations:['experience['+(e.id??k)+']']});});
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
 for(const p of linkedin.positions){
  if(s(p.description))continue;
  const e=(document.experience||[]).find(x=>norm(x.employer)&&norm(x.employer)===norm(p.company));
  if(!e)continue;
  const bullets=[...String(e.description||'').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>m[1].replace(/<[^>]*>/g,'').trim()).filter(Boolean);
  if(bullets.length)sugg.push(mk('position:'+p.company,'',bullets.map(b=>'• '+b).join('\n'),'Your CV bullets for this role; LinkedIn has no description for it.',['experience['+(e.id??'')+'].description']));
 }
 return sugg;
}
export function lengthChecks(linkedin){
 const out=[];
 if(linkedin.headline.length>LINKEDIN_LIMITS.headline)out.push({kind:'headline-length',severity:'warning',message:'Headline is '+linkedin.headline.length+' characters (limit '+LINKEDIN_LIMITS.headline+').'});
 if(linkedin.about.length>LINKEDIN_LIMITS.about)out.push({kind:'about-length',severity:'warning',message:'About is '+linkedin.about.length+' characters (limit '+LINKEDIN_LIMITS.about+').'});
 if(!s(linkedin.headline))out.push({kind:'no-headline',severity:'info',message:'No headline found.'});
 return out;
}
export function coachLinkedIn(linkedin,document){
 return {source:linkedin.source,findings:[...lengthChecks(linkedin),...compareWithCv(linkedin,document)],suggestions:suggestProfileText(linkedin,document),
  notice:'Built only from what you pasted or exported and from your CV. Nothing was fetched from LinkedIn and nothing is changed until you copy it yourself.'};
}
