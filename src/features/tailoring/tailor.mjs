/**
 * Group C Stage 11: deterministic, evidence-checked tailoring. Produces SuggestionPatch[] (Group A contract);
 * nothing is applied without per-suggestion approval, and the master CV is never modified.
 */
import {descriptionLines,documentUnits,plainText,stems} from '../intelligence/text.mjs';
import {detectUnsupportedClaims} from '../intelligence/claims.mjs';
import {requirementTerms} from '../job-match/compare.mjs';
import {createCVVariant,updateCVVariant,validateCareerProfile} from '../../domain/profile/career-profile.mjs';
import {contractError} from '../../contracts/platform.mjs';
const s=v=>typeof v==='string'?v.trim():'';
const esc=t=>t.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const jobStems=job=>{const set=new Map();job.requirements.forEach(r=>{const w=r.priority==='required'?3:r.priority==='preferred'?2:1;
 requirementTerms(r.text).forEach(t=>{const st=stems(t)[0];if(st)set.set(st,Math.max(set.get(st)||0,w));});});return set;};
const score=(text,js)=>stems(text).reduce((a,st)=>a+(js.get(st)||0),0);
const sid=(prefix,i)=>prefix+i;
function rebuildDescription(lines,order){
 const ls=order.map(i=>lines[i]);
 const bullets=ls.filter(l=>l.bullet),prose=ls.filter(l=>!l.bullet);
 return (prose.length?prose.map(l=>'<p>'+esc(l.text)+'</p>').join(''):'')+(bullets.length?'<ul>'+bullets.map(l=>'<li>'+esc(l.text)+'</li>').join('')+'</ul>':'');
}
/** @returns {{suggestions:SuggestionPatch[],prompts:object[]}} */
export function buildTailoringSuggestions({document,job,comparison,evidence=[]}){
 if(!document||!job||!Array.isArray(job.requirements))throw contractError('INVALID','document and job required');
 const js=jobStems(job),source=plainText(document),suggestions=[],prompts=[];
 const evFor=paths=>evidence.filter(e=>e.path&&paths.has(e.path)).map(e=>e.id);
 const citedPaths=new Set((comparison?.results||[]).flatMap(r=>r.citations.map(c=>c.path)));
 // 1. skills: matching skills first (reorder only; no skill added or removed)
 const skills=(document.skills||[]).map(x=>s(x.name)).filter(Boolean);
 const ranked=skills.map((n,i)=>({n,i,sc:score(n,js)})).sort((a,b)=>b.sc-a.sc||a.i-b.i).map(x=>x.n);
 if(skills.length>1&&ranked.some((n,i)=>n!==skills[i]))suggestions.push({id:sid('sg-skills-',0),path:'skills',before:skills.join(', '),after:ranked.join(', '),
  explanation:'Moves skills that match the vacancy to the front. No skill is added or removed.',evidenceIds:evFor(new Set(skills.map((_,i)=>`skills[${i}]`))),unsupportedFact:false,status:'proposed',
  operation:{type:'reorder-skills',order:ranked}});
 // 2. bullets: most relevant first inside each role (reorder only)
 (document.experience||[]).forEach((e,ei)=>{
  const lines=descriptionLines(e.description);if(lines.length<2)return;
  const idx=lines.map((l,i)=>({i,sc:score(l.text,js)}));
  const order=idx.slice().sort((a,b)=>b.sc-a.sc||a.i-b.i).map(x=>x.i);
  if(order.some((v,k)=>v!==k)&&idx.some(x=>x.sc>0))suggestions.push({id:sid('sg-bullets-',ei),path:`experience[${e.id??ei}].description`,
   before:lines.map(l=>l.text).join('\n'),after:order.map(i=>lines[i].text).join('\n'),
   explanation:'Puts the lines most relevant to this vacancy first in "'+s(e.title)+'". Wording is unchanged.',
   evidenceIds:evFor(new Set(lines.map((_,j)=>`experience[${e.id??ei}].description[${j}]`))),unsupportedFact:false,status:'proposed',
   operation:{type:'reorder-lines',experienceKey:e.id??ei,order,rebuilt:rebuildDescription(lines,order)}});
 });
 // 3. summary built only from the applicant's own title and matched skills
 const matched=ranked.filter(n=>score(n,js)>0).slice(0,3);
 if(matched.length>=2&&s(document.personalInfo?.title)){
  const list=matched.length===2?matched.join(' and '):matched.slice(0,-1).join(', ')+' and '+matched[matched.length-1];
  const after=s(document.personalInfo.title)+' with skills in '+list+'.';
  const issues=detectUnsupportedClaims(after,source);
  suggestions.push({id:sid('sg-summary-',0),path:'summary',before:s(document.summary),after,
   explanation:'A one-line summary assembled only from your title and the skills in your CV that match this vacancy. Edit freely.',
   evidenceIds:evFor(citedPaths),unsupportedFact:issues.length>0,status:'proposed',operation:{type:'set-summary',text:after},issues});
 }
 // 4. gaps: prompts for the applicant, never patches
 for(const r of comparison?.results||[])if(r.status==='no-evidence'&&r.priority==='required')
  prompts.push({requirementId:r.requirementId,requirement:r.requirement,
   message:'The vacancy asks for "'+r.requirement+'". Nothing in your CV supports this. If it is true, add a specific example yourself; otherwise leave it out.'});
 return {suggestions,prompts};
}
const findExp=(doc,key)=>doc.experience.find((e,i)=>(e.id??i)===key);
/**
 * Apply only approved suggestions to a NEW variant. decisions: {[id]: 'approved'|'rejected'|{status:'approved',after:'user edited text'}}
 * Unsupported suggestions are refused unless the user supplies their own edited text that passes the check.
 */
