/**
 * Non-destructive LinkedIn-to-CV reconstruction.
 * Accepts ONLY parsed user-pasted text or explicitly supplied official export CSV/ZIP.
 * Produces an ImportReview; caller must make item decisions and separately confirm.
 */
import {blankCareerDocument} from '../../domain/profile/career-profile.mjs';
import {createImportReview} from '../import/text-import.mjs';
import {contractError} from '../../contracts/platform.mjs';
const s=x=>typeof x==='string'?x.trim():'';
const escapeHtml=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const description=x=>s(x)?s(x).split(/\r?\n/).filter(Boolean).map(x=>'<p>'+escapeHtml(x)+'</p>').join(''):'';
/** No profile/storage mutation. Unknown/ambiguous data must be explicitly reviewed. */
export function linkedinToCvReview(linkedin,{sourceName='user-provided LinkedIn data',idFactory,now}={}){
 if(!linkedin||!['official-export','pasted'].includes(linkedin.source))
  throw contractError('INVALID','Only user-provided LinkedIn profile text or an official export can become a CV review.');
 const doc=blankCareerDocument(),items=[],warnings=[];
 const add=(path,value,sourceRef,uncertain=false)=>items.push({path,value,sourceRef,sourceLine:0,uncertain});
 const name=s(linkedin.profileName);
 if(name){
  const parts=name.split(/\s+/);
  doc.personalInfo.firstName=parts[0];
  doc.personalInfo.lastName=parts.slice(1).join(' ');
  add('personalInfo.name',name,'Profile.csv:First Name + Last Name',parts.length>3);
 }
 if(s(linkedin.headline)){
  // A headline is positioning copy, not proof of a formal job title.
  doc.personalInfo.title=s(linkedin.headline);
  add('personalInfo.title',doc.personalInfo.title,'Profile.csv:Headline',true);
  warnings.push('LinkedIn headline is proposed as a CV title only; verify the actual professional title before accepting.');
 }
 if(s(linkedin.about)){
  doc.summary=s(linkedin.about);
  add('summary',doc.summary,'Profile.csv:Summary');
 }
 for(const [i,p] of (linkedin.positions||[]).entries()){
  if(!s(p.title)&&!s(p.company))continue;
  const e={title:s(p.title),employer:s(p.company),start:s(p.start),end:s(p.end),location:s(p.location),
   current:!s(p.end)&&!!s(p.start),description:description(p.description)};
  doc.experience.push(e);
  add('experience['+(doc.experience.length-1)+']',e,
   (linkedin.source==='official-export'?'Positions.csv':'Pasted experience')+':entry '+(i+1),
   !e.title||!e.employer||!e.start);
 }
 for(const [i,p] of (linkedin.education||[]).entries()){
  if(!s(p.school)&&!s(p.degree))continue;
  const e={degree:s(p.degree),school:s(p.school),start:s(p.start),end:s(p.end),
   description:description(p.field)};
  doc.education.push(e);
  add('education['+(doc.education.length-1)+']',e,'Education.csv:entry '+(i+1),!e.school||!e.degree);
 }
 if(Array.isArray(linkedin.skills)&&linkedin.skills.length){
  doc.skills=[...new Set(linkedin.skills.map(s).filter(Boolean))].map(name=>({name}));
  add('skills',doc.skills,'Skills.csv:Name');
  warnings.push('LinkedIn skills do not establish proficiency levels or endorsements.');
 }
 if(Array.isArray(linkedin.certifications)&&linkedin.certifications.length){
  doc.certifications=linkedin.certifications.filter(x=>s(x.name)).map(x=>({name:s(x.name),issuer:s(x.authority),date:s(x.date)}));
  add('certifications',doc.certifications,'Certifications.csv:Name');
 }
 if(Array.isArray(linkedin.projects)&&linkedin.projects.length){
  doc.projects=linkedin.projects.filter(x=>s(x.name)).map(x=>({name:s(x.name),title:s(x.name),description:description(x.description),url:s(x.url)}));
  add('projects',doc.projects,'Projects.csv:Name');
 }
 const coverage=linkedin.coverage||{};
 for(const section of ['positions','skills','education','certifications','projects']){
  if(coverage[section]===false)warnings.push('No '+section+' CSV was provided: absence is unknown, not evidence of no '+section+'.');
 }
 if(linkedin.source==='pasted')warnings.push('Pasted text may omit sections, dates, and skills. Compare the review with your actual LinkedIn profile.');
 const parsed={document:doc,items,warnings,sourceText:'LinkedIn '+
  (linkedin.source==='official-export'?'approved export':'pasted text')+
  '\n'+[name,linkedin.headline,linkedin.about,...(linkedin.positions||[]).map(x=>[x.title,x.company,x.start,x.end,x.description].join(' | '))].filter(Boolean).join('\n'),
  unmappedSourceLines:[]};
 const review=createImportReview(parsed,{idFactory,now,sourceName});
 return {...review,format:'linkedin',source:linkedin.source,coverage,permissions:'local user-selected data only'};
}