export function applyApprovedSuggestions(profile,{name='Tailored CV',job,suggestions,decisions,expectedRevision,now,idFactory}={}){
 if(!job||!isSafeJobId(job.id))throw contractError('INVALID','A job with a safe id is required');
 const base={...(name?{name}:{}),targetJobId:job.id,expectedRevision,...(now?{now}:{}),...(idFactory?{idFactory}:{})};
 const withVariant=createCVVariant(profile,base);
 const variant=withVariant.variants[withVariant.variants.length-1];
 const doc=JSON.parse(JSON.stringify(variant.document));
 const applied=[],skipped=[];
 for(const sg of suggestions||[]){
  const d=decisions?.[sg.id],status=typeof d==='string'?d:d?.status;
  if(status!=='approved'){skipped.push({id:sg.id,reason:status==='rejected'?'rejected':'no decision'});continue;}
  const edited=typeof d==='object'&&typeof d.after==='string'?d.after:null;
  const op=sg.operation;
  if(!op||typeof op.type!=='string'){skipped.push({id:sg.id,reason:'unknown operation'});continue;}
  if(op.type==='set-summary'){
   // Even proposals that were originally supported become untrusted after
   // applicant edits. Never rely on a cached unsupportedFact flag.
   const proposed=edited??op.text;
   if(typeof proposed!=='string'||sg.before!==s(doc.summary)){
    skipped.push({id:sg.id,reason:'CV changed since suggestion'});continue;
   }
   if((sg.unsupportedFact&&edited===null)||detectUnsupportedClaims(proposed,plainText(variant.document)).length){
    skipped.push({id:sg.id,reason:'unsupported-fact: verify every new number/name/credential against the CV'});continue;
   }
   doc.summary=proposed;applied.push(sg.id);
  }else if(op.type==='reorder-skills'){
   const current=doc.skills.map(x=>s(x.name));
   const counts=new Map();for(const n of current)counts.set(n,(counts.get(n)||0)+1);
   const valid=Array.isArray(op.order)&&op.order.length===current.length&&
    sg.before===current.join(', ')&&op.order.every(n=>{
     const count=counts.get(n)||0;if(count<=0)return false;counts.set(n,count-1);return true;
    });
   if(valid){
    const available=doc.skills.map(x=>({name:s(x.name),record:x,used:false}));
    doc.skills=op.order.map(n=>{const f=available.find(x=>!x.used&&x.name===n);f.used=true;return f.record;});
    applied.push(sg.id);
   }else skipped.push({id:sg.id,reason:'CV changed since suggestion'});
  }else if(op.type==='reorder-lines'){
   const e=findExp(doc,op.experienceKey),lines=e?descriptionLines(e.description):[];
   const original=lines.map(l=>l.text).join('\n');
   const valid=e&&sg.before===original&&Array.isArray(op.order)&&op.order.length===lines.length&&
    op.order.every(n=>Number.isInteger(n)&&n>=0&&n<lines.length)&&new Set(op.order).size===lines.length;
   if(valid){
    // Rebuild exclusively from the current CV. Never trust a supplied
    // operation.rebuilt HTML string (which may contain invented claims).
    e.description=rebuildDescription(lines,op.order);applied.push(sg.id);
   }else skipped.push({id:sg.id,reason:'CV changed since suggestion'});
  }else skipped.push({id:sg.id,reason:'unknown operation'});
 }
 const saved=updateCVVariant(withVariant,{variantId:variant.id,document:doc,expectedRevision:withVariant.revision,...(now?{now}:{})});
 // Creation plus approved tailoring is ONE atomic profile command, not two
 // separate repository writes. Preserve the edited variant revision but bump
 // the aggregate CAS counter exactly once for LocalRepositoryPort.save().
 saved.revision=withVariant.revision;
 validateCareerProfile(saved);
 return {profile:saved,variantId:variant.id,applied,skipped};
}
const isSafeJobId=v=>typeof v==='string'&&/^[A-Za-z][A-Za-z0-9_-]{5,79}$/.test(v);
